"""
Galaxy Construction Management System - Inventory Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid
from app.utils.decorators import role_required
from app.utils.audit import log_action, create_notification
from app.utils.validators import validate_inventory_data

inventory_bp = Blueprint("inventory", __name__)


def _compute_remaining(doc):
    """Attach computed quantity_remaining to a document dict."""
    if doc is None:
        return doc
    purchased = float(doc.get("quantity_purchased", 0))
    used = float(doc.get("quantity_used", 0))
    doc["quantity_remaining"] = round(purchased - used, 4)
    return doc


# ---------------------------------------------------------------------------
# GET / — List all materials (paginated, filterable)
# ---------------------------------------------------------------------------
@inventory_bp.route("/", methods=["GET"])
@jwt_required()
def list_materials():
    """List all inventory materials with optional project_id filter."""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = min(max(1, per_page), 100)
        skip = (max(1, page) - 1) * per_page

        query = {}
        project_id = request.args.get("project_id")
        if project_id:
            query["project_id"] = project_id

        total = db.inventory.count_documents(query)
        items = list(
            db.inventory.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(per_page)
        )

        # Attach computed field
        for item in items:
            _compute_remaining(item)

        return jsonify({
            "materials": parse_doc(items),
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "has_next": skip + per_page < total,
                "has_prev": page > 1,
            },
        }), 200

    except Exception as e:
        return jsonify({"message": "Error fetching materials", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST / — Add a new material
# ---------------------------------------------------------------------------
@inventory_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("admin", "site_manager")
def add_material():
    """Add a new material to inventory."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        is_valid, errors = validate_inventory_data(data)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        user_id = get_jwt_identity()
        claims = get_jwt()

        quantity_purchased = float(data.get("quantity_purchased", 0))
        quantity_used = float(data.get("quantity_used", 0))

        material = {
            "material_name": data["material_name"],
            "unit": data.get("unit", ""),
            "project_id": data.get("project_id", ""),
            "quantity_purchased": quantity_purchased,
            "quantity_used": quantity_used,
            "quantity_remaining": round(quantity_purchased - quantity_used, 4),
            "purchase_cost": float(data.get("purchase_cost", 0)),
            "supplier": data.get("supplier", ""),
            "low_stock_threshold": float(data.get("low_stock_threshold", 0)),
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = db.inventory.insert_one(material)
        material["_id"] = result.inserted_id

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Added Inventory Material",
            ip_address=request.remote_addr or "unknown",
            project_ref=data.get("project_id"),
            details=f"Material: {data['material_name']}",
        )

        return jsonify({
            "message": "Material added successfully",
            "material": parse_doc(material),
        }), 201

    except Exception as e:
        return jsonify({"message": "Error adding material", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /<item_id> — Get material details
# ---------------------------------------------------------------------------
@inventory_bp.route("/<item_id>", methods=["GET"])
@jwt_required()
def get_material(item_id):
    """Get details of a single inventory item."""
    try:
        item_oid = validate_objectid(item_id)
        if not item_oid:
            return jsonify({"message": "Invalid item ID"}), 400

        item = db.inventory.find_one({"_id": item_oid})
        if not item:
            return jsonify({"message": "Material not found"}), 404

        _compute_remaining(item)
        return jsonify({"material": parse_doc(item)}), 200

    except Exception as e:
        return jsonify({"message": "Error fetching material", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# PUT /<item_id> — Update a material
# ---------------------------------------------------------------------------
@inventory_bp.route("/<item_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "site_manager")
def update_material(item_id):
    """Update inventory material and recalculate quantity_remaining."""
    try:
        item_oid = validate_objectid(item_id)
        if not item_oid:
            return jsonify({"message": "Invalid item ID"}), 400

        existing = db.inventory.find_one({"_id": item_oid})
        if not existing:
            return jsonify({"message": "Material not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        is_valid, errors = validate_inventory_data(data, is_update=True)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        allowed_fields = [
            "material_name", "unit", "project_id",
            "quantity_purchased", "quantity_used",
            "purchase_cost", "supplier", "low_stock_threshold",
        ]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}

        if not update_data:
            return jsonify({"message": "No valid fields to update"}), 400

        # Cast numeric fields
        for nf in ["quantity_purchased", "quantity_used", "purchase_cost", "low_stock_threshold"]:
            if nf in update_data:
                update_data[nf] = float(update_data[nf])

        # Recalculate remaining
        purchased = update_data.get("quantity_purchased", existing.get("quantity_purchased", 0))
        used = update_data.get("quantity_used", existing.get("quantity_used", 0))
        update_data["quantity_remaining"] = round(float(purchased) - float(used), 4)
        update_data["updated_at"] = datetime.utcnow()

        db.inventory.update_one({"_id": item_oid}, {"$set": update_data})
        updated_item = db.inventory.find_one({"_id": item_oid})
        _compute_remaining(updated_item)

        return jsonify({
            "message": "Material updated successfully",
            "material": parse_doc(updated_item),
        }), 200

    except Exception as e:
        return jsonify({"message": "Error updating material", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# DELETE /<item_id> — Delete a material
# ---------------------------------------------------------------------------
@inventory_bp.route("/<item_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin", "site_manager")
def delete_material(item_id):
    """Delete an inventory material."""
    try:
        item_oid = validate_objectid(item_id)
        if not item_oid:
            return jsonify({"message": "Invalid item ID"}), 400

        existing = db.inventory.find_one({"_id": item_oid})
        if not existing:
            return jsonify({"message": "Material not found"}), 404

        db.inventory.delete_one({"_id": item_oid})

        user_id = get_jwt_identity()
        claims = get_jwt()

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Deleted Inventory Material",
            ip_address=request.remote_addr or "unknown",
            project_ref=existing.get("project_id"),
            details=f"Material: {existing.get('material_name', item_id)}",
        )

        return jsonify({"message": "Material deleted successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Error deleting material", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# PUT /<item_id>/usage — Record material usage
# ---------------------------------------------------------------------------
@inventory_bp.route("/<item_id>/usage", methods=["PUT"])
@jwt_required()
@role_required("admin", "site_manager")
def record_usage(item_id):
    """
    Record material usage.
    Accepts { quantity_used_increment }.
    Updates quantity_used += increment, recalculates remaining.
    Creates low_inventory notification if remaining <= low_stock_threshold.
    """
    try:
        item_oid = validate_objectid(item_id)
        if not item_oid:
            return jsonify({"message": "Invalid item ID"}), 400

        item = db.inventory.find_one({"_id": item_oid})
        if not item:
            return jsonify({"message": "Material not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        increment = data.get("quantity_used_increment")
        if increment is None:
            return jsonify({"message": "quantity_used_increment is required"}), 400
        try:
            increment = float(increment)
            if increment < 0:
                return jsonify({"message": "quantity_used_increment must be non-negative"}), 400
        except (ValueError, TypeError):
            return jsonify({"message": "quantity_used_increment must be a number"}), 400

        new_used = float(item.get("quantity_used", 0)) + increment
        purchased = float(item.get("quantity_purchased", 0))
        new_remaining = round(purchased - new_used, 4)

        db.inventory.update_one(
            {"_id": item_oid},
            {"$set": {
                "quantity_used": new_used,
                "quantity_remaining": new_remaining,
                "updated_at": datetime.utcnow(),
            }},
        )

        # Low-stock notification
        threshold = float(item.get("low_stock_threshold", 0))
        if threshold > 0 and new_remaining <= threshold:
            # Notify all admins
            admins = db.users.find({"role": "admin"})
            for admin in admins:
                create_notification(
                    user_id=str(admin["_id"]),
                    notification_type="low_inventory",
                    title="Low Inventory Alert",
                    message=f"{item.get('material_name', 'Material')} remaining: {new_remaining}. Threshold: {threshold}.",
                    project_id=item.get("project_id"),
                )

        updated_item = db.inventory.find_one({"_id": item_oid})
        _compute_remaining(updated_item)

        return jsonify({
            "message": "Usage recorded successfully",
            "material": parse_doc(updated_item),
        }), 200

    except Exception as e:
        return jsonify({"message": "Error recording usage", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /alerts — Materials at or below low-stock threshold
# ---------------------------------------------------------------------------
@inventory_bp.route("/alerts", methods=["GET"])
@jwt_required()
def low_stock_alerts():
    """Get all materials where quantity_remaining <= low_stock_threshold."""
    try:
        # Use aggregation to compute remaining and filter in-database
        pipeline = [
            {
                "$addFields": {
                    "quantity_remaining": {
                        "$subtract": [
                            {"$ifNull": ["$quantity_purchased", 0]},
                            {"$ifNull": ["$quantity_used", 0]},
                        ]
                    }
                }
            },
            {
                "$match": {
                    "$expr": {
                        "$and": [
                            {"$gt": ["$low_stock_threshold", 0]},
                            {"$lte": ["$quantity_remaining", "$low_stock_threshold"]},
                        ]
                    }
                }
            },
            {"$sort": {"quantity_remaining": 1}},
        ]

        alerts = list(db.inventory.aggregate(pipeline))

        return jsonify({
            "alerts": parse_doc(alerts),
            "count": len(alerts),
        }), 200

    except Exception as e:
        return jsonify({"message": "Error fetching low-stock alerts", "error": str(e)}), 500
