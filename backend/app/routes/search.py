"""
Galaxy Construction Management System - Global Search Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid

search_bp = Blueprint("search", __name__)


@search_bp.route("/", methods=["GET"])
@jwt_required()
def global_search():
    """
    Global search across multiple collections.
    Query param: q (search term).
    Returns grouped results limited to 5 per category.
    """
    try:
        query = request.args.get("q", "").strip()
        if not query or len(query) < 2:
            return jsonify({
                "message": "Search query must be at least 2 characters",
                "projects": [],
                "clients": [],
                "expenses": [],
                "payments": [],
                "documents": []
            }), 200

        regex = {"$regex": query, "$options": "i"}
        limit = 5

        # Search projects (project_name, project_code, location)
        projects = list(
            db.projects.find(
                {"$or": [
                    {"project_name": regex},
                    {"project_code": regex},
                    {"location": regex}
                ]},
                {"project_name": 1, "project_code": 1, "location": 1, "status": 1}
            ).limit(limit)
        )

        # Search users with role=client (name, email) — labeled as 'clients'
        clients = list(
            db.users.find(
                {"role": "client", "$or": [
                    {"name": regex},
                    {"email": regex}
                ]},
                {"name": 1, "email": 1, "phone": 1, "company": 1}
            ).limit(limit)
        )

        # Search expenses (vendor, notes)
        expenses = list(
            db.expenses.find(
                {"$or": [
                    {"vendor": regex},
                    {"notes": regex}
                ]},
                {"vendor": 1, "notes": 1, "amount": 1, "category": 1, "date": 1, "project_id": 1}
            ).limit(limit)
        )

        # Enrich expenses with project names
        for expense in expenses:
            if expense.get("project_id"):
                pid = validate_objectid(str(expense["project_id"]))
                if pid:
                    project = db.projects.find_one({"_id": pid}, {"project_name": 1})
                    expense["project_name"] = project["project_name"] if project else "Unknown"

        # Search payments (transaction_reference, remarks)
        payments = list(
            db.payments.find(
                {"$or": [
                    {"transaction_reference": regex},
                    {"remarks": regex}
                ]},
                {"transaction_reference": 1, "remarks": 1, "amount": 1,
                 "payment_date": 1, "project_id": 1}
            ).limit(limit)
        )

        # Enrich payments with project names
        for payment in payments:
            if payment.get("project_id"):
                pid = validate_objectid(str(payment["project_id"]))
                if pid:
                    project = db.projects.find_one({"_id": pid}, {"project_name": 1})
                    payment["project_name"] = project["project_name"] if project else "Unknown"

        # Search documents via GridFS (filename)
        documents = list(
            db.fs.files.find(
                {"filename": regex},
                {"filename": 1, "uploadDate": 1, "length": 1,
                 "metadata": 1}
            ).limit(limit)
        )

        return jsonify({
            "projects": parse_doc(projects),
            "clients": parse_doc(clients),
            "expenses": parse_doc(expenses),
            "payments": parse_doc(payments),
            "documents": parse_doc(documents),
            "query": query
        }), 200

    except Exception as e:
        return jsonify({"message": "Search failed", "error": str(e)}), 500
