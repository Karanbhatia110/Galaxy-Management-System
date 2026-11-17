"""
Galaxy Construction Management System - User Management Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid
from app.utils.decorators import role_required
from app.utils.audit import log_action
from app.utils.validators import validate_user_data

users_bp = Blueprint("users", __name__)


# --------------------------------------------------------------------------- #
#  GET / — List all users (paginated, searchable)
# --------------------------------------------------------------------------- #
@users_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_users():
    """List all users with pagination and optional search."""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search", "").strip()

        per_page = min(max(1, per_page), 100)
        page = max(1, page)
        skip = (page - 1) * per_page

        # Build filter
        query = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]

        total = db.users.count_documents(query)
        users = list(
            db.users.find(query, {"password": 0})
            .sort("created_at", -1)
            .skip(skip)
            .limit(per_page)
        )

        return jsonify({
            "users": parse_doc(users),
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": -(-total // per_page) if total else 1,  # ceil division
                "has_next": page * per_page < total,
                "has_prev": page > 1,
            },
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch users", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  POST / — Create a new user
# --------------------------------------------------------------------------- #
@users_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_user():
    """Create a new user account."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        # Validate
        is_valid, errors = validate_user_data(data)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        # Check duplicate email
        if db.users.find_one({"email": data["email"].strip().lower()}):
            return jsonify({"message": "A user with this email already exists"}), 409

        current_user = get_jwt_identity()
        claims = get_jwt()

        user_doc = {
            "name": data["name"].strip(),
            "email": data["email"].strip().lower(),
            "password": generate_password_hash(data["password"]),
            "role": data["role"],
            "phone": data.get("phone", ""),
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user,
        }

        result = db.users.insert_one(user_doc)

        # Audit
        log_action(
            user_id=current_user,
            user_name=claims.get("name", ""),
            action=f"Created user: {user_doc['name']} ({user_doc['role']})",
            ip_address=request.remote_addr or "unknown",
            details=f"New user email: {user_doc['email']}",
        )

        user_doc["_id"] = result.inserted_id
        user_doc.pop("password", None)

        return jsonify({
            "message": "User created successfully",
            "user": parse_doc(user_doc),
        }), 201

    except Exception as e:
        return jsonify({"message": "Failed to create user", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  GET /<user_id> — Get user details
# --------------------------------------------------------------------------- #
@users_bp.route("/<user_id>", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_user(user_id):
    """Get a single user's details (password excluded)."""
    try:
        oid = validate_objectid(user_id)
        if not oid:
            return jsonify({"message": "Invalid user ID"}), 400

        user = db.users.find_one({"_id": oid}, {"password": 0})
        if not user:
            return jsonify({"message": "User not found"}), 404

        return jsonify({"user": parse_doc(user)}), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch user", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  PUT /<user_id> — Update user
# --------------------------------------------------------------------------- #
@users_bp.route("/<user_id>", methods=["PUT"])
@jwt_required()
@role_required("admin")
def update_user(user_id):
    """Update an existing user. Re-hashes password if provided."""
    try:
        oid = validate_objectid(user_id)
        if not oid:
            return jsonify({"message": "Invalid user ID"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        # Validate (update mode)
        is_valid, errors = validate_user_data(data, is_update=True)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        user = db.users.find_one({"_id": oid})
        if not user:
            return jsonify({"message": "User not found"}), 404

        # Check email uniqueness if changed
        if data.get("email"):
            new_email = data["email"].strip().lower()
            existing = db.users.find_one({"email": new_email, "_id": {"$ne": oid}})
            if existing:
                return jsonify({"message": "A user with this email already exists"}), 409

        current_user = get_jwt_identity()
        claims = get_jwt()

        # Build update set
        update_fields = {}
        allowed = ["name", "email", "role", "phone", "is_active"]
        for field in allowed:
            if field in data:
                value = data[field]
                if field == "email":
                    value = value.strip().lower()
                elif field == "name":
                    value = value.strip()
                update_fields[field] = value

        # Hash password if provided
        if data.get("password"):
            update_fields["password"] = generate_password_hash(data["password"])

        update_fields["updated_at"] = datetime.utcnow()

        db.users.update_one({"_id": oid}, {"$set": update_fields})

        # Audit
        log_action(
            user_id=current_user,
            user_name=claims.get("name", ""),
            action=f"Updated user: {user.get('name', '')}",
            ip_address=request.remote_addr or "unknown",
            details=f"Updated fields: {', '.join(k for k in update_fields if k != 'updated_at')}",
        )

        updated_user = db.users.find_one({"_id": oid}, {"password": 0})
        return jsonify({
            "message": "User updated successfully",
            "user": parse_doc(updated_user),
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to update user", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  DELETE /<user_id> — Soft-delete user
# --------------------------------------------------------------------------- #
@users_bp.route("/<user_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_user(user_id):
    """Soft-delete a user by setting is_active=False."""
    try:
        oid = validate_objectid(user_id)
        if not oid:
            return jsonify({"message": "Invalid user ID"}), 400

        user = db.users.find_one({"_id": oid})
        if not user:
            return jsonify({"message": "User not found"}), 404

        current_user = get_jwt_identity()
        claims = get_jwt()

        # Prevent self-deletion
        if str(oid) == current_user:
            return jsonify({"message": "You cannot deactivate your own account"}), 400

        db.users.update_one(
            {"_id": oid},
            {"$set": {
                "is_active": False,
                "updated_at": datetime.utcnow(),
            }},
        )

        # Audit
        log_action(
            user_id=current_user,
            user_name=claims.get("name", ""),
            action=f"Deactivated user: {user.get('name', '')}",
            ip_address=request.remote_addr or "unknown",
            details=f"User email: {user.get('email', '')}",
        )

        return jsonify({"message": "User deactivated successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to deactivate user", "error": str(e)}), 500
