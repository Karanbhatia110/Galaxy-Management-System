"""
Galaxy Construction Management System - Audit Logging
"""
from datetime import datetime
from bson import ObjectId


def log_action(user_id, user_name, action, ip_address="unknown", project_ref=None, details=""):
    """
    Log an action to the audit_logs collection.
    
    Args:
        user_id: The ID of the user performing the action
        user_name: The name of the user
        action: Description of the action (e.g., "Created Project")
        ip_address: The IP address of the request
        project_ref: Optional project ID reference
        details: Optional additional details
    """
    from app.extensions import db

    audit_entry = {
        "user_id": str(user_id) if user_id else None,
        "user_name": user_name or "System",
        "action": action,
        "details": details,
        "timestamp": datetime.utcnow(),
        "ip_address": ip_address,
        "project_ref": str(project_ref) if project_ref else None
    }

    try:
        db.audit_logs.insert_one(audit_entry)
    except Exception as e:
        print(f"Audit logging error: {e}")


def create_notification(user_id, notification_type, title, message, project_id=None):
    """
    Create a notification for a user.
    
    Args:
        user_id: The target user's ID
        notification_type: Type (payment_due, low_inventory, new_expense, new_payment, milestone)
        title: Short notification title
        message: Notification message body
        project_id: Optional related project ID
    """
    from app.extensions import db

    notification = {
        "user_id": str(user_id),
        "type": notification_type,
        "title": title,
        "message": message,
        "project_id": str(project_id) if project_id else None,
        "is_read": False,
        "created_at": datetime.utcnow()
    }

    try:
        db.notifications.insert_one(notification)
    except Exception as e:
        print(f"Notification creation error: {e}")
