"""
Galaxy Construction Management System - Audit Logs Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime
import math
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid
from app.utils.decorators import role_required

audit_bp = Blueprint("audit", __name__)


@audit_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_audit_logs():
    """List audit logs with filtering and pagination. Admin only."""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        user_id = request.args.get("user_id")
        action = request.args.get("action")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")

        per_page = min(max(1, per_page), 100)
        skip = (page - 1) * per_page

        # Build query
        query = {}

        if user_id:
            query["user_id"] = user_id

        if action:
            query["action"] = {"$regex": action, "$options": "i"}

        if start_date or end_date:
            date_filter = {}
            if start_date:
                try:
                    date_filter["$gte"] = datetime.fromisoformat(start_date)
                except ValueError:
                    return jsonify({"message": "Invalid start_date format. Use ISO format."}), 400
            if end_date:
                try:
                    date_filter["$lte"] = datetime.fromisoformat(end_date)
                except ValueError:
                    return jsonify({"message": "Invalid end_date format. Use ISO format."}), 400
            query["timestamp"] = date_filter

        total = db.audit_logs.count_documents(query)
        logs = list(
            db.audit_logs.find(query)
            .sort("timestamp", -1)
            .skip(skip)
            .limit(per_page)
        )

        total_pages = math.ceil(total / per_page) if total > 0 else 1

        return jsonify({
            "audit_logs": parse_doc(logs),
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch audit logs", "error": str(e)}), 500
