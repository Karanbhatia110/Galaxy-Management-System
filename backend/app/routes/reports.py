"""
Galaxy Construction Management System - Reports Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime, timedelta
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid
from app.utils.decorators import role_required

reports_bp = Blueprint("reports", __name__)


def _parse_date_range():
    """Parse start_date and end_date from query parameters."""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    date_filter = {}

    if start_date:
        try:
            date_filter["$gte"] = datetime.fromisoformat(start_date)
        except ValueError:
            return None, "Invalid start_date format. Use ISO format."

    if end_date:
        try:
            date_filter["$lte"] = datetime.fromisoformat(end_date)
        except ValueError:
            return None, "Invalid end_date format. Use ISO format."

    return date_filter, None


@reports_bp.route("/revenue", methods=["GET"])
@jwt_required()
def revenue_report():
    """Revenue report: list of payments with project names, filterable by date and project."""
    try:
        project_id = request.args.get("project_id")
        date_filter, error = _parse_date_range()
        if error:
            return jsonify({"message": error}), 400

        query = {}
        if project_id:
            query["project_id"] = project_id
        if date_filter:
            query["payment_date"] = date_filter

        payments = list(
            db.payments.find(query).sort("payment_date", -1)
        )

        # Enrich with project names
        for payment in payments:
            if payment.get("project_id"):
                pid = validate_objectid(str(payment["project_id"]))
                if pid:
                    project = db.projects.find_one({"_id": pid}, {"project_name": 1, "project_code": 1})
                    if project:
                        payment["project_name"] = project.get("project_name", "Unknown")
                        payment["project_code"] = project.get("project_code", "")

        # Calculate totals
        total_revenue = sum(p.get("amount", 0) for p in payments)

        return jsonify({
            "payments": parse_doc(payments),
            "total_revenue": total_revenue,
            "count": len(payments)
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to generate revenue report", "error": str(e)}), 500


@reports_bp.route("/expenses", methods=["GET"])
@jwt_required()
def expense_report():
    """Expense report: expenses filterable by date range, project, and category."""
    try:
        project_id = request.args.get("project_id")
        category = request.args.get("category")
        date_filter, error = _parse_date_range()
        if error:
            return jsonify({"message": error}), 400

        query = {}
        if project_id:
            query["project_id"] = project_id
        if category:
            query["category"] = category
        if date_filter:
            query["date"] = date_filter

        expenses = list(
            db.expenses.find(query).sort("date", -1)
        )

        # Enrich with project names
        for expense in expenses:
            if expense.get("project_id"):
                pid = validate_objectid(str(expense["project_id"]))
                if pid:
                    project = db.projects.find_one({"_id": pid}, {"project_name": 1, "project_code": 1})
                    if project:
                        expense["project_name"] = project.get("project_name", "Unknown")
                        expense["project_code"] = project.get("project_code", "")

        # Calculate totals
        total_expenses = sum(e.get("amount", 0) for e in expenses)

        # Category breakdown
        category_totals = {}
        for expense in expenses:
            cat = expense.get("category", "uncategorized")
            category_totals[cat] = category_totals.get(cat, 0) + expense.get("amount", 0)

        return jsonify({
            "expenses": parse_doc(expenses),
            "total_expenses": total_expenses,
            "category_breakdown": category_totals,
            "count": len(expenses)
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to generate expense report", "error": str(e)}), 500


@reports_bp.route("/profit", methods=["GET"])
@jwt_required()
def profit_report():
    """Profit report: per-project revenue, expenses, and profit for date range."""
    try:
        date_filter, error = _parse_date_range()
        if error:
            return jsonify({"message": error}), 400

        projects = list(db.projects.find({}, {
            "project_name": 1, "project_code": 1, "status": 1, "contract_value": 1
        }))

        report = []
        total_revenue = 0
        total_expenses = 0

        for project in projects:
            pid = str(project["_id"])

            # Get revenue for this project
            pay_query = {"project_id": pid}
            if date_filter:
                pay_query["payment_date"] = date_filter

            revenue_pipeline = [
                {"$match": pay_query},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            rev_result = list(db.payments.aggregate(revenue_pipeline))
            project_revenue = rev_result[0]["total"] if rev_result else 0

            # Get expenses for this project
            exp_query = {"project_id": pid}
            if date_filter:
                exp_query["date"] = date_filter

            expense_pipeline = [
                {"$match": exp_query},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            exp_result = list(db.expenses.aggregate(expense_pipeline))
            project_expenses = exp_result[0]["total"] if exp_result else 0

            project_profit = project_revenue - project_expenses

            total_revenue += project_revenue
            total_expenses += project_expenses

            report.append({
                "project_id": pid,
                "project_name": project.get("project_name"),
                "project_code": project.get("project_code"),
                "status": project.get("status"),
                "contract_value": project.get("contract_value", 0),
                "revenue": project_revenue,
                "expenses": project_expenses,
                "profit": project_profit,
                "margin": round((project_profit / project_revenue * 100), 2) if project_revenue > 0 else 0
            })

        return jsonify({
            "projects": report,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "total_profit": total_revenue - total_expenses
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to generate profit report", "error": str(e)}), 500


@reports_bp.route("/project-summary", methods=["GET"])
@jwt_required()
def project_summary():
    """Summary of all projects with financial details."""
    try:
        projects = list(db.projects.find().sort("created_at", -1))

        summary = []
        for project in projects:
            pid = str(project["_id"])

            # Total payments received
            rev_result = list(db.payments.aggregate([
                {"$match": {"project_id": pid}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]))
            total_received = rev_result[0]["total"] if rev_result else 0

            # Total expenses
            exp_result = list(db.expenses.aggregate([
                {"$match": {"project_id": pid}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]))
            total_spent = exp_result[0]["total"] if exp_result else 0

            contract_value = project.get("contract_value", 0) or 0
            balance = contract_value - total_received

            # Get client info
            client_name = "N/A"
            if project.get("client_id"):
                cid = validate_objectid(str(project["client_id"]))
                if cid:
                    client = db.users.find_one({"_id": cid}, {"name": 1})
                    if client:
                        client_name = client.get("name", "N/A")

            summary.append({
                "project_id": pid,
                "project_name": project.get("project_name"),
                "project_code": project.get("project_code"),
                "client_name": client_name,
                "location": project.get("location"),
                "status": project.get("status"),
                "start_date": project.get("start_date"),
                "expected_completion_date": project.get("expected_completion_date"),
                "completion_percentage": project.get("completion_percentage", 0),
                "contract_value": contract_value,
                "total_received": total_received,
                "total_expenses": total_spent,
                "balance_due": balance,
                "profit": total_received - total_spent
            })

        return jsonify({
            "projects": parse_doc(summary),
            "total_projects": len(summary)
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to generate project summary", "error": str(e)}), 500


@reports_bp.route("/labour-cost", methods=["GET"])
@jwt_required()
def labour_cost_report():
    """Labour cost report by project and date range."""
    try:
        project_id = request.args.get("project_id")
        date_filter, error = _parse_date_range()
        if error:
            return jsonify({"message": error}), 400

        # Query labour records
        query = {}
        if project_id:
            query["assigned_site"] = project_id

        labour_records = list(db.labour.find(query))

        # Also get labour expenses from expenses collection
        expense_query = {"category": "labour"}
        if project_id:
            expense_query["project_id"] = project_id
        if date_filter:
            expense_query["date"] = date_filter

        labour_expenses = list(db.expenses.find(expense_query).sort("date", -1))

        # Calculate totals
        total_labour_cost = sum(e.get("amount", 0) for e in labour_expenses)

        # Group by project
        project_labour = {}
        for expense in labour_expenses:
            pid = expense.get("project_id", "unassigned")
            if pid not in project_labour:
                project_labour[pid] = {"total": 0, "count": 0}
            project_labour[pid]["total"] += expense.get("amount", 0)
            project_labour[pid]["count"] += 1

        # Enrich with project names
        project_summary = []
        for pid, data in project_labour.items():
            name = "Unassigned"
            oid = validate_objectid(pid)
            if oid:
                proj = db.projects.find_one({"_id": oid}, {"project_name": 1})
                if proj:
                    name = proj.get("project_name", "Unknown")
            project_summary.append({
                "project_id": pid,
                "project_name": name,
                "total_cost": data["total"],
                "entries": data["count"]
            })

        return jsonify({
            "labour_records": parse_doc(labour_records),
            "labour_expenses": parse_doc(labour_expenses),
            "total_labour_cost": total_labour_cost,
            "project_summary": project_summary
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to generate labour cost report", "error": str(e)}), 500


@reports_bp.route("/material-usage", methods=["GET"])
@jwt_required()
def material_usage_report():
    """Material usage report by project."""
    try:
        project_id = request.args.get("project_id")

        query = {}
        if project_id:
            query["project_id"] = project_id

        inventory = list(db.inventory.find(query))

        # Calculate usage stats
        materials = []
        for item in inventory:
            purchased = item.get("quantity_purchased", 0) or 0
            used = item.get("quantity_used", 0) or 0
            remaining = purchased - used
            cost = item.get("purchase_cost", 0) or 0

            # Get project name
            project_name = "Unassigned"
            if item.get("project_id"):
                pid = validate_objectid(str(item["project_id"]))
                if pid:
                    proj = db.projects.find_one({"_id": pid}, {"project_name": 1})
                    if proj:
                        project_name = proj.get("project_name", "Unknown")

            materials.append({
                "material_id": str(item["_id"]),
                "material_name": item.get("material_name"),
                "unit": item.get("unit"),
                "project_id": str(item.get("project_id", "")),
                "project_name": project_name,
                "quantity_purchased": purchased,
                "quantity_used": used,
                "remaining_stock": remaining,
                "purchase_cost": cost,
                "usage_percentage": round((used / purchased * 100), 2) if purchased > 0 else 0,
                "low_stock": remaining <= item.get("low_stock_threshold", 10)
            })

        # Summary by material type
        material_summary = {}
        for mat in materials:
            name = mat["material_name"]
            if name not in material_summary:
                material_summary[name] = {
                    "total_purchased": 0, "total_used": 0,
                    "total_cost": 0
                }
            material_summary[name]["total_purchased"] += mat["quantity_purchased"]
            material_summary[name]["total_used"] += mat["quantity_used"]
            material_summary[name]["total_cost"] += mat["purchase_cost"]

        return jsonify({
            "materials": materials,
            "material_summary": material_summary,
            "total_items": len(materials)
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to generate material usage report", "error": str(e)}), 500


@reports_bp.route("/payment-due", methods=["GET"])
@jwt_required()
def payment_due_report():
    """Upcoming payment due report — projects with remaining balance."""
    try:
        projects = list(db.projects.find(
            {"status": {"$in": ["active", "planning"]}},
            {
                "project_name": 1, "project_code": 1, "client_id": 1,
                "contract_value": 1, "total_received": 1, "status": 1,
                "expected_completion_date": 1
            }
        ).sort("expected_completion_date", 1))

        report = []
        total_pending = 0

        for project in projects:
            contract_value = project.get("contract_value", 0) or 0
            total_received = project.get("total_received", 0) or 0
            remaining = contract_value - total_received

            if remaining <= 0:
                continue

            # Get client info
            client_name = "N/A"
            if project.get("client_id"):
                cid = validate_objectid(str(project["client_id"]))
                if cid:
                    client = db.users.find_one({"_id": cid}, {"name": 1, "email": 1, "phone": 1})
                    if client:
                        client_name = client.get("name", "N/A")

            total_pending += remaining

            report.append({
                "project_id": str(project["_id"]),
                "project_name": project.get("project_name"),
                "project_code": project.get("project_code"),
                "client_name": client_name,
                "contract_value": contract_value,
                "total_received": total_received,
                "remaining_balance": remaining,
                "payment_percentage": round((total_received / contract_value * 100), 2) if contract_value > 0 else 0,
                "expected_completion_date": project.get("expected_completion_date"),
                "status": project.get("status")
            })

        return jsonify({
            "payment_dues": parse_doc(report),
            "total_pending": total_pending,
            "count": len(report)
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to generate payment due report", "error": str(e)}), 500
