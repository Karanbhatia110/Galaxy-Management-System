"""
Galaxy Construction Management System - Labour Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime, timedelta
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid
from app.utils.decorators import role_required
from app.utils.audit import log_action, create_notification
from app.utils.validators import validate_labour_data

labour_bp = Blueprint("labour", __name__)


# ---------------------------------------------------------------------------
# GET / — List all workers (paginated, filterable)
# ---------------------------------------------------------------------------
@labour_bp.route("/", methods=["GET"])
@jwt_required()
def list_workers():
    """List all workers with optional filters for assigned_site and is_active."""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = min(max(1, per_page), 100)
        skip = (max(1, page) - 1) * per_page

        query = {}

        # Filter by assigned_site
        assigned_site = request.args.get("assigned_site")
        if assigned_site:
            query["assigned_site"] = assigned_site

        # Filter by is_active
        is_active = request.args.get("is_active")
        if is_active is not None:
            query["is_active"] = is_active.lower() in ("true", "1", "yes")

        total = db.labour.count_documents(query)
        workers = list(
            db.labour.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(per_page)
        )

        return jsonify({
            "workers": parse_doc(workers),
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "has_next": skip + per_page < total,
                "has_prev": page > 1,
            },
        }), 200

    except Exception as e:
        return jsonify({"message": "Error fetching workers", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST / — Create a new worker
# ---------------------------------------------------------------------------
@labour_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("admin", "site_manager")
def create_worker():
    """Create a new labour/worker record."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        is_valid, errors = validate_labour_data(data)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        user_id = get_jwt_identity()
        claims = get_jwt()

        worker = {
            "worker_name": data["worker_name"],
            "phone": data.get("phone", ""),
            "skill": data.get("skill", ""),
            "daily_wage": float(data["daily_wage"]),
            "assigned_site": data.get("assigned_site", ""),
            "is_active": data.get("is_active", True),
            "attendance": [],
            "payments": [],
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = db.labour.insert_one(worker)
        worker["_id"] = result.inserted_id

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Created Worker",
            ip_address=request.remote_addr or "unknown",
            details=f"Worker: {data['worker_name']}",
        )

        return jsonify({
            "message": "Worker created successfully",
            "worker": parse_doc(worker),
        }), 201

    except Exception as e:
        return jsonify({"message": "Error creating worker", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /<worker_id> — Get worker details with attendance & payment history
# ---------------------------------------------------------------------------
@labour_bp.route("/<worker_id>", methods=["GET"])
@jwt_required()
def get_worker(worker_id):
    """Get a single worker's details including attendance and payment history."""
    try:
        worker_oid = validate_objectid(worker_id)
        if not worker_oid:
            return jsonify({"message": "Invalid worker ID"}), 400

        worker = db.labour.find_one({"_id": worker_oid})
        if not worker:
            return jsonify({"message": "Worker not found"}), 404

        return jsonify({"worker": parse_doc(worker)}), 200

    except Exception as e:
        return jsonify({"message": "Error fetching worker", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# PUT /<worker_id> — Update a worker
# ---------------------------------------------------------------------------
@labour_bp.route("/<worker_id>", methods=["PUT"])
@jwt_required()
@role_required("admin", "site_manager")
def update_worker(worker_id):
    """Update worker information."""
    try:
        worker_oid = validate_objectid(worker_id)
        if not worker_oid:
            return jsonify({"message": "Invalid worker ID"}), 400

        existing = db.labour.find_one({"_id": worker_oid})
        if not existing:
            return jsonify({"message": "Worker not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        is_valid, errors = validate_labour_data(data, is_update=True)
        if not is_valid:
            return jsonify({"message": "Validation failed", "errors": errors}), 400

        allowed_fields = [
            "worker_name", "phone", "skill", "daily_wage",
            "assigned_site", "is_active",
        ]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}

        if not update_data:
            return jsonify({"message": "No valid fields to update"}), 400

        if "daily_wage" in update_data:
            update_data["daily_wage"] = float(update_data["daily_wage"])

        update_data["updated_at"] = datetime.utcnow()

        db.labour.update_one({"_id": worker_oid}, {"$set": update_data})
        updated_worker = db.labour.find_one({"_id": worker_oid})

        return jsonify({
            "message": "Worker updated successfully",
            "worker": parse_doc(updated_worker),
        }), 200

    except Exception as e:
        return jsonify({"message": "Error updating worker", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# DELETE /<worker_id> — Soft-delete a worker
# ---------------------------------------------------------------------------
@labour_bp.route("/<worker_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin", "site_manager")
def delete_worker(worker_id):
    """Soft-delete a worker by setting is_active to False."""
    try:
        worker_oid = validate_objectid(worker_id)
        if not worker_oid:
            return jsonify({"message": "Invalid worker ID"}), 400

        existing = db.labour.find_one({"_id": worker_oid})
        if not existing:
            return jsonify({"message": "Worker not found"}), 404

        db.labour.update_one(
            {"_id": worker_oid},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
        )

        user_id = get_jwt_identity()
        claims = get_jwt()

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Deactivated Worker",
            ip_address=request.remote_addr or "unknown",
            details=f"Worker ID: {worker_id}",
        )

        return jsonify({"message": "Worker deactivated successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Error deleting worker", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST /<worker_id>/attendance — Mark / update attendance
# ---------------------------------------------------------------------------
@labour_bp.route("/<worker_id>/attendance", methods=["POST"])
@jwt_required()
@role_required("admin", "site_manager")
def mark_attendance(worker_id):
    """Mark or update attendance for a worker on a given date."""
    try:
        worker_oid = validate_objectid(worker_id)
        if not worker_oid:
            return jsonify({"message": "Invalid worker ID"}), 400

        worker = db.labour.find_one({"_id": worker_oid})
        if not worker:
            return jsonify({"message": "Worker not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        if not data.get("date"):
            return jsonify({"message": "date is required"}), 400
        if "present" not in data:
            return jsonify({"message": "present (bool) is required"}), 400

        attendance_date = data["date"]
        present = bool(data["present"])
        hours = data.get("hours", 8 if present else 0)

        attendance_record = {
            "date": attendance_date,
            "present": present,
            "hours": float(hours),
            "marked_at": datetime.utcnow(),
        }

        # Try to update an existing record for the same date first
        update_result = db.labour.update_one(
            {"_id": worker_oid, "attendance.date": attendance_date},
            {"$set": {
                "attendance.$.present": present,
                "attendance.$.hours": float(hours),
                "attendance.$.marked_at": datetime.utcnow(),
            }},
        )

        if update_result.matched_count == 0:
            # No existing record for this date — push a new one
            db.labour.update_one(
                {"_id": worker_oid},
                {"$push": {"attendance": attendance_record}},
            )
            message = "Attendance marked successfully"
        else:
            message = "Attendance updated successfully"

        updated_worker = db.labour.find_one({"_id": worker_oid})

        return jsonify({
            "message": message,
            "attendance": parse_doc(attendance_record),
        }), 200

    except Exception as e:
        return jsonify({"message": "Error marking attendance", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# POST /<worker_id>/payment — Record a payment to a worker
# ---------------------------------------------------------------------------
@labour_bp.route("/<worker_id>/payment", methods=["POST"])
@jwt_required()
@role_required("admin", "site_manager")
def record_payment(worker_id):
    """Record a payment made to a worker."""
    try:
        worker_oid = validate_objectid(worker_id)
        if not worker_oid:
            return jsonify({"message": "Invalid worker ID"}), 400

        worker = db.labour.find_one({"_id": worker_oid})
        if not worker:
            return jsonify({"message": "Worker not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"message": "Request body is required"}), 400

        if not data.get("date"):
            return jsonify({"message": "date is required"}), 400
        if not data.get("amount"):
            return jsonify({"message": "amount is required"}), 400
        try:
            amount = float(data["amount"])
            if amount <= 0:
                return jsonify({"message": "amount must be positive"}), 400
        except (ValueError, TypeError):
            return jsonify({"message": "amount must be a number"}), 400

        user_id = get_jwt_identity()
        claims = get_jwt()

        payment_record = {
            "date": data["date"],
            "amount": amount,
            "period_description": data.get("period_description", ""),
            "recorded_by": user_id,
            "recorded_by_name": claims.get("name", "Unknown"),
            "recorded_at": datetime.utcnow(),
        }

        db.labour.update_one(
            {"_id": worker_oid},
            {"$push": {"payments": payment_record}},
        )

        log_action(
            user_id=user_id,
            user_name=claims.get("name", "Unknown"),
            action="Recorded Labour Payment",
            ip_address=request.remote_addr or "unknown",
            details=f"Payment of ₹{amount} to worker {worker.get('worker_name', worker_id)}",
        )

        return jsonify({
            "message": "Payment recorded successfully",
            "payment": parse_doc(payment_record),
        }), 201

    except Exception as e:
        return jsonify({"message": "Error recording payment", "error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /costs — Labour cost report
# ---------------------------------------------------------------------------
@labour_bp.route("/costs", methods=["GET"])
@jwt_required()
def labour_cost_report():
    """
    Labour cost report.
    Query params:
        - project_id: filter by assigned site / project
        - period: daily | weekly | monthly (default: monthly)
    Aggregates daily_wage * attendance-days for each worker.
    """
    try:
        project_id = request.args.get("project_id")
        period = request.args.get("period", "monthly")

        # Determine date range based on period
        now = datetime.utcnow()
        if period == "daily":
            start_date = now.strftime("%Y-%m-%d")
            end_date = start_date
        elif period == "weekly":
            start_dt = now - timedelta(days=now.weekday())  # Monday
            start_date = start_dt.strftime("%Y-%m-%d")
            end_date = now.strftime("%Y-%m-%d")
        else:  # monthly
            start_date = now.strftime("%Y-%m-01")
            end_date = now.strftime("%Y-%m-%d")

        query = {"is_active": True}
        if project_id:
            query["assigned_site"] = project_id

        workers = list(db.labour.find(query))

        report_rows = []
        total_cost = 0.0

        for worker in workers:
            daily_wage = float(worker.get("daily_wage", 0))
            attendance = worker.get("attendance", [])

            # Count present days in the period
            days_present = 0
            total_hours = 0.0
            for entry in attendance:
                entry_date = entry.get("date", "")
                if start_date <= entry_date <= end_date and entry.get("present"):
                    days_present += 1
                    total_hours += float(entry.get("hours", 0))

            cost = daily_wage * days_present

            report_rows.append({
                "worker_id": str(worker["_id"]),
                "worker_name": worker.get("worker_name", ""),
                "daily_wage": daily_wage,
                "days_present": days_present,
                "total_hours": total_hours,
                "cost": round(cost, 2),
            })

            total_cost += cost

        return jsonify({
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "workers": report_rows,
            "total_cost": round(total_cost, 2),
        }), 200

    except Exception as e:
        return jsonify({"message": "Error generating cost report", "error": str(e)}), 500
