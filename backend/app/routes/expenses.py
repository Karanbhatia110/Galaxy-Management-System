"""
Galaxy Construction Management System - Expenses Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime

from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid, paginate
from app.utils.decorators import role_required
from app.utils.audit import log_action, create_notification
from app.utils.validators import validate_expense_data

expenses_bp = Blueprint("expenses", __name__)


@expenses_bp.route("/project/<project_id>", methods=["GET"])
@jwt_required()
def list_expenses(project_id):
    """List expenses for a project. Filter by category. Paginated."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        category = request.args.get("category", None)

        query = {"project_id": project_id}
        if category:
            query["category"] = category

        cursor = db.expenses.find(query).sort("date", -1)

        items, pagination = paginate(cursor, page, per_page)

        return jsonify({
            "expenses": parse_doc(items),
            "pagination": pagination
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch expenses", "error": str(e)}), 500


@expenses_bp.route("/project/<project_id>", methods=["POST"])
@jwt_required()
@role_required("admin", "accountant", "site_manager")
def create_expense(project_id):
    """Add a new expense (admin/accountant/site_manager)."""
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

        # Validate expense data
        is_valid, errors = validate_expense_data(data)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_name = claims.get("name", "Unknown")

        expense = {
            "project_id": project_id,
            "amount": float(data["amount"]),
            "category": data["category"],
            "date": data["date"],
            "description": data.get("description", ""),
            "vendor": data.get("vendor", ""),
            "invoice_number": data.get("invoice_number", ""),
            "recorded_by": current_user_id,
            "recorded_by_name": user_name,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = db.expenses.insert_one(expense)

        # Create notification for admin users
        admins = db.users.find({"role": "admin"})
        for admin in admins:
            create_notification(
                user_id=str(admin["_id"]),
                notification_type="new_expense",
                title="New Expense Recorded",
                message=f"Expense of ₹{expense['amount']:,.2f} ({expense['category']}) recorded for project {project.get('project_name', 'N/A')} by {user_name}.",
                project_id=project_id
            )

        # Log audit
        log_action(
            user_id=current_user_id,
            user_name=user_name,
            action="Recorded Expense",
            ip_address=request.remote_addr or "unknown",
            project_ref=project_id,
            details=f"Amount: ₹{expense['amount']:,.2f}, Category: {expense['category']}"
        )

        expense["_id"] = result.inserted_id
        return jsonify({
            "message": "Expense recorded successfully",
            "expense": parse_doc(expense)
        }), 201

    except Exception as e:
        return jsonify({"message": "Failed to record expense", "error": str(e)}), 500


@expenses_bp.route("/<expense_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "accountant", "site_manager")
def update_expense(expense_id):
    """Update an expense."""
    try:
        oid = validate_objectid(expense_id)
        if not oid:
            return jsonify({"message": "Invalid expense ID"}), 400

        existing = db.expenses.find_one({"_id": oid})
        if not existing:
            return jsonify({"message": "Expense not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_name = claims.get("name", "Unknown")

        update_fields = {}
        allowed_fields = [
            "amount", "category", "date", "description",
            "vendor", "invoice_number"
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

        # Validate category if provided
        valid_categories = [
            "cement", "steel", "sand", "bricks", "labour",
            "electrical", "plumbing", "transportation", "machinery", "miscellaneous"
        ]
        if "category" in update_fields and update_fields["category"] not in valid_categories:
            return jsonify({
                "message": f"category must be one of: {', '.join(valid_categories)}"
            }), 400

        if not update_fields:
            return jsonify({"message": "No valid fields to update"}), 400

        update_fields["updated_at"] = datetime.utcnow()

        db.expenses.update_one({"_id": oid}, {"$set": update_fields})

        # Log audit
        log_action(
            user_id=current_user_id,
            user_name=user_name,
            action="Updated Expense",
            ip_address=request.remote_addr or "unknown",
            project_ref=existing.get("project_id"),
            details=f"Expense ID: {expense_id}, Updated fields: {', '.join(update_fields.keys())}"
        )

        updated = db.expenses.find_one({"_id": oid})
        return jsonify({
            "message": "Expense updated successfully",
            "expense": parse_doc(updated)
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to update expense", "error": str(e)}), 500


@expenses_bp.route("/<expense_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_expense(expense_id):
    """Delete an expense (admin only)."""
    try:
        oid = validate_objectid(expense_id)
        if not oid:
            return jsonify({"message": "Invalid expense ID"}), 400

        existing = db.expenses.find_one({"_id": oid})
        if not existing:
            return jsonify({"message": "Expense not found"}), 404

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_name = claims.get("name", "Unknown")

        db.expenses.delete_one({"_id": oid})

        # Log audit
        log_action(
            user_id=current_user_id,
            user_name=user_name,
            action="Deleted Expense",
            ip_address=request.remote_addr or "unknown",
            project_ref=existing.get("project_id"),
            details=f"Deleted expense of ₹{existing.get('amount', 0):,.2f} ({existing.get('category', 'N/A')})"
        )

        return jsonify({"message": "Expense deleted successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to delete expense", "error": str(e)}), 500


@expenses_bp.route("/project/<project_id>/summary", methods=["GET"])
@jwt_required()
def expense_summary(project_id):
    """
    Expense summary for a project:
    total_expenses, category_breakdown (aggregation by category), project_profit.
    """
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        # Aggregate total expenses
        total_pipeline = [
            {"$match": {"project_id": project_id}},
            {"$group": {
                "_id": None,
                "total_expenses": {"$sum": "$amount"}
            }}
        ]
        total_result = list(db.expenses.aggregate(total_pipeline))
        total_expenses = total_result[0]["total_expenses"] if total_result else 0

        # Aggregate expenses by category
        category_pipeline = [
            {"$match": {"project_id": project_id}},
            {"$group": {
                "_id": "$category",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"total": -1}}
        ]
        category_result = list(db.expenses.aggregate(category_pipeline))
        category_breakdown = [
            {
                "category": item["_id"],
                "total": item["total"],
                "count": item["count"]
            }
            for item in category_result
        ]

        # Calculate project profit (total payments received - total expenses)
        payment_pipeline = [
            {"$match": {"project_id": project_id}},
            {"$group": {
                "_id": None,
                "total_received": {"$sum": "$amount"}
            }}
        ]
        payment_result = list(db.payments.aggregate(payment_pipeline))
        total_received = payment_result[0]["total_received"] if payment_result else 0

        contract_value = float(project.get("contract_value", 0))
        project_profit = total_received - total_expenses

        return jsonify({
            "summary": {
                "project_id": project_id,
                "project_name": project.get("project_name", ""),
                "contract_value": contract_value,
                "total_expenses": total_expenses,
                "total_received": total_received,
                "project_profit": project_profit,
                "category_breakdown": category_breakdown
            }
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch expense summary", "error": str(e)}), 500
