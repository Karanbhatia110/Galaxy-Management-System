"""
Galaxy Construction Management System - Database Seeder
"""
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from bson import ObjectId
import random
import os


def seed_database(mongo_uri=None, db_name=None):
    """
    Seed the database with users and sample data for testing role-based access.
    """
    mongo_uri = mongo_uri or os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
    db_name = db_name or os.environ.get("MONGO_DB_NAME", "galaxy_construction")

    client = MongoClient(mongo_uri)
    db = client[db_name]

    print("Starting database seeding...")
    print(f"   Database: {db_name}")

    # ──────────────────────────────────────────────
    # 1. Clear all collections
    # ──────────────────────────────────────────────
    collections = [
        "users", "projects", "payments", "expenses", "daily_reports",
        "labour", "inventory", "equipment", "notifications",
        "audit_logs", "token_blocklist"
    ]
    for col in collections:
        db[col].drop()
    print("Cleared all collections")

    # ──────────────────────────────────────────────
    # 2. Create users (same credentials as before)
    # ──────────────────────────────────────────────
    now = datetime.utcnow()

    admin_id = ObjectId()
    manager_id = ObjectId()
    accountant_id = ObjectId()
    client_id = ObjectId()

    users = [
        {
            "_id": admin_id,
            "name": "Admin User",
            "email": "admin@galaxy.com",
            "password": generate_password_hash("Admin@123"),
            "role": "admin",
            "phone": "+91 9876543210",
            "company": "Galaxy Constructions Pvt. Ltd.",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": manager_id,
            "name": "Rajesh Kumar",
            "email": "rajesh@galaxy.com",
            "password": generate_password_hash("Manager@123"),
            "role": "site_manager",
            "phone": "+91 9876543211",
            "company": "Galaxy Constructions Pvt. Ltd.",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": accountant_id,
            "name": "Priya Sharma",
            "email": "priya@galaxy.com",
            "password": generate_password_hash("Account@123"),
            "role": "accountant",
            "phone": "+91 9876543212",
            "company": "Galaxy Constructions Pvt. Ltd.",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": client_id,
            "name": "Vikram Patel",
            "email": "vikram@client.com",
            "password": generate_password_hash("Client@123"),
            "role": "client",
            "phone": "+91 9876543213",
            "company": "Patel Industries",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    db.users.insert_many(users)
    print(f"Created {len(users)} users")

    # ──────────────────────────────────────────────
    # 3. Create projects
    #    - Project 1 & 2: assigned to manager (Rajesh), client (Vikram)
    #    - Project 3: completed project
    # ──────────────────────────────────────────────
    project1_id = ObjectId()
    project2_id = ObjectId()
    project3_id = ObjectId()

    projects = [
        {
            "_id": project1_id,
            "project_name": "Lotus Residency - Phase 1",
            "project_code": "GC-2025-001",
            "description": "Premium residential apartment complex with 120 flats, "
                           "clubhouse, swimming pool, and landscaped gardens.",
            "client_id": str(client_id),
            "location": "Whitefield, Bangalore, Karnataka",
            "start_date": datetime(2025, 1, 15),
            "expected_completion_date": now + timedelta(days=45),
            "contract_value": 15000000.00,
            "total_received": 9500000.00,
            "status": "active",
            "completion_percentage": 65,
            "site_manager_id": str(manager_id),
            "created_by": str(admin_id),
            "created_at": datetime(2025, 1, 10),
            "updated_at": now
        },
        {
            "_id": project2_id,
            "project_name": "Greenfield Commercial Plaza",
            "project_code": "GC-2025-002",
            "description": "Modern commercial complex with 50 office spaces, food court, "
                           "and multi-level parking.",
            "client_id": str(client_id),
            "location": "Andheri East, Mumbai, Maharashtra",
            "start_date": datetime(2025, 3, 1),
            "expected_completion_date": now + timedelta(days=120),
            "contract_value": 25000000.00,
            "total_received": 10000000.00,
            "status": "active",
            "completion_percentage": 40,
            "site_manager_id": str(manager_id),
            "created_by": str(admin_id),
            "created_at": datetime(2025, 2, 20),
            "updated_at": now
        },
        {
            "_id": project3_id,
            "project_name": "Sunrise Villa Township",
            "project_code": "GC-2024-003",
            "description": "Gated villa township with 30 independent villas, "
                           "community center, and sports complex.",
            "client_id": str(client_id),
            "location": "Adyar, Chennai, Tamil Nadu",
            "start_date": datetime(2024, 6, 1),
            "expected_completion_date": datetime(2025, 12, 31),
            "contract_value": 18000000.00,
            "total_received": 18000000.00,
            "status": "completed",
            "completion_percentage": 100,
            "site_manager_id": str(manager_id),
            "created_by": str(admin_id),
            "created_at": datetime(2024, 5, 15),
            "updated_at": now
        }
    ]
    db.projects.insert_many(projects)
    print(f"Created {len(projects)} projects")

    # ──────────────────────────────────────────────
    # 4. Create payments
    #    created_by = accountant_id (so accountant sees these projects)
    # ──────────────────────────────────────────────
    payment_methods = ["bank_transfer", "cheque", "upi", "cash"]
    payments = []

    # Payments for Project 1 (accountant created)
    for amount, date_str, remark in [
        (3000000, "2025-02-01", "Advance payment"),
        (2500000, "2025-04-15", "First milestone - Foundation complete"),
        (2000000, "2025-07-01", "Second milestone - Structure complete"),
        (2000000, "2025-10-15", "Third milestone - Interior work"),
    ]:
        payments.append({
            "_id": ObjectId(),
            "project_id": str(project1_id),
            "amount": amount,
            "payment_date": datetime.fromisoformat(date_str),
            "payment_method": random.choice(payment_methods),
            "transaction_reference": f"TXN-{random.randint(100000, 999999)}",
            "remarks": remark,
            "received_by": str(accountant_id),
            "created_by": str(accountant_id),
            "created_at": datetime.fromisoformat(date_str),
            "updated_at": datetime.fromisoformat(date_str)
        })

    # Payments for Project 2 (accountant created)
    for amount, date_str, remark in [
        (5000000, "2025-03-15", "Advance payment"),
        (3000000, "2025-06-01", "Foundation milestone"),
        (2000000, "2025-09-01", "Structural work milestone"),
    ]:
        payments.append({
            "_id": ObjectId(),
            "project_id": str(project2_id),
            "amount": amount,
            "payment_date": datetime.fromisoformat(date_str),
            "payment_method": random.choice(payment_methods),
            "transaction_reference": f"TXN-{random.randint(100000, 999999)}",
            "remarks": remark,
            "received_by": str(accountant_id),
            "created_by": str(accountant_id),
            "created_at": datetime.fromisoformat(date_str),
            "updated_at": datetime.fromisoformat(date_str)
        })

    # Payments for Project 3 (completed - accountant created)
    for amount, date_str, remark in [
        (5000000, "2024-06-15", "Advance payment"),
        (4000000, "2024-09-01", "Progress payment 1"),
        (4000000, "2025-01-15", "Progress payment 2"),
        (3000000, "2025-05-01", "Progress payment 3"),
        (2000000, "2025-08-01", "Final payment"),
    ]:
        payments.append({
            "_id": ObjectId(),
            "project_id": str(project3_id),
            "amount": amount,
            "payment_date": datetime.fromisoformat(date_str),
            "payment_method": random.choice(payment_methods),
            "transaction_reference": f"TXN-{random.randint(100000, 999999)}",
            "remarks": remark,
            "received_by": str(accountant_id),
            "created_by": str(accountant_id),
            "created_at": datetime.fromisoformat(date_str),
            "updated_at": datetime.fromisoformat(date_str)
        })

    db.payments.insert_many(payments)
    print(f"Created {len(payments)} payments")

    # ──────────────────────────────────────────────
    # 5. Create expenses
    #    created_by = accountant_id (so accountant sees these projects)
    # ──────────────────────────────────────────────
    categories = ["cement", "steel", "sand", "bricks", "labour",
                   "electrical", "plumbing", "transportation", "machinery", "miscellaneous"]
    vendors = [
        "UltraTech Cement Ltd.", "Tata Steel Dealers", "Ambuja Aggregates",
        "Shankar Bricks Works", "Metro Electricals", "Sharma Plumbing Services",
        "Krishna Transport Co.", "Mahindra Equipment Rentals",
        "RK Building Materials", "Ganesh Hardware & Paints"
    ]

    expenses = []
    for project_id_val in [project1_id, project2_id, project3_id]:
        num_expenses = random.randint(8, 12)
        for i in range(num_expenses):
            cat = random.choice(categories)
            days_ago = random.randint(10, 300)
            expense_date = now - timedelta(days=days_ago)

            expenses.append({
                "_id": ObjectId(),
                "project_id": str(project_id_val),
                "category": cat,
                "amount": round(random.uniform(15000, 500000), 2),
                "vendor": random.choice(vendors),
                "description": f"{cat.replace('_', ' ').title()} supply for site work",
                "notes": f"Invoice #{random.randint(1000, 9999)} - {cat} procurement",
                "date": expense_date,
                "approved_by": str(admin_id),
                "created_by": str(accountant_id),
                "created_at": expense_date,
                "updated_at": expense_date
            })

    db.expenses.insert_many(expenses)
    print(f"Created {len(expenses)} expenses")

    # ──────────────────────────────────────────────
    # 6. Create daily reports (submitted by site manager)
    # ──────────────────────────────────────────────
    weather_conditions = ["sunny", "cloudy", "rainy", "partly_cloudy"]
    work_items = [
        "Foundation excavation and PCC work",
        "Column reinforcement and shuttering",
        "Slab casting for 3rd floor",
        "Brick masonry work on east wing",
        "Electrical conduit laying - Phase 2",
        "Plumbing rough-in for floors 1-3",
        "Plastering work on exterior walls",
        "Waterproofing of basement level",
        "Tile laying in common areas",
        "Window frame installation",
    ]

    daily_reports = []
    for project_id_val in [project1_id, project2_id]:
        for i in range(15):
            days_ago = i * 2 + random.randint(0, 1)
            report_date = now - timedelta(days=days_ago)

            daily_reports.append({
                "_id": ObjectId(),
                "project_id": str(project_id_val),
                "date": report_date,
                "weather": random.choice(weather_conditions),
                "work_completed": random.choice(work_items),
                "labour_count": random.randint(15, 60),
                "issues": random.choice([
                    "", "", "",
                    "Material delivery delayed by 2 hours",
                    "Light rainfall in afternoon, work paused briefly",
                    "Minor equipment malfunction, resolved on site"
                ]),
                "notes": random.choice([
                    "Work progressing as per schedule",
                    "Ahead of schedule on current phase",
                    "Quality inspection passed",
                    ""
                ]),
                "submitted_by": str(manager_id),
                "created_at": report_date,
                "updated_at": report_date
            })

    db.daily_reports.insert_many(daily_reports)
    print(f"Created {len(daily_reports)} daily reports")

    # ──────────────────────────────────────────────
    # 7. Create labour records
    # ──────────────────────────────────────────────
    worker_names = [
        "Ramesh Yadav", "Suresh Mandal", "Mohan Das", "Anil Kumar",
        "Deepak Singh", "Raju Prasad", "Manoj Sharma", "Ganesh Patel",
        "Sanjay Verma", "Vijay Chauhan", "Prakash Jha", "Sunil Thakur"
    ]
    skills = ["mason", "carpenter", "electrician", "plumber", "painter",
              "welder", "helper", "machine_operator"]

    labour_records = []
    for i, name in enumerate(worker_names):
        skill = skills[i % len(skills)]
        daily_wage = {
            "mason": 800, "carpenter": 750, "electrician": 900,
            "plumber": 850, "painter": 700, "welder": 950,
            "helper": 500, "machine_operator": 1000
        }.get(skill, 600)

        assigned_project = random.choice([project1_id, project2_id])

        labour_records.append({
            "_id": ObjectId(),
            "worker_name": name,
            "phone": f"+91 {random.randint(7000000000, 9999999999)}",
            "skill": skill,
            "daily_wage": daily_wage,
            "assigned_site": str(assigned_project),
            "status": random.choice(["active", "active", "active", "inactive"]),
            "joined_date": now - timedelta(days=random.randint(30, 365)),
            "aadhar_number": f"{random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
            "emergency_contact": f"+91 {random.randint(7000000000, 9999999999)}",
            "created_at": now - timedelta(days=random.randint(30, 365)),
            "updated_at": now
        })

    db.labour.insert_many(labour_records)
    print(f"Created {len(labour_records)} labour records")

    # ──────────────────────────────────────────────
    # 8. Create inventory records
    # ──────────────────────────────────────────────
    materials = [
        ("OPC 53 Grade Cement", "bags", 500, 420, 380, 50),
        ("TMT Steel Bars - 12mm", "tonnes", 25, 18, 75000, 5),
        ("TMT Steel Bars - 16mm", "tonnes", 15, 10, 78000, 3),
        ("River Sand (Fine)", "cubic_ft", 2000, 1600, 65, 200),
        ("M-Sand", "cubic_ft", 1500, 1100, 55, 150),
        ("Red Clay Bricks", "units", 50000, 38000, 8, 5000),
        ("AAC Blocks - 6 inch", "units", 10000, 7500, 55, 1000),
        ("20mm Coarse Aggregate", "cubic_ft", 1000, 750, 45, 100),
        ("Electrical Wires - 2.5mm", "metres", 5000, 3500, 18, 500),
        ("PVC Pipes - 4 inch", "metres", 500, 320, 120, 50),
        ("Plywood - 18mm", "sheets", 200, 140, 1800, 20),
        ("White Cement", "bags", 100, 65, 550, 15),
    ]

    inventory_records = []
    for mat_name, unit, purchased, used, cost, threshold in materials:
        assigned_project = random.choice([project1_id, project2_id])
        inventory_records.append({
            "_id": ObjectId(),
            "material_name": mat_name,
            "unit": unit,
            "quantity_purchased": purchased,
            "quantity_used": used,
            "purchase_cost": cost * purchased,
            "unit_price": cost,
            "project_id": str(assigned_project),
            "supplier": random.choice(vendors[:5]),
            "low_stock_threshold": threshold,
            "last_restocked": now - timedelta(days=random.randint(5, 30)),
            "created_at": now - timedelta(days=random.randint(60, 200)),
            "updated_at": now
        })

    db.inventory.insert_many(inventory_records)
    print(f"Created {len(inventory_records)} inventory records")

    # ──────────────────────────────────────────────
    # 9. Create equipment records
    # ──────────────────────────────────────────────
    equipment_list = [
        ("JCB 3DX Backhoe Loader", "excavator", 5000),
        ("Tower Crane - TC 6015", "crane", 15000),
        ("Concrete Mixer - 10/7 CFT", "mixer", 1500),
        ("Bar Bending Machine", "bending_machine", 800),
        ("Plate Compactor", "compactor", 1200),
        ("Concrete Vibrator - Needle Type", "vibrator", 600),
        ("Scaffolding Set - 50 frames", "scaffolding", 2000),
        ("Transit Mixer - 6 Cubic Metre", "mixer", 8000),
    ]

    equipment_records = []
    for eq_name, eq_type, rental_cost in equipment_list:
        assigned_project = random.choice([project1_id, project2_id])
        equipment_records.append({
            "_id": ObjectId(),
            "equipment_name": eq_name,
            "equipment_type": eq_type,
            "serial_number": f"EQ-{random.randint(10000, 99999)}",
            "status": random.choice(["available", "in_use", "in_use", "under_maintenance"]),
            "assigned_site": str(assigned_project),
            "rental_cost": rental_cost,
            "rental_unit": "per_day",
            "owner": random.choice(["owned", "rented"]),
            "last_maintenance": now - timedelta(days=random.randint(10, 90)),
            "next_maintenance": now + timedelta(days=random.randint(10, 60)),
            "created_at": now - timedelta(days=random.randint(60, 300)),
            "updated_at": now
        })

    db.equipment.insert_many(equipment_records)
    print(f"Created {len(equipment_records)} equipment records")

    # ──────────────────────────────────────────────
    # 10. Create notifications
    # ──────────────────────────────────────────────
    notifications = [
        {
            "_id": ObjectId(),
            "user_id": str(admin_id),
            "type": "new_payment",
            "title": "Payment Received",
            "message": "Payment of Rs 20,00,000 received for Lotus Residency - Phase 1.",
            "project_id": str(project1_id),
            "is_read": False,
            "created_at": now - timedelta(hours=2)
        },
        {
            "_id": ObjectId(),
            "user_id": str(admin_id),
            "type": "milestone",
            "title": "Project Milestone Reached",
            "message": "Lotus Residency has reached 65% completion.",
            "project_id": str(project1_id),
            "is_read": False,
            "created_at": now - timedelta(hours=5)
        },
        {
            "_id": ObjectId(),
            "user_id": str(manager_id),
            "type": "low_inventory",
            "title": "Low Stock Alert",
            "message": "OPC 53 Grade Cement stock is running low. Only 80 bags remaining.",
            "project_id": str(project1_id),
            "is_read": False,
            "created_at": now - timedelta(hours=8)
        },
        {
            "_id": ObjectId(),
            "user_id": str(accountant_id),
            "type": "new_expense",
            "title": "Expense Submitted",
            "message": "New expense of Rs 2,50,000 submitted for steel procurement at Greenfield Plaza.",
            "project_id": str(project2_id),
            "is_read": True,
            "created_at": now - timedelta(days=1)
        },
        {
            "_id": ObjectId(),
            "user_id": str(client_id),
            "type": "milestone",
            "title": "Project Update",
            "message": "Greenfield Commercial Plaza has reached 40% completion.",
            "project_id": str(project2_id),
            "is_read": False,
            "created_at": now - timedelta(days=2)
        },
        {
            "_id": ObjectId(),
            "user_id": str(admin_id),
            "type": "payment_due",
            "title": "Payment Reminder",
            "message": "Rs 55,00,000 pending for Lotus Residency - Phase 1.",
            "project_id": str(project1_id),
            "is_read": False,
            "created_at": now - timedelta(days=3)
        },
    ]

    db.notifications.insert_many(notifications)
    print(f"Created {len(notifications)} notifications")

    # ──────────────────────────────────────────────
    # 11. Create audit log entries
    # ──────────────────────────────────────────────
    audit_logs = [
        {
            "_id": ObjectId(),
            "user_id": str(admin_id),
            "user_name": "Admin User",
            "action": "Created Project",
            "details": "Created project: Lotus Residency - Phase 1 (GC-2025-001)",
            "timestamp": datetime(2025, 1, 10),
            "ip_address": "192.168.1.100",
            "project_ref": str(project1_id)
        },
        {
            "_id": ObjectId(),
            "user_id": str(admin_id),
            "user_name": "Admin User",
            "action": "Created Project",
            "details": "Created project: Greenfield Commercial Plaza (GC-2025-002)",
            "timestamp": datetime(2025, 2, 20),
            "ip_address": "192.168.1.100",
            "project_ref": str(project2_id)
        },
        {
            "_id": ObjectId(),
            "user_id": str(accountant_id),
            "user_name": "Priya Sharma",
            "action": "Payment Received",
            "details": "Recorded payment of Rs 30,00,000 for Lotus Residency",
            "timestamp": now - timedelta(days=5),
            "ip_address": "192.168.1.102",
            "project_ref": str(project1_id)
        },
        {
            "_id": ObjectId(),
            "user_id": str(manager_id),
            "user_name": "Rajesh Kumar",
            "action": "Daily Report Submitted",
            "details": "Submitted daily report for Lotus Residency - Slab casting work",
            "timestamp": now - timedelta(days=1),
            "ip_address": "192.168.1.101",
            "project_ref": str(project1_id)
        },
        {
            "_id": ObjectId(),
            "user_id": str(accountant_id),
            "user_name": "Priya Sharma",
            "action": "Expense Recorded",
            "details": "Recorded expense of Rs 2,50,000 for steel at Greenfield Plaza",
            "timestamp": now - timedelta(hours=12),
            "ip_address": "192.168.1.102",
            "project_ref": str(project2_id)
        },
        {
            "_id": ObjectId(),
            "user_id": str(admin_id),
            "user_name": "Admin User",
            "action": "Project Updated",
            "details": "Updated Lotus Residency completion to 65%",
            "timestamp": now - timedelta(hours=6),
            "ip_address": "192.168.1.100",
            "project_ref": str(project1_id)
        },
        {
            "_id": ObjectId(),
            "user_id": str(admin_id),
            "user_name": "Admin User",
            "action": "User Login",
            "details": "Admin logged in successfully",
            "timestamp": now - timedelta(hours=1),
            "ip_address": "192.168.1.100",
            "project_ref": None
        },
    ]

    db.audit_logs.insert_many(audit_logs)
    print(f"Created {len(audit_logs)} audit log entries")

    # ──────────────────────────────────────────────
    # Summary
    # ──────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("Database seeding completed successfully!")
    print("=" * 50)
    print(f"\nSeeded Data Summary:")
    print(f"   Users:          {len(users)}")
    print(f"   Projects:       {len(projects)}")
    print(f"   Payments:       {len(payments)}")
    print(f"   Expenses:       {len(expenses)}")
    print(f"   Daily Reports:  {len(daily_reports)}")
    print(f"   Labour:         {len(labour_records)}")
    print(f"   Inventory:      {len(inventory_records)}")
    print(f"   Equipment:      {len(equipment_records)}")
    print(f"   Notifications:  {len(notifications)}")
    print(f"   Audit Logs:     {len(audit_logs)}")
    print(f"\nLogin Credentials:")
    print(f"   Admin:        admin@galaxy.com / Admin@123")
    print(f"   Site Manager: rajesh@galaxy.com / Manager@123")
    print(f"   Accountant:   priya@galaxy.com / Account@123")
    print(f"   Client:       vikram@client.com / Client@123")
    print(f"\nRole-based access test notes:")
    print(f"   - All 3 projects assigned to Site Manager (Rajesh)")
    print(f"   - All payments/expenses created_by Accountant (Priya)")
    print(f"   - All projects linked to Client (Vikram)")
    print()

    client.close()


if __name__ == "__main__":
    seed_database()
