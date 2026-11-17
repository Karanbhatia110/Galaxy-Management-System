"""
Galaxy Construction Management System - Dashboard Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime, timedelta
from app.extensions import db
from app.utils.helpers import parse_doc, validate_objectid

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/", methods=["GET"])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics. Role-based filtering applied."""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role", "")

        # Role-based project filtering
        project_filter = {}
        if role == "client":
            project_filter["client_id"] = current_user_id
        elif role == "site_manager":
            project_filter["site_manager_id"] = current_user_id
        elif role == "accountant":
            # Accountant sees projects they've worked on (created payments or expenses)
            accountant_project_ids = set()
            for pay in db.payments.find({"created_by": current_user_id}, {"project_id": 1}):
                accountant_project_ids.add(pay["project_id"])
            for exp in db.expenses.find({"created_by": current_user_id}, {"project_id": 1}):
                accountant_project_ids.add(exp["project_id"])
            if accountant_project_ids:
                project_filter["_id"] = {"$in": [ObjectId(pid) for pid in accountant_project_ids]}
            else:
                project_filter["_id"] = {"$in": []}

        # --- Project counts ---
        total_active_projects = db.projects.count_documents(
            {**project_filter, "status": "active"}
        )
        total_completed_projects = db.projects.count_documents(
            {**project_filter, "status": "completed"}
        )

        # --- Financial visibility flags ---
        # Admin: sees everything (revenue, expenses, profit, pending)
        # Accountant: sees ONLY revenue for their assigned projects
        # Others: no financial data
        show_admin_financials = role == "admin"
        show_accountant_revenue = role == "accountant"

        total_revenue = 0
        total_expenses = 0
        total_profit = 0
        pending_payments = 0

        if show_admin_financials:
            # Admin sees all financial data across all projects
            revenue_result = list(db.payments.aggregate([
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]))
            total_revenue = revenue_result[0]["total"] if revenue_result else 0

            expense_result = list(db.expenses.aggregate([
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]))
            total_expenses = expense_result[0]["total"] if expense_result else 0

            total_profit = total_revenue - total_expenses

            # Pending payments
            active_projects = list(db.projects.find(
                {"status": {"$in": ["active", "planning", "on_hold"]}},
                {"_id": 1, "contract_value": 1}
            ))
            for project in active_projects:
                contract_val = project.get("contract_value", 0) or 0
                pay_result = list(db.payments.aggregate([
                    {"$match": {"project_id": str(project["_id"])}},
                    {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
                ]))
                received = pay_result[0]["total"] if pay_result else 0
                pending_payments += (contract_val - received)

        elif show_accountant_revenue:
            # Accountant sees ONLY revenue for their assigned projects
            accountant_project_ids_list = list(accountant_project_ids) if 'accountant_project_ids' in dir() else []
            if not accountant_project_ids_list:
                # Re-fetch if needed
                accountant_project_ids_list = set()
                for pay in db.payments.find({"created_by": current_user_id}, {"project_id": 1}):
                    accountant_project_ids_list.add(pay["project_id"])
                for exp in db.expenses.find({"created_by": current_user_id}, {"project_id": 1}):
                    accountant_project_ids_list.add(exp["project_id"])
                accountant_project_ids_list = list(accountant_project_ids_list)

            if accountant_project_ids_list:
                revenue_result = list(db.payments.aggregate([
                    {"$match": {"project_id": {"$in": accountant_project_ids_list}}},
                    {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
                ]))
                total_revenue = revenue_result[0]["total"] if revenue_result else 0

        # --- Recent activities (admin only) ---
        if role == "admin":
            recent_activities = list(
                db.audit_logs.find()
                .sort("timestamp", -1)
                .limit(10)
            )
        else:
            recent_activities = []

        # --- Upcoming due dates ---
        now = datetime.utcnow()
        thirty_days = now + timedelta(days=30)
        upcoming_due_dates = list(
            db.projects.find(
                {
                    **project_filter,
                    "expected_completion_date": {"$gte": now, "$lte": thirty_days},
                    "status": {"$in": ["active", "planning"]}
                },
                {
                    "project_name": 1, "project_code": 1,
                    "expected_completion_date": 1, "completion_percentage": 1,
                    "status": 1
                }
            ).sort("expected_completion_date", 1)
        )

        return jsonify({
            "total_active_projects": total_active_projects,
            "total_completed_projects": total_completed_projects,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "total_profit": total_profit,
            "pending_payments": pending_payments,
            "show_admin_financials": show_admin_financials,
            "show_accountant_revenue": show_accountant_revenue,
            "recent_activities": parse_doc(recent_activities),
            "upcoming_due_dates": parse_doc(upcoming_due_dates)
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch dashboard stats", "error": str(e)}), 500


@dashboard_bp.route("/charts", methods=["GET"])
@jwt_required()
def get_chart_data():
    """Get chart data with role-based filtering."""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role", "")

        now = datetime.utcnow()
        twelve_months_ago = now - timedelta(days=365)

        show_admin_financials = role == "admin"
        show_accountant_revenue = role == "accountant"

        # Role-based project filter
        if role == "client":
            project_filter = {"client_id": current_user_id}
        elif role == "site_manager":
            project_filter = {"site_manager_id": current_user_id}
        elif role == "accountant":
            accountant_project_ids = set()
            for pay in db.payments.find({"created_by": current_user_id}, {"project_id": 1}):
                accountant_project_ids.add(pay["project_id"])
            for exp in db.expenses.find({"created_by": current_user_id}, {"project_id": 1}):
                accountant_project_ids.add(exp["project_id"])
            if accountant_project_ids:
                project_filter = {"_id": {"$in": [ObjectId(pid) for pid in accountant_project_ids]}}
            else:
                project_filter = {"_id": {"$in": []}}
        else:
            project_filter = {}

        formatted_revenue = []
        formatted_expenses = []
        profit_trend = []
        formatted_categories = []

        if show_admin_financials:
            # Admin sees all financial charts
            payment_match = {"payment_date": {"$gte": twelve_months_ago}}
            expense_match = {"date": {"$gte": twelve_months_ago}}

            monthly_revenue = list(db.payments.aggregate([
                {"$match": payment_match},
                {"$group": {
                    "_id": {"year": {"$year": "$payment_date"}, "month": {"$month": "$payment_date"}},
                    "total": {"$sum": "$amount"}
                }},
                {"$sort": {"_id.year": 1, "_id.month": 1}}
            ]))

            monthly_expenses = list(db.expenses.aggregate([
                {"$match": expense_match},
                {"$group": {
                    "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}},
                    "total": {"$sum": "$amount"}
                }},
                {"$sort": {"_id.year": 1, "_id.month": 1}}
            ]))

            revenue_map = {f"{i['_id']['year']}-{i['_id']['month']:02d}": i["total"] for i in monthly_revenue}
            expense_map = {f"{i['_id']['year']}-{i['_id']['month']:02d}": i["total"] for i in monthly_expenses}

            for month_key in sorted(set(list(revenue_map.keys()) + list(expense_map.keys()))):
                rev = revenue_map.get(month_key, 0)
                exp = expense_map.get(month_key, 0)
                profit_trend.append({"month": month_key, "revenue": rev, "expenses": exp, "profit": rev - exp})

            formatted_revenue = [
                {"month": f"{i['_id']['year']}-{i['_id']['month']:02d}", "total": i["total"]} for i in monthly_revenue
            ]
            formatted_expenses = [
                {"month": f"{i['_id']['year']}-{i['_id']['month']:02d}", "total": i["total"]} for i in monthly_expenses
            ]

            category_expenses = list(db.expenses.aggregate([
                {"$match": expense_match},
                {"$group": {"_id": "$category", "amount": {"$sum": "$amount"}}},
                {"$sort": {"amount": -1}}
            ]))
            formatted_categories = [
                {"category": i["_id"].replace("_", " ").title() if i["_id"] else "Other", "amount": i["amount"]}
                for i in category_expenses
            ]

        elif show_accountant_revenue:
            # Accountant sees only revenue chart scoped to their projects
            acc_pids = list(accountant_project_ids) if accountant_project_ids else []
            if acc_pids:
                payment_match = {
                    "project_id": {"$in": acc_pids},
                    "payment_date": {"$gte": twelve_months_ago}
                }
                monthly_revenue = list(db.payments.aggregate([
                    {"$match": payment_match},
                    {"$group": {
                        "_id": {"year": {"$year": "$payment_date"}, "month": {"$month": "$payment_date"}},
                        "total": {"$sum": "$amount"}
                    }},
                    {"$sort": {"_id.year": 1, "_id.month": 1}}
                ]))
                formatted_revenue = [
                    {"month": f"{i['_id']['year']}-{i['_id']['month']:02d}", "total": i["total"]}
                    for i in monthly_revenue
                ]

        # --- Project status distribution (visible to all roles, scoped by role) ---
        status_distribution = list(db.projects.aggregate([
            {"$match": project_filter},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]))
        formatted_status = [{"status": i["_id"], "count": i["count"]} for i in status_distribution]

        return jsonify({
            "monthly_revenue": formatted_revenue,
            "monthly_expenses": formatted_expenses,
            "profit_trend": profit_trend,
            "project_status_distribution": formatted_status,
            "category_expenses": formatted_categories,
            "show_admin_financials": show_admin_financials,
            "show_accountant_revenue": show_accountant_revenue
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch chart data", "error": str(e)}), 500


