"""
Galaxy Construction Management System - Configuration
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration loaded from environment variables."""

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "galaxy-construction-dev-key")
    DEBUG = os.environ.get("FLASK_DEBUG", "True").lower() == "true"

    # MongoDB
    MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
    MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "galaxy_construction")

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "galaxy-jwt-dev-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES", 2592000))
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # File Upload
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", 16777216))  # 16MB
    ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "docx"}

    # Rate Limiting
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_DEFAULT = os.environ.get("RATELIMIT_DEFAULT", "200/day;50/hour")

    # Frontend URL for CORS
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
