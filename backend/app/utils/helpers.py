"""
Galaxy Construction Management System - Helper Utilities
"""
from bson import ObjectId
from datetime import datetime
import json
import math


class MongoJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for MongoDB documents."""
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def parse_doc(doc):
    """Convert a MongoDB document to a JSON-serializable dict."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [parse_doc(d) for d in doc]
    if isinstance(doc, dict):
        parsed = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                parsed[key] = str(value)
            elif isinstance(value, datetime):
                parsed[key] = value.isoformat()
            elif isinstance(value, dict):
                parsed[key] = parse_doc(value)
            elif isinstance(value, list):
                parsed[key] = [parse_doc(v) if isinstance(v, (dict, list)) else
                               str(v) if isinstance(v, ObjectId) else
                               v.isoformat() if isinstance(v, datetime) else v
                               for v in value]
            else:
                parsed[key] = value
        return parsed
    return doc


def paginate(query_cursor, page=1, per_page=20):
    """
    Paginate a MongoDB cursor.
    Returns: (items, pagination_info)
    """
    page = max(1, page)
    per_page = min(max(1, per_page), 100)
    skip = (page - 1) * per_page

    items = list(query_cursor.skip(skip).limit(per_page))

    return items, {
        "page": page,
        "per_page": per_page,
        "has_next": len(items) == per_page,
        "has_prev": page > 1
    }


def paginate_aggregation(collection, pipeline, page=1, per_page=20):
    """
    Paginate a MongoDB aggregation pipeline.
    Returns: (items, pagination_info)
    """
    page = max(1, page)
    per_page = min(max(1, per_page), 100)
    skip = (page - 1) * per_page

    # Count total
    count_pipeline = pipeline + [{"$count": "total"}]
    count_result = list(collection.aggregate(count_pipeline))
    total = count_result[0]["total"] if count_result else 0

    # Get items
    items_pipeline = pipeline + [{"$skip": skip}, {"$limit": per_page}]
    items = list(collection.aggregate(items_pipeline))

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return items, {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }


def validate_objectid(id_string):
    """Validate and return an ObjectId, or None if invalid."""
    try:
        return ObjectId(id_string)
    except Exception:
        return None


def allowed_file(filename, allowed_extensions=None):
    """Check if a file extension is allowed."""
    if allowed_extensions is None:
        allowed_extensions = {"pdf", "jpg", "jpeg", "png", "docx"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def format_currency(amount):
    """Format amount as currency string."""
    if amount is None:
        return "₹0.00"
    return f"₹{amount:,.2f}"


def get_current_timestamp():
    """Get current UTC timestamp."""
    return datetime.utcnow()
