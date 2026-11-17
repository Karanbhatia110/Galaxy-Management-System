"""
Galaxy Construction Management System - Project Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime

from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid
from app.utils.decorators import role_required
from app.utils.audit import log_action
from app.utils.validators import validate_project_data

projects_bp = Blueprint("projects", __name__)


# ── Helpers ─────────────────────────────────────────────────────────────── #

def _generate_project_code():
    """Auto-generate a unique project code like GAL-0001."""
    last = db.projects.find_one(
        {"project_code": {"$regex": r"^GAL-\d+$"}},
        sort=[("project_code", -1)],
    )
    if last:
        try:
            num = int(last["project_code"].split("-")[1]) + 1
        except (IndexError, ValueError):
            num = 1
    else:
        num = 1
    return f"GAL-{num:04d}"


def _compute_financials(project_id_str):
    """Aggregate payments and expenses for a project and return computed fields."""
    pid = project_id_str  # stored as string in related collections

    # Total received from payments
    pay_pipeline = [
        {"$match": {"project_id": pid}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    pay_result = list(db.payments.aggregate(pay_pipeline))
    total_received = pay_result[0]["total"] if pay_result else 0

    # Total expenses
    exp_pipeline = [
        {"$match": {"project_id": pid}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    exp_result = list(db.expenses.aggregate(exp_pipeline))
    total_expenses = exp_result[0]["total"] if exp_result else 0

    return {
        "total_received": total_received,
        "total_expenses": total_expenses,
    }


# --------------------------------------------------------------------------- #
#  GET / — List projects (role-aware, paginated, searchable)
# --------------------------------------------------------------------------- #
@projects_bp.route("/", methods=["GET"])
@jwt_required()
def list_projects():
    """
    List projects filtered by role:
      • admin / accountant  → all projects
      • site_manager        → assigned projects
      • client              → own projects
    Supports search by name/code and filter by status.
    """
    try:
        current_user = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role", "")

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search", "").strip()
        status = request.args.get("status", "").strip()

        per_page = min(max(1, per_page), 100)
        page = max(1, page)
        skip = (page - 1) * per_page

        # Build query based on role
        query = {}
        if role == "site_manager":
            query["assigned_to"] = current_user
        elif role == "client":
            query["client_id"] = current_user

        # Search filter
        if search:
            query["$or"] = [
                {"project_name": {"$regex": search, "$options": "i"}},
                {"project_code": {"$regex": search, "$options": "i"}},
            ]

        # Status filter
        if status:
            query["status"] = status

        total = db.projects.count_documents(query)
        projects = list(
            db.projects.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(per_page)
        )

        return jsonify({
            "projects": parse_doc(projects),
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": -(-total // per_page) if total else 1,
                "has_next": page * per_page < total,
                "has_prev": page > 1,
            },
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch projects", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  POST / — Create project (admin only)
# --------------------------------------------------------------------------- #
@projects_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_project():
    """Create a new project. Auto-generates project_code if not provided."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        # Auto-generate code if missing
        if not data.get("project_code"):
            data["project_code"] = _generate_project_code()

        # Validate
        is_valid, errors = validate_project_data(data)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        # Check duplicate code
        if db.projects.find_one({"project_code": data["project_code"]}):
            return jsonify({"message": "A project with this code already exists"}), 409

        current_user = get_jwt_identity()
        claims = get_jwt()

        project_doc = {
            "project_name": data["project_name"].strip(),
            "project_code": data["project_code"].strip(),
            "description": data.get("description", ""),
            "location": data.get("location", ""),
            "client_id": data.get("client_id", ""),
            "client_name": data.get("client_name", ""),
            "assigned_to": data.get("assigned_to", ""),
            "site_manager_name": data.get("site_manager_name", ""),
            "contract_value": float(data.get("contract_value", 0)),
            "start_date": data.get("start_date", ""),
            "end_date": data.get("end_date", ""),
            "status": data.get("status", "planning"),
            "completion_percentage": float(data.get("completion_percentage", 0)),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user,
        }

        result = db.projects.insert_one(project_doc)
        project_doc["_id"] = result.inserted_id

        # Audit
        log_action(
            user_id=current_user,
            user_name=claims.get("name", ""),
            action=f"Created project: {project_doc['project_name']}",
            ip_address=request.remote_addr or "unknown",
            project_ref=str(result.inserted_id),
            details=f"Project code: {project_doc['project_code']}",
        )

        return jsonify({
            "message": "Project created successfully",
            "project": parse_doc(project_doc),
        }), 201

    except Exception as e:
        return jsonify({"message": "Failed to create project", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  GET /<project_id> — Get project details with financials
# --------------------------------------------------------------------------- #
@projects_bp.route("/<project_id>", methods=["GET"])
@jwt_required()
def get_project(project_id):
    """Get a single project with computed financial data."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        # Compute financials
        financials = _compute_financials(project_id)
        contract_value = float(project.get("contract_value", 0))

        project_data = parse_doc(project)
        project_data["total_received"] = financials["total_received"]
        project_data["total_expenses"] = financials["total_expenses"]
        project_data["remaining_balance"] = contract_value - financials["total_received"]
        project_data["profit"] = financials["total_received"] - financials["total_expenses"]

        return jsonify({"project": project_data}), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch project", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  PUT /<project_id> — Update project
# --------------------------------------------------------------------------- #
@projects_bp.route("/<project_id>", methods=["PUT"])
@jwt_required()
def update_project(project_id):
    """Update an existing project."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        # Validate (update mode)
        is_valid, errors = validate_project_data(data, is_update=True)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        # Check code uniqueness if changed
        if data.get("project_code"):
            existing = db.projects.find_one({
                "project_code": data["project_code"],
                "_id": {"$ne": oid},
            })
            if existing:
                return jsonify({"message": "A project with this code already exists"}), 409

        current_user = get_jwt_identity()
        claims = get_jwt()

        # Build update set
        update_fields = {}
        allowed = [
            "project_name", "project_code", "description", "location",
            "client_id", "client_name", "assigned_to", "site_manager_name",
            "contract_value", "start_date", "end_date", "status",
            "completion_percentage",
        ]
        for field in allowed:
            if field in data:
                value = data[field]
                if field == "contract_value":
                    value = float(value)
                elif field == "completion_percentage":
                    value = float(value)
                elif isinstance(value, str):
                    value = value.strip()
                update_fields[field] = value

        update_fields["updated_at"] = datetime.utcnow()

        db.projects.update_one({"_id": oid}, {"$set": update_fields})

        # Audit
        log_action(
            user_id=current_user,
            user_name=claims.get("name", ""),
            action=f"Updated project: {project.get('project_name', '')}",
            ip_address=request.remote_addr or "unknown",
            project_ref=project_id,
            details=f"Updated fields: {', '.join(k for k in update_fields if k != 'updated_at')}",
        )

        updated = db.projects.find_one({"_id": oid})
        return jsonify({
            "message": "Project updated successfully",
            "project": parse_doc(updated),
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to update project", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  DELETE /<project_id> — Delete project (admin only)
# --------------------------------------------------------------------------- #
@projects_bp.route("/<project_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_project(project_id):
    """Delete a project (admin only)."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        current_user = get_jwt_identity()
        claims = get_jwt()

        db.projects.delete_one({"_id": oid})

        # Audit
        log_action(
            user_id=current_user,
            user_name=claims.get("name", ""),
            action=f"Deleted project: {project.get('project_name', '')}",
            ip_address=request.remote_addr or "unknown",
            project_ref=project_id,
            details=f"Project code: {project.get('project_code', '')}",
        )

        return jsonify({"message": "Project deleted successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to delete project", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  GET /<project_id>/summary — Financial summary
# --------------------------------------------------------------------------- #
@projects_bp.route("/<project_id>/summary", methods=["GET"])
@jwt_required()
def project_summary(project_id):
    """Return a financial summary for the project."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        financials = _compute_financials(project_id)
        contract_value = float(project.get("contract_value", 0))
        total_received = financials["total_received"]
        total_expenses = financials["total_expenses"]
        remaining_balance = contract_value - total_received
        profit = total_received - total_expenses

        # Payment and expense counts
        payment_count = db.payments.count_documents({"project_id": project_id})
        expense_count = db.expenses.count_documents({"project_id": project_id})

        return jsonify({
            "summary": {
                "project_id": project_id,
                "project_name": project.get("project_name", ""),
                "project_code": project.get("project_code", ""),
                "status": project.get("status", ""),
                "completion_percentage": project.get("completion_percentage", 0),
                "contract_value": contract_value,
                "total_received": total_received,
                "total_expenses": total_expenses,
                "remaining_balance": remaining_balance,
                "profit": profit,
                "payment_count": payment_count,
                "expense_count": expense_count,
            },
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch project summary", "error": str(e)}), 500
