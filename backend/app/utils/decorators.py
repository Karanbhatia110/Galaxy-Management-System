"""
Galaxy Construction Management System - Route Decorators
"""
from functools import wraps
from flask import request
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.utils.audit import log_action


def role_required(*roles):
    """
    Decorator to restrict access based on user role.
    Usage: @role_required("admin", "accountant")
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role", "")
            if user_role not in roles:
                return {"message": "Access denied. Insufficient permissions."}, 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper


def audit_log(action_description):
    """
    Decorator to automatically log actions to the audit trail.
    Usage: @audit_log("Created a new project")
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            result = fn(*args, **kwargs)
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                claims = get_jwt()
                user_name = claims.get("name", "Unknown")
                project_ref = kwargs.get("project_id", None)
                ip_address = request.remote_addr or "unknown"

                log_action(
                    user_id=user_id,
                    user_name=user_name,
                    action=action_description,
                    ip_address=ip_address,
                    project_ref=project_ref
                )
            except Exception:
                pass  # Don't fail the request if audit logging fails
            return result
        return decorator
    return wrapper
