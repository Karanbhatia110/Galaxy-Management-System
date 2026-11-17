"""
Galaxy Construction Management System - Payments Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime

from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid, paginate
from app.utils.decorators import role_required
from app.utils.audit import log_action, create_notification
from app.utils.validators import validate_payment_data

payments_bp = Blueprint("payments", __name__)


@payments_bp.route("/project/<project_id>", methods=["GET"])
@jwt_required()
def list_payments(project_id):
    """List payments for a project. Paginated. Clients see only their own project's payments."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get("role", "")

        # Clients can only see payments for projects they own
        if user_role == "client":
            project = db.projects.find_one({"_id": oid, "client_id": current_user_id})
            if not project:
                return jsonify({"message": "Access denied. This is not your project."}), 403
        else:
            project = db.projects.find_one({"_id": oid})
            if not project:
                return jsonify({"message": "Project not found"}), 404

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        query = {"project_id": project_id}
        cursor = db.payments.find(query).sort("payment_date", -1)

        items, pagination = paginate(cursor, page, per_page)

        return jsonify({
            "payments": parse_doc(items),
            "pagination": pagination
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch payments", "error": str(e)}), 500


@payments_bp.route("/project/<project_id>", methods=["POST"])
@jwt_required()
@role_required("admin", "accountant")
def create_payment(project_id):
    """Record a new payment (admin/accountant only)."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        # Validate payment data
        is_valid, errors = validate_payment_data(data)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_name = claims.get("name", "Unknown")

        payment = {
            "project_id": project_id,
            "amount": float(data["amount"]),
            "payment_date": data["payment_date"],
            "payment_method": data.get("payment_method", "bank_transfer"),
            "reference_number": data.get("reference_number", ""),
            "description": data.get("description", ""),
            "received_from": data.get("received_from", ""),
            "recorded_by": current_user_id,
            "recorded_by_name": user_name,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = db.payments.insert_one(payment)

        # Update project's total_received
        _sync_project_total_received(project_id)

        # Create notification for admin users
        admins = db.users.find({"role": "admin"})
        for admin in admins:
            create_notification(
                user_id=str(admin["_id"]),
                notification_type="new_payment",
                title="New Payment Recorded",
                message=f"Payment of ₹{payment['amount']:,.2f} recorded for project {project.get('project_name', 'N/A')} by {user_name}.",
                project_id=project_id
            )

        # Log audit
        log_action(
            user_id=current_user_id,
            user_name=user_name,
            action="Recorded Payment",
            ip_address=request.remote_addr or "unknown",
            project_ref=project_id,
            details=f"Amount: ₹{payment['amount']:,.2f}, Method: {payment['payment_method']}"
        )

        payment["_id"] = result.inserted_id
        return jsonify({
            "message": "Payment recorded successfully",
            "payment": parse_doc(payment)
        }), 201

    except Exception as e:
        return jsonify({"message": "Failed to record payment", "error": str(e)}), 500


@payments_bp.route("/<payment_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "accountant")
def update_payment(payment_id):
    """Update a payment (admin/accountant only)."""
    try:
        oid = validate_objectid(payment_id)
        if not oid:
            return jsonify({"message": "Invalid payment ID"}), 400

        existing = db.payments.find_one({"_id": oid})
        if not existing:
            return jsonify({"message": "Payment not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_name = claims.get("name", "Unknown")

        update_fields = {}
        allowed_fields = [
            "amount", "payment_date", "payment_method",
            "reference_number", "description", "received_from"
        ]

        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]

        # Ensure amount is a float if provided
        if "amount" in update_fields:
            try:
                update_fields["amount"] = float(update_fields["amount"])
                if update_fields["amount"] <= 0:
                    return jsonify({"message": "Amount must be a positive number"}), 400
            except (ValueError, TypeError):
                return jsonify({"message": "Amount must be a valid number"}), 400

        if not update_fields:
            return jsonify({"message": "No valid fields to update"}), 400

        update_fields["updated_at"] = datetime.utcnow()

        db.payments.update_one({"_id": oid}, {"$set": update_fields})

        # Update project's total_received
        _sync_project_total_received(existing.get("project_id"))

        # Log audit
        log_action(
            user_id=current_user_id,
            user_name=user_name,
            action="Updated Payment",
            ip_address=request.remote_addr or "unknown",
            project_ref=existing.get("project_id"),
            details=f"Payment ID: {payment_id}, Updated fields: {', '.join(update_fields.keys())}"
        )

        updated = db.payments.find_one({"_id": oid})
        return jsonify({
            "message": "Payment updated successfully",
            "payment": parse_doc(updated)
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to update payment", "error": str(e)}), 500


@payments_bp.route("/<payment_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_payment(payment_id):
    """Delete a payment (admin only)."""
    try:
        oid = validate_objectid(payment_id)
        if not oid:
            return jsonify({"message": "Invalid payment ID"}), 400

        existing = db.payments.find_one({"_id": oid})
        if not existing:
            return jsonify({"message": "Payment not found"}), 404

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_name = claims.get("name", "Unknown")

        db.payments.delete_one({"_id": oid})

        # Update project's total_received
        _sync_project_total_received(existing.get("project_id"))

        # Log audit
        log_action(
            user_id=current_user_id,
            user_name=user_name,
            action="Deleted Payment",
            ip_address=request.remote_addr or "unknown",
            project_ref=existing.get("project_id"),
            details=f"Deleted payment of ₹{existing.get('amount', 0):,.2f}"
        )

        return jsonify({"message": "Payment deleted successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to delete payment", "error": str(e)}), 500


@payments_bp.route("/project/<project_id>/summary", methods=["GET"])
@jwt_required()
def payment_summary(project_id):
    """Get payment summary for a project: total_received, pending_amount, payment_count."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get("role", "")

        # Clients can only see their own project's summary
        if user_role == "client":
            project = db.projects.find_one({"_id": oid, "client_id": current_user_id})
            if not project:
                return jsonify({"message": "Access denied. This is not your project."}), 403
        else:
            project = db.projects.find_one({"_id": oid})
            if not project:
                return jsonify({"message": "Project not found"}), 404

        # Aggregate payment totals
        pipeline = [
            {"$match": {"project_id": project_id}},
            {"$group": {
                "_id": None,
                "total_received": {"$sum": "$amount"},
                "payment_count": {"$sum": 1}
            }}
        ]

        result = list(db.payments.aggregate(pipeline))

        total_received = result[0]["total_received"] if result else 0
        payment_count = result[0]["payment_count"] if result else 0
        contract_value = float(project.get("contract_value", 0))
        pending_amount = contract_value - total_received

        return jsonify({
            "summary": {
                "project_id": project_id,
                "project_name": project.get("project_name", ""),
                "contract_value": contract_value,
                "total_received": total_received,
                "pending_amount": pending_amount,
                "payment_count": payment_count
            }
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch payment summary", "error": str(e)}), 500


def _sync_project_total_received(project_id):
    """Recalculate and update a project's total_received from the payments collection."""
    if not project_id:
        return

    pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result = list(db.payments.aggregate(pipeline))
    total_received = result[0]["total"] if result else 0

    oid = validate_objectid(project_id)
    if oid:
        db.projects.update_one(
            {"_id": oid},
            {"$set": {
                "total_received": total_received,
                "updated_at": datetime.utcnow()
            }}
        )
