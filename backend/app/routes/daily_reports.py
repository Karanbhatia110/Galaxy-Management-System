"""
Galaxy Construction Management System - Daily Reports Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid
from app.utils.decorators import role_required
from app.utils.audit import log_action, create_notification
from app.utils.validators import validate_daily_report_data

daily_reports_bp = Blueprint("daily_reports", __name__)


# ---------------------------------------------------------------------------
# GET /project/<project_id> — List daily reports for a project (paginated)
# ---------------------------------------------------------------------------
@daily_reports_bp.route("/project/<project_id>", methods=["GET"])
@jwt_required()
def list_daily_reports(project_id):
    """List daily reports for a project, sorted by date descending."""
    try:
        proj_oid = validate_objectid(project_id)
        if not proj_oid:
            return jsonify({"message": "Invalid project ID"}), 400

        # Verify project exists
        project = db.projects.find_one({"_id": proj_oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = min(max(1, per_page), 100)
        skip = (max(1, page) - 1) * per_page

        query = {"project_id": str(proj_oid)}

        # Optional date range filters
        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        if date_from or date_to:
            date_filter = {}
            if date_from:
                date_filter["$gte"] = date_from
            if date_to:
                date_filter["$lte"] = date_to
            query["date"] = date_filter

        total = db.daily_reports.count_documents(query)
        reports = list(
            db.daily_reports.find(query)
            .sort("date", -1)
            .skip(skip)
            .limit(per_page)
        )

        return jsonify({
            "reports": parse_doc(reports),
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "has_next": skip + per_page < total,
                "has_prev": page > 1,
            },
        }), 200

    except Exception as e:
        return jsonify({"message": "Error fetching daily reports", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST /project/<project_id> — Create a daily report
# ---------------------------------------------------------------------------
@daily_reports_bp.route("/project/<project_id>", methods=["POST"])
@jwt_required()
@role_required("admin", "site_manager")
def create_daily_report(project_id):
    """Create a new daily report for a project."""
    try:
        proj_oid = validate_objectid(project_id)
        if not proj_oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": proj_oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        # Validate
        is_valid, errors = validate_daily_report_data(data)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        # Validate materials_used items if provided
        materials_used = data.get("materials_used", [])
        if materials_used and isinstance(materials_used, list):
            for idx, item in enumerate(materials_used):
                if not isinstance(item, dict):
                    return jsonify({"message": f"materials_used[{idx}] must be an object"}), 400
                if not item.get("material"):
                    return jsonify({"message": f"materials_used[{idx}].material is required"}), 400
                if item.get("quantity") is not None:
                    try:
                        float(item["quantity"])
                    except (ValueError, TypeError):
                        return jsonify({"message": f"materials_used[{idx}].quantity must be a number"}), 400

        # Validate site_photos (array of GridFS file IDs)
        site_photos = data.get("site_photos", [])
        if site_photos and isinstance(site_photos, list):
            for photo_id in site_photos:
                if not validate_objectid(photo_id):
                    return jsonify({"message": f"Invalid site_photo ID: {photo_id}"}), 400

        user_id = get_jwt_identity()
        claims = get_jwt()

        report = {
            "project_id": str(proj_oid),
            "date": data["date"],
            "work_completed": data["work_completed"],
            "labour_count": data.get("labour_count", 0),
            "materials_used": materials_used,
            "issues_faced": data.get("issues_faced", ""),
            "remarks": data.get("remarks", ""),
            "site_photos": site_photos,
            "created_by": user_id,
            "created_by_name": claims.get("name", "Unknown"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = db.daily_reports.insert_one(report)
        report["_id"] = result.inserted_id

        # Audit log
        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Created Daily Report",
            ip_address=request.remote_addr or "unknown",
            project_ref=str(proj_oid),
            details=f"Daily report for date {data['date']}",
        )

        return jsonify({
            "message": "Daily report created successfully",
            "report": parse_doc(report),
        }), 201

    except Exception as e:
        return jsonify({"message": "Error creating daily report", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /<report_id> — Get a single daily report
# ---------------------------------------------------------------------------
@daily_reports_bp.route("/<report_id>", methods=["GET"])
@jwt_required()
def get_daily_report(report_id):
    """Get details of a single daily report."""
    try:
        report_oid = validate_objectid(report_id)
        if not report_oid:
            return jsonify({"message": "Invalid report ID"}), 400

        report = db.daily_reports.find_one({"_id": report_oid})
        if not report:
            return jsonify({"message": "Daily report not found"}), 404

        return jsonify({"report": parse_doc(report)}), 200

    except Exception as e:
        return jsonify({"message": "Error fetching daily report", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# PUT /<report_id> — Update a daily report
# ---------------------------------------------------------------------------
@daily_reports_bp.route("/<report_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "site_manager")
def update_daily_report(report_id):
    """Update an existing daily report."""
    try:
        report_oid = validate_objectid(report_id)
        if not report_oid:
            return jsonify({"message": "Invalid report ID"}), 400

        existing = db.daily_reports.find_one({"_id": report_oid})
        if not existing:
            return jsonify({"message": "Daily report not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        # Build update document from allowed fields
        allowed_fields = [
            "date", "work_completed", "labour_count",
            "materials_used", "issues_faced", "remarks", "site_photos",
        ]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}

        if not update_data:
            return jsonify({"message": "No valid fields to update"}), 400

        # Validate materials_used if provided
        if "materials_used" in update_data:
            materials = update_data["materials_used"]
            if isinstance(materials, list):
                for idx, item in enumerate(materials):
                    if not isinstance(item, dict):
                        return jsonify({"message": f"materials_used[{idx}] must be an object"}), 400
                    if not item.get("material"):
                        return jsonify({"message": f"materials_used[{idx}].material is required"}), 400

        # Validate site_photos if provided
        if "site_photos" in update_data:
            for photo_id in update_data["site_photos"]:
                if not validate_objectid(photo_id):
                    return jsonify({"message": f"Invalid site_photo ID: {photo_id}"}), 400

        update_data["updated_at"] = datetime.utcnow()

        user_id = get_jwt_identity()
        claims = get_jwt()
        update_data["updated_by"] = user_id
        update_data["updated_by_name"] = claims.get("name", "Unknown")

        db.daily_reports.update_one({"_id": report_oid}, {"$set": update_data})

        updated_report = db.daily_reports.find_one({"_id": report_oid})

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Updated Daily Report",
            ip_address=request.remote_addr or "unknown",
            project_ref=existing.get("project_id"),
            details=f"Updated report {report_id}",
        )

        return jsonify({
            "message": "Daily report updated successfully",
            "report": parse_doc(updated_report),
        }), 200

    except Exception as e:
        return jsonify({"message": "Error updating daily report", "error": str(e)}), 500
