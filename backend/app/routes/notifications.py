"""
Galaxy Construction Management System - Notifications Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/", methods=["GET"])
@jwt_required()
def get_notifications():
    """Get notifications for the current user with optional read filter and pagination."""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        is_read = request.args.get("is_read")

        per_page = min(max(1, per_page), 100)
        skip = (page - 1) * per_page

        # Build query
        query = {"user_id": current_user_id}
        if is_read is not None:
            query["is_read"] = is_read.lower() == "true"

        total = db.notifications.count_documents(query)
        notifications = list(
            db.notifications.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(per_page)
        )

        import math
        total_pages = math.ceil(total / per_page) if total > 0 else 1

        return jsonify({
            "notifications": parse_doc(notifications),
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
        return jsonify({"message": "Failed to fetch notifications", "error": str(e)}), 500


@notifications_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications for the current user."""
    try:
        current_user_id = get_jwt_identity()

        count = db.notifications.count_documents({
            "user_id": current_user_id,
            "is_read": False
        })

        return jsonify({"unread_count": count}), 200

    except Exception as e:
        return jsonify({"message": "Failed to get unread count", "error": str(e)}), 500


@notifications_bp.route("/<notification_id>/read", methods=["PUT"])
@jwt_required()
def mark_as_read(notification_id):
    """Mark a single notification as read."""
    try:
        current_user_id = get_jwt_identity()

        oid = validate_objectid(notification_id)
        if not oid:
            return jsonify({"message": "Invalid notification ID"}), 400

        result = db.notifications.update_one(
            {"_id": oid, "user_id": current_user_id},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )

        if result.matched_count == 0:
            return jsonify({"message": "Notification not found"}), 404

        return jsonify({"message": "Notification marked as read"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to update notification", "error": str(e)}), 500


@notifications_bp.route("/read-all", methods=["PUT"])
@jwt_required()
def mark_all_as_read():
    """Mark all notifications for the current user as read."""
    try:
        current_user_id = get_jwt_identity()

        result = db.notifications.update_many(
            {"user_id": current_user_id, "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )

        return jsonify({
            "message": "All notifications marked as read",
            "modified_count": result.modified_count
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to update notifications", "error": str(e)}), 500


@notifications_bp.route("/<notification_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notification_id):
    """Delete a notification."""
    try:
        current_user_id = get_jwt_identity()

        oid = validate_objectid(notification_id)
        if not oid:
            return jsonify({"message": "Invalid notification ID"}), 400

        result = db.notifications.delete_one(
            {"_id": oid, "user_id": current_user_id}
        )

        if result.deleted_count == 0:
            return jsonify({"message": "Notification not found"}), 404

        return jsonify({"message": "Notification deleted"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to delete notification", "error": str(e)}), 500
