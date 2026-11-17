"""
Galaxy Construction Management System - Documents Routes
"""
import io
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from datetime import datetime

from app.extensions import db, fs
from app.utils.helpers import parse_doc, validate_objectid, paginate, allowed_file
from app.utils.audit import log_action

documents_bp = Blueprint("documents", __name__)

# Allowed document types
ALLOWED_DOC_TYPES = [
    "bills", "invoices", "contracts", "drawings",
    "site_photos", "certificates", "quotations"
]

# Extended allowed file extensions for construction documents
ALLOWED_EXTENSIONS = {
    "pdf", "jpg", "jpeg", "png", "gif", "bmp", "tiff",
    "doc", "docx", "xls", "xlsx", "csv",
    "dwg", "dxf", "zip", "rar"
}


@documents_bp.route("/project/<project_id>/upload", methods=["POST"])
@jwt_required()
def upload_document(project_id):
    """Upload a file to GridFS with metadata."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        # Check for file in request
        if "file" not in request.files:
            return jsonify({"message": "No file provided"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"message": "No file selected"}), 400

        # Validate file extension
        if not allowed_file(file.filename, ALLOWED_EXTENSIONS):
            return jsonify({
                "message": f"File type not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            }), 400

        # Get document type from form data
        doc_type = request.form.get("doc_type", "").strip()
        if doc_type and doc_type not in ALLOWED_DOC_TYPES:
            return jsonify({
                "message": f"doc_type must be one of: {', '.join(ALLOWED_DOC_TYPES)}"
            }), 400

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_name = claims.get("name", "Unknown")

        original_filename = file.filename
        content_type = file.content_type or "application/octet-stream"

        # Store file in GridFS with metadata
        metadata = {
            "project_id": project_id,
            "doc_type": doc_type or "miscellaneous",
            "uploaded_by": current_user_id,
            "uploaded_by_name": user_name,
            "original_filename": original_filename,
            "upload_date": datetime.utcnow()
        }

        file_id = fs.put(
            file.read(),
            filename=original_filename,
            content_type=content_type,
            metadata=metadata
        )

        # Log audit
        log_action(
            user_id=current_user_id,
            user_name=user_name,
            action="Uploaded Document",
            ip_address=request.remote_addr or "unknown",
            project_ref=project_id,
            details=f"File: {original_filename}, Type: {doc_type or 'miscellaneous'}"
        )

        return jsonify({
            "message": "File uploaded successfully",
            "document": {
                "file_id": str(file_id),
                "filename": original_filename,
                "content_type": content_type,
                "doc_type": doc_type or "miscellaneous",
                "project_id": project_id,
                "uploaded_by": current_user_id,
                "uploaded_by_name": user_name,
                "upload_date": datetime.utcnow().isoformat()
            }
        }), 201

    except Exception as e:
        return jsonify({"message": "Failed to upload document", "error": str(e)}), 500


@documents_bp.route("/project/<project_id>", methods=["GET"])
@jwt_required()
def list_documents(project_id):
    """List documents for a project. Filter by doc_type. Returns metadata only."""
    try:
        oid = validate_objectid(project_id)
        if not oid:
            return jsonify({"message": "Invalid project ID"}), 400

        project = db.projects.find_one({"_id": oid})
        if not project:
            return jsonify({"message": "Project not found"}), 404

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        doc_type = request.args.get("doc_type", None)

        query = {"metadata.project_id": project_id}
        if doc_type:
            if doc_type not in ALLOWED_DOC_TYPES:
                return jsonify({
                    "message": f"doc_type must be one of: {', '.join(ALLOWED_DOC_TYPES)}"
                }), 400
            query["metadata.doc_type"] = doc_type

        cursor = db.fs.files.find(query).sort("uploadDate", -1)
        items, pagination = paginate(cursor, page, per_page)

        # Format documents for response (metadata only, not file content)
        documents = []
        for item in items:
            meta = item.get("metadata", {})
            doc_id = str(item["_id"])
            documents.append({
                "_id": doc_id,
                "file_id": doc_id,
                "filename": item.get("filename", ""),
                "content_type": item.get("contentType", ""),
                "length": item.get("length", 0),
                "upload_date": item.get("uploadDate", ""),
                "uploadDate": item.get("uploadDate", ""),
                "doc_type": meta.get("doc_type", ""),
                "project_id": meta.get("project_id", ""),
                "uploaded_by": meta.get("uploaded_by", ""),
                "uploaded_by_name": meta.get("uploaded_by_name", ""),
                "original_filename": meta.get("original_filename", ""),
                "metadata": {
                    "doc_type": meta.get("doc_type", ""),
                    "project_id": meta.get("project_id", ""),
                    "uploaded_by": meta.get("uploaded_by", ""),
                    "uploaded_by_name": meta.get("uploaded_by_name", ""),
                    "original_filename": meta.get("original_filename", ""),
                    "upload_date": meta.get("upload_date", "")
                }
            })

        return jsonify({
            "documents": parse_doc(documents),
            "pagination": pagination
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to fetch documents", "error": str(e)}), 500


@documents_bp.route("/<file_id>/download", methods=["GET"])
@jwt_required()
def download_document(file_id):
    """Download a file from GridFS."""
    try:
        oid = validate_objectid(file_id)
        if not oid:
            return jsonify({"message": "Invalid file ID"}), 400

        # Check if file exists in GridFS
        if not fs.exists(oid):
            return jsonify({"message": "File not found"}), 404

        grid_out = fs.get(oid)
        file_data = io.BytesIO(grid_out.read())

        return send_file(
            file_data,
            mimetype=grid_out.content_type or "application/octet-stream",
            as_attachment=True,
            download_name=grid_out.filename or "download"
        )

    except Exception as e:
        return jsonify({"message": "Failed to download document", "error": str(e)}), 500


@documents_bp.route("/<file_id>/preview", methods=["GET"])
@jwt_required()
def preview_document(file_id):
    """Return file inline for PDF/image preview in browser."""
    try:
        oid = validate_objectid(file_id)
        if not oid:
            return jsonify({"message": "Invalid file ID"}), 400

        if not fs.exists(oid):
            return jsonify({"message": "File not found"}), 404

        grid_out = fs.get(oid)
        file_data = io.BytesIO(grid_out.read())
        content_type = grid_out.content_type or "application/octet-stream"

        # Only allow inline preview for PDFs and images
        previewable_types = [
            "application/pdf",
            "image/jpeg", "image/jpg", "image/png",
            "image/gif", "image/bmp", "image/tiff"
        ]

        if content_type not in previewable_types:
            return jsonify({
                "message": "Preview not available for this file type. Use download instead."
            }), 400

        return send_file(
            file_data,
            mimetype=content_type,
            as_attachment=False,
            download_name=grid_out.filename or "preview"
        )

    except Exception as e:
        return jsonify({"message": "Failed to preview document", "error": str(e)}), 500


@documents_bp.route("/<file_id>", methods=["DELETE"])
@jwt_required()
def delete_document(file_id):
    """Delete a file from GridFS."""
    try:
        oid = validate_objectid(file_id)
        if not oid:
            return jsonify({"message": "Invalid file ID"}), 400

        # Get file metadata before deleting
        file_doc = db.fs.files.find_one({"_id": oid})
        if not file_doc:
            return jsonify({"message": "File not found"}), 404

        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_name = claims.get("name", "Unknown")

        metadata = file_doc.get("metadata", {})
        filename = file_doc.get("filename", "unknown")
        project_ref = metadata.get("project_id")

        # Delete from GridFS
        fs.delete(oid)

        # Log audit
        log_action(
            user_id=current_user_id,
            user_name=user_name,
            action="Deleted Document",
            ip_address=request.remote_addr or "unknown",
            project_ref=project_ref,
            details=f"Deleted file: {filename}"
        )

        return jsonify({"message": "Document deleted successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to delete document", "error": str(e)}), 500


@documents_bp.route("/search", methods=["GET"])
@jwt_required()
def search_documents():
    """Search documents by filename, doc_type, or project_id."""
    try:
        filename = request.args.get("filename", "").strip()
        doc_type = request.args.get("doc_type", "").strip()
        project_id = request.args.get("project_id", "").strip()
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        if not filename and not doc_type and not project_id:
            return jsonify({"message": "At least one search parameter is required (filename, doc_type, or project_id)"}), 400

        query = {}

        if filename:
            # Case-insensitive partial match on filename
            query["filename"] = {"$regex": filename, "$options": "i"}

        if doc_type:
            if doc_type not in ALLOWED_DOC_TYPES:
                return jsonify({
                    "message": f"doc_type must be one of: {', '.join(ALLOWED_DOC_TYPES)}"
                }), 400
            query["metadata.doc_type"] = doc_type

        if project_id:
            pid = validate_objectid(project_id)
            if not pid:
                return jsonify({"message": "Invalid project_id"}), 400
            query["metadata.project_id"] = project_id

        cursor = db.fs.files.find(query).sort("uploadDate", -1)
        items, pagination = paginate(cursor, page, per_page)

        documents = []
        for item in items:
            meta = item.get("metadata", {})
            doc_id = str(item["_id"])
            documents.append({
                "_id": doc_id,
                "file_id": doc_id,
                "filename": item.get("filename", ""),
                "content_type": item.get("contentType", ""),
                "length": item.get("length", 0),
                "upload_date": item.get("uploadDate", ""),
                "uploadDate": item.get("uploadDate", ""),
                "doc_type": meta.get("doc_type", ""),
                "project_id": meta.get("project_id", ""),
                "uploaded_by": meta.get("uploaded_by", ""),
                "uploaded_by_name": meta.get("uploaded_by_name", ""),
                "original_filename": meta.get("original_filename", ""),
                "metadata": {
                    "doc_type": meta.get("doc_type", ""),
                    "project_id": meta.get("project_id", ""),
                    "uploaded_by": meta.get("uploaded_by", ""),
                    "uploaded_by_name": meta.get("uploaded_by_name", ""),
                    "original_filename": meta.get("original_filename", ""),
                    "upload_date": meta.get("upload_date", "")
                }
            })

        return jsonify({
            "documents": parse_doc(documents),
            "pagination": pagination,
            "query": {
                "filename": filename or None,
                "doc_type": doc_type or None,
                "project_id": project_id or None
            }
        }), 200

    except Exception as e:
        return jsonify({"message": "Failed to search documents", "error": str(e)}), 500
