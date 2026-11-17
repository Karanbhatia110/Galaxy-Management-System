"""
Galaxy Construction Management System - Extensions
"""
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pymongo import MongoClient
from gridfs import GridFS

# JWT Manager
jwt = JWTManager()

# Rate Limiter
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
)

# MongoDB globals
mongo_client = None
db = None
fs = None


def init_db(app):
    """Initialize MongoDB connection and GridFS."""
    global mongo_client, db, fs
    mongo_client = MongoClient(app.config["MONGO_URI"])
    db = mongo_client[app.config["MONGO_DB_NAME"]]
    fs = GridFS(db)
    return db


def get_db():
    """Get the database instance."""
    return db


def get_fs():
    """Get the GridFS instance."""
    return fs
