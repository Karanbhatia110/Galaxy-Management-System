"""
Galaxy Construction Management System - Auth Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt,
    create_access_token, create_refresh_token
)
from bson import ObjectId
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db, limiter
from app.utils.helpers import parse_doc
from app.utils.audit import log_action

auth_bp = Blueprint("auth", __name__)


# --------------------------------------------------------------------------- #
#  POST /login
# --------------------------------------------------------------------------- #
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5/minute")
def login():
    """Authenticate user with email and password."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"message": "Email and password are required"}), 400

        # Look up user
        user = db.users.find_one({"email": email})
        if not user:
            return jsonify({"message": "Invalid email or password"}), 401

        # Check active status
        if not user.get("is_active", True):
            return jsonify({"message": "Account is deactivated. Contact admin."}), 403

        # Verify password
        if not check_password_hash(user["password"], password):
            return jsonify({"message": "Invalid email or password"}), 401

        # Build identity & claims
        user_id = str(user["_id"])
        additional_claims = {
            "role": user.get("role", ""),
            "name": user.get("name", ""),
        }

        access_token = create_access_token(
            identity=user_id,
            additional_claims=additional_claims,
        )
        refresh_token = create_refresh_token(
            identity=user_id,
            additional_claims=additional_claims,
        )

        # Audit
        log_action(
            user_id=user_id,
            user_name=user.get("name", ""),
            action="User logged in",
            ip_address=request.remote_addr or "unknown",
        )

        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_id,
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "role": user.get("role", ""),
            },
        }), 200

    except Exception as e:
        return jsonify({"message": "Login failed", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  POST /refresh
# --------------------------------------------------------------------------- #
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using a valid refresh token."""
    try:
        current_user = get_jwt_identity()
        claims = get_jwt()

        additional_claims = {
            "role": claims.get("role", ""),
            "name": claims.get("name", ""),
        }

        new_access_token = create_access_token(
            identity=current_user,
            additional_claims=additional_claims,
        )

        return jsonify({
            "access_token": new_access_token,
        }), 200

    except Exception as e:
        return jsonify({"message": "Token refresh failed", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  POST /logout
# --------------------------------------------------------------------------- #
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Revoke the current access token by adding its JTI to the blocklist."""
    try:
        jti = get_jwt()["jti"]
        current_user = get_jwt_identity()

        db.token_blocklist.insert_one({
            "jti": jti,
            "user_id": current_user,
            "created_at": datetime.utcnow(),
        })

        return jsonify({"message": "Successfully logged out"}), 200

    except Exception as e:
        return jsonify({"message": "Logout failed", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  GET /me
# --------------------------------------------------------------------------- #
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """Return the current user's profile from JWT identity."""
    try:
        current_user = get_jwt_identity()

        user = db.users.find_one(
            {"_id": ObjectId(current_user)},
            {"password": 0},  # exclude password
        )
        if not user:
            return jsonify({"message": "User not found"}), 404

        return jsonify({"user": parse_doc(user)}), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch profile", "error": str(e)}), 500


# --------------------------------------------------------------------------- #
#  PUT /change-password
# --------------------------------------------------------------------------- #
@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    """Change password for the currently authenticated user."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")

        if not current_password or not new_password:
            return jsonify({"message": "current_password and new_password are required"}), 400

        if len(new_password) < 6:
            return jsonify({"message": "New password must be at least 6 characters"}), 400

        current_user = get_jwt_identity()
        claims = get_jwt()

        user = db.users.find_one({"_id": ObjectId(current_user)})
        if not user:
            return jsonify({"message": "User not found"}), 404

        # Verify current password
        if not check_password_hash(user["password"], current_password):
            return jsonify({"message": "Current password is incorrect"}), 401

        # Update password
        hashed = generate_password_hash(new_password)
        db.users.update_one(
            {"_id": ObjectId(current_user)},
            {"$set": {
                "password": hashed,
                "updated_at": datetime.utcnow(),
            }},
        )

        # Audit
        log_action(
            user_id=current_user,
            user_name=claims.get("name", ""),
            action="Changed password",
            ip_address=request.remote_addr or "unknown",
        )

        return jsonify({"message": "Password changed successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Password change failed", "error": str(e)}), 500
