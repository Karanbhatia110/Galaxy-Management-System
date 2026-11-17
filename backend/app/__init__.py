"""
Galaxy Construction Management System - Application Factory
"""
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import jwt, limiter, init_db, db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.url_map.strict_slashes = False

    # Initialize extensions
    jwt.init_app(app)
    limiter.init_app(app)
    # CORS — allow comma-separated origins in FRONTEND_URL
    frontend_url = app.config.get("FRONTEND_URL", "http://localhost:5173")
    origins = [u.strip() for u in frontend_url.split(",") if u.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}},
         supports_credentials=True)

    # Initialize database
    init_db(app)

    # JWT callbacks
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        from app.extensions import db as database
        token = database.token_blocklist.find_one({"jti": jti})
        return token is not None

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {"message": "Token has expired", "error": "token_expired"}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {"message": "Invalid token", "error": "invalid_token"}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {"message": "Authorization required", "error": "authorization_required"}, 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return {"message": "Token has been revoked", "error": "token_revoked"}, 401

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.projects import projects_bp
    from app.routes.payments import payments_bp
    from app.routes.expenses import expenses_bp
    from app.routes.documents import documents_bp
    from app.routes.daily_reports import daily_reports_bp
    from app.routes.labour import labour_bp
    from app.routes.inventory import inventory_bp
    from app.routes.equipment import equipment_bp
    from app.routes.notifications import notifications_bp
    from app.routes.audit import audit_bp
    from app.routes.reports import reports_bp
    from app.routes.search import search_bp
    from app.routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(projects_bp, url_prefix="/api/projects")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
    app.register_blueprint(expenses_bp, url_prefix="/api/expenses")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    app.register_blueprint(daily_reports_bp, url_prefix="/api/daily-reports")
    app.register_blueprint(labour_bp, url_prefix="/api/labour")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(equipment_bp, url_prefix="/api/equipment")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(audit_bp, url_prefix="/api/audit-logs")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(search_bp, url_prefix="/api/search")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    # Create indexes
    with app.app_context():
        _create_indexes()

    # Health check
    @app.route("/")
    def health_check():
        return {"status": "ok", "app": "Galaxy Construction Management API"}, 200

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {"message": "Resource not found"}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {"message": "Internal server error"}, 500

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return {"message": "Rate limit exceeded", "error": str(e.description)}, 429

    return app


def _create_indexes():
    """Create MongoDB indexes for optimal query performance."""
    from app.extensions import db as database
    try:
        database.users.create_index("email", unique=True)
        database.projects.create_index("project_code", unique=True)
        database.projects.create_index("client_id")
        database.projects.create_index("status")
        database.payments.create_index("project_id")
        database.expenses.create_index("project_id")
        database.expenses.create_index("category")
        database.daily_reports.create_index([("project_id", 1), ("date", -1)])
        database.labour.create_index("assigned_site")
        database.inventory.create_index("project_id")
        database.equipment.create_index("assigned_site")
        database.notifications.create_index([("user_id", 1), ("is_read", 1)])
        database.audit_logs.create_index([("timestamp", -1)])
        database.audit_logs.create_index("user_id")
        database.token_blocklist.create_index("jti", unique=True)
        database.token_blocklist.create_index("created_at", expireAfterSeconds=86400)
    except Exception:
        pass  # Indexes may already exist
