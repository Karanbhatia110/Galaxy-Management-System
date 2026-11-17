"""
Galaxy Construction Management System - Equipment Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid
from app.utils.decorators import role_required
from app.utils.audit import log_action, create_notification
from app.utils.validators import validate_equipment_data

equipment_bp = Blueprint("equipment", __name__)


# ---------------------------------------------------------------------------
# GET / — List all equipment (paginated, filterable)
# ---------------------------------------------------------------------------
@equipment_bp.route("/", methods=["GET"])
@jwt_required()
def list_equipment():
    """List all equipment with optional filters for status and assigned_site."""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = min(max(1, per_page), 100)
        skip = (max(1, page) - 1) * per_page

        query = {}

        status = request.args.get("status")
        if status:
            query["status"] = status

        assigned_site = request.args.get("assigned_site")
        if assigned_site:
            query["assigned_site"] = assigned_site

        total = db.equipment.count_documents(query)
        items = list(
            db.equipment.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(per_page)
        )

        return jsonify({
            "equipment": parse_doc(items),
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "has_next": skip + per_page < total,
                "has_prev": page > 1,
            },
        }), 200

    except Exception as e:
        return jsonify({"message": "Error fetching equipment", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST / — Add new equipment (admin only)
# ---------------------------------------------------------------------------
@equipment_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("admin")
def add_equipment():
    """Add new equipment to the system (admin only)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        is_valid, errors = validate_equipment_data(data)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        user_id = get_jwt_identity()
        claims = get_jwt()

        equipment = {
            "equipment_name": data["equipment_name"],
            "equipment_type": data["equipment_type"],
            "status": data.get("status", "available"),
            "assigned_site": data.get("assigned_site", ""),
            "rental_cost": float(data.get("rental_cost", 0)),
            "owner": data.get("owner", ""),
            "purchase_date": data.get("purchase_date", ""),
            "condition": data.get("condition", ""),
            "notes": data.get("notes", ""),
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = db.equipment.insert_one(equipment)
        equipment["_id"] = result.inserted_id

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Added Equipment",
            ip_address=request.remote_addr or "unknown",
            details=f"Equipment: {data['equipment_name']} ({data['equipment_type']})",
        )

        return jsonify({
            "message": "Equipment added successfully",
            "equipment": parse_doc(equipment),
        }), 201

    except Exception as e:
        return jsonify({"message": "Error adding equipment", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /<equip_id> — Get equipment details
# ---------------------------------------------------------------------------
@equipment_bp.route("/<equip_id>", methods=["GET"])
@jwt_required()
def get_equipment(equip_id):
    """Get details of a single piece of equipment."""
    try:
        equip_oid = validate_objectid(equip_id)
        if not equip_oid:
            return jsonify({"message": "Invalid equipment ID"}), 400

        item = db.equipment.find_one({"_id": equip_oid})
        if not item:
            return jsonify({"message": "Equipment not found"}), 404

        return jsonify({"equipment": parse_doc(item)}), 200

    except Exception as e:
        return jsonify({"message": "Error fetching equipment", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# PUT /<equip_id> — Update equipment (including status changes)
# ---------------------------------------------------------------------------
@equipment_bp.route("/<equip_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "site_manager")
def update_equipment(equip_id):
    """Update equipment details, including status changes."""
    try:
        equip_oid = validate_objectid(equip_id)
        if not equip_oid:
            return jsonify({"message": "Invalid equipment ID"}), 400

        existing = db.equipment.find_one({"_id": equip_oid})
        if not existing:
            return jsonify({"message": "Equipment not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        is_valid, errors = validate_equipment_data(data, is_update=True)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        allowed_fields = [
            "equipment_name", "equipment_type", "status",
            "assigned_site", "rental_cost", "owner",
            "purchase_date", "condition", "notes",
        ]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}

        if not update_data:
            return jsonify({"message": "No valid fields to update"}), 400

        if "rental_cost" in update_data:
            update_data["rental_cost"] = float(update_data["rental_cost"])

        update_data["updated_at"] = datetime.utcnow()

        user_id = get_jwt_identity()
        claims = get_jwt()

        db.equipment.update_one({"_id": equip_oid}, {"$set": update_data})
        updated_item = db.equipment.find_one({"_id": equip_oid})

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Updated Equipment",
            ip_address=request.remote_addr or "unknown",
            details=f"Equipment ID: {equip_id}",
        )

        return jsonify({
            "message": "Equipment updated successfully",
            "equipment": parse_doc(updated_item),
        }), 200

    except Exception as e:
        return jsonify({"message": "Error updating equipment", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# DELETE /<equip_id> — Delete equipment (admin only)
# ---------------------------------------------------------------------------
@equipment_bp.route("/<equip_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_equipment(equip_id):
    """Delete a piece of equipment (admin only)."""
    try:
        equip_oid = validate_objectid(equip_id)
        if not equip_oid:
            return jsonify({"message": "Invalid equipment ID"}), 400

        existing = db.equipment.find_one({"_id": equip_oid})
        if not existing:
            return jsonify({"message": "Equipment not found"}), 404

        db.equipment.delete_one({"_id": equip_oid})

        user_id = get_jwt_identity()
        claims = get_jwt()

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Deleted Equipment",
            ip_address=request.remote_addr or "unknown",
            details=f"Equipment: {existing.get('equipment_name', equip_id)}",
        )

        return jsonify({"message": "Equipment deleted successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Error deleting equipment", "error": str(e)}), 500
