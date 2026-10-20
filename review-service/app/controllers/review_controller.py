from flask import jsonify, request

from app.schemas.review_schema import validate_create_review, validate_update_review
from app.services import review_service


def list_by_product(product_id):
    data = review_service.get_product_reviews(product_id)
    return jsonify({"message": "Berhasil mengambil review produk", "data": data})


def show(review_id):
    review = review_service.get_review(review_id)
    return jsonify({"message": "Berhasil mengambil review", "data": review})


def store():
    data = validate_create_review(request.get_json(silent=True))
    review = review_service.create_review(data)
    return jsonify({"message": "Review berhasil dibuat", "data": review}), 201


def update(review_id):
    data = validate_update_review(request.get_json(silent=True))
    review = review_service.update_review(review_id, data)
    return jsonify({"message": "Review berhasil diperbarui", "data": review})


def destroy(review_id):
    review_service.delete_review(review_id)
    return jsonify({"message": "Review berhasil dihapus"})
