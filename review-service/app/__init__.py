import logging
import os
import traceback

from dotenv import load_dotenv
from flask import Flask, jsonify

from app.database import init_db
from app.exceptions import (
    DuplicateReviewError,
    ProductNotFoundError,
    ProductServiceUnavailableError,
    ReviewNotFoundError,
    ValidationError,
)
from app.routes.review_routes import review_bp


def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.logger.setLevel(logging.INFO)
    app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "0").lower() in {
        "1",
        "true",
        "yes",
    }
    init_db()
    app.register_blueprint(review_bp)

    @app.get("/")
    def index():
        return jsonify({
            "service": "review-service",
            "health": "/health",
            "reviews": "/reviews",
        })

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "service": "review-service"})

    @app.errorhandler(ValidationError)
    def invalid_request(error):
        return jsonify({
            "message": "Data yang dikirim tidak valid",
            "errors": error.errors,
        }), 422

    @app.errorhandler(ReviewNotFoundError)
    def review_not_found(error):
        return jsonify({"message": str(error)}), 404

    @app.errorhandler(ProductNotFoundError)
    def product_not_found(error):
        return jsonify({
            "message": "Data yang dikirim tidak valid",
            "errors": {"product_id": [str(error)]},
        }), 422

    @app.errorhandler(DuplicateReviewError)
    def duplicate_review(error):
        return jsonify({"message": str(error)}), 409

    @app.errorhandler(ProductServiceUnavailableError)
    def product_service_unavailable(error):
        app.logger.warning(
            "Product service tidak tersedia: %s (penyebab: %s)",
            error,
            error.__cause__,
        )
        body = {
            "message": "Product service tidak dapat dihubungi, coba lagi nanti"
        }
        if app.debug:
            body["error"] = str(error)
            body["cause"] = str(error.__cause__) if error.__cause__ else None
        return jsonify(body), 503

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"message": "Endpoint tidak ditemukan"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return jsonify({"message": "Method tidak diizinkan untuk endpoint ini"}), 405

    @app.errorhandler(Exception)
    def internal_server_error(error):
        app.logger.exception("Terjadi kesalahan internal")
        body = {"message": "Terjadi kesalahan internal"}
        if app.debug:
            frame = traceback.extract_tb(error.__traceback__)[-1]
            body["error"] = str(error)
            body["location"] = f"{frame.filename}:{frame.lineno}"
        return jsonify(body), 500

    return app
