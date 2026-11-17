"""
Galaxy Construction Management System - Input Validators
"""
import re
from datetime import datetime


def validate_email(email):
    """Validate email format."""
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validate password strength (min 6 chars)."""
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, ""


def validate_phone(phone):
    """Validate phone number format."""
    if not phone:
        return True  # Phone is optional
    pattern = r'^[+]?[\d\s-]{7,15}$'
    return re.match(pattern, phone) is not None


def validate_project_data(data, is_update=False):
    """Validate project creation/update data."""
    errors = []
    if not is_update:
        required_fields = ["project_name", "project_code", "location", "start_date", "contract_value"]
        for field in required_fields:
            if not data.get(field):
                errors.append(f"{field} is required")

    if data.get("contract_value") is not None:
        try:
            val = float(data["contract_value"])
            if val < 0:
                errors.append("contract_value must be non-negative")
        except (ValueError, TypeError):
            errors.append("contract_value must be a number")

    if data.get("completion_percentage") is not None:
        try:
            val = float(data["completion_percentage"])
            if val < 0 or val > 100:
                errors.append("completion_percentage must be between 0 and 100")
        except (ValueError, TypeError):
            errors.append("completion_percentage must be a number")

    valid_statuses = ["planning", "active", "on_hold", "completed", "cancelled"]
    if data.get("status") and data["status"] not in valid_statuses:
        errors.append(f"status must be one of: {', '.join(valid_statuses)}")

    return len(errors) == 0, errors


def validate_payment_data(data):
    """Validate payment data."""
    errors = []
    if not data.get("amount"):
        errors.append("amount is required")
    elif not isinstance(data["amount"], (int, float)) or data["amount"] <= 0:
        errors.append("amount must be a positive number")

    if not data.get("payment_date"):
        errors.append("payment_date is required")

    valid_methods = ["cash", "cheque", "bank_transfer", "upi", "other"]
    if data.get("payment_method") and data["payment_method"] not in valid_methods:
        errors.append(f"payment_method must be one of: {', '.join(valid_methods)}")

    return len(errors) == 0, errors


def validate_expense_data(data):
    """Validate expense data."""
    errors = []
    if not data.get("amount"):
        errors.append("amount is required")
    elif not isinstance(data["amount"], (int, float)) or data["amount"] <= 0:
        errors.append("amount must be a positive number")

    if not data.get("category"):
        errors.append("category is required")

    valid_categories = [
        "cement", "steel", "sand", "bricks", "labour",
        "electrical", "plumbing", "transportation", "machinery", "miscellaneous"
    ]
    if data.get("category") and data["category"] not in valid_categories:
        errors.append(f"category must be one of: {', '.join(valid_categories)}")

    if not data.get("date"):
        errors.append("date is required")

    return len(errors) == 0, errors


def validate_user_data(data, is_update=False):
    """Validate user creation/update data."""
    errors = []
    if not is_update:
        required_fields = ["name", "email", "password", "role"]
        for field in required_fields:
            if not data.get(field):
                errors.append(f"{field} is required")

    if data.get("email") and not validate_email(data["email"]):
        errors.append("Invalid email format")

    if data.get("password"):
        is_valid, msg = validate_password(data["password"])
        if not is_valid:
            errors.append(msg)

    valid_roles = ["admin", "site_manager", "accountant", "client"]
    if data.get("role") and data["role"] not in valid_roles:
        errors.append(f"role must be one of: {', '.join(valid_roles)}")

    if data.get("phone") and not validate_phone(data["phone"]):
        errors.append("Invalid phone number format")

    return len(errors) == 0, errors


def validate_labour_data(data, is_update=False):
    """Validate labour/worker data."""
    errors = []
    if not is_update:
        if not data.get("worker_name"):
            errors.append("worker_name is required")
        if not data.get("daily_wage"):
            errors.append("daily_wage is required")

    if data.get("daily_wage") is not None:
        try:
            val = float(data["daily_wage"])
            if val < 0:
                errors.append("daily_wage must be non-negative")
        except (ValueError, TypeError):
            errors.append("daily_wage must be a number")

    return len(errors) == 0, errors


def validate_inventory_data(data, is_update=False):
    """Validate inventory data."""
    errors = []
    if not is_update:
        if not data.get("material_name"):
            errors.append("material_name is required")

    for field in ["quantity_purchased", "quantity_used", "purchase_cost", "low_stock_threshold"]:
        if data.get(field) is not None:
            try:
                val = float(data[field])
                if val < 0:
                    errors.append(f"{field} must be non-negative")
            except (ValueError, TypeError):
                errors.append(f"{field} must be a number")

    return len(errors) == 0, errors


def validate_equipment_data(data, is_update=False):
    """Validate equipment data."""
    errors = []
    if not is_update:
        if not data.get("equipment_name"):
            errors.append("equipment_name is required")
        if not data.get("equipment_type"):
            errors.append("equipment_type is required")

    valid_statuses = ["available", "in_use", "under_maintenance"]
    if data.get("status") and data["status"] not in valid_statuses:
        errors.append(f"status must be one of: {', '.join(valid_statuses)}")

    if data.get("rental_cost") is not None:
        try:
            val = float(data["rental_cost"])
            if val < 0:
                errors.append("rental_cost must be non-negative")
        except (ValueError, TypeError):
            errors.append("rental_cost must be a number")

    return len(errors) == 0, errors


def validate_daily_report_data(data):
    """Validate daily report data."""
    errors = []
    if not data.get("date"):
        errors.append("date is required")
    if not data.get("work_completed"):
        errors.append("work_completed is required")

    if data.get("labour_count") is not None:
        try:
            val = int(data["labour_count"])
            if val < 0:
                errors.append("labour_count must be non-negative")
        except (ValueError, TypeError):
            errors.append("labour_count must be an integer")

    return len(errors) == 0, errors
