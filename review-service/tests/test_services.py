import os
import unittest
from unittest.mock import Mock, patch

import requests
from pymongo.errors import DuplicateKeyError

from app.clients import product_client
from app.exceptions import (
    DuplicateReviewError,
    ProductNotFoundError,
    ProductServiceUnavailableError,
    ReviewNotFoundError,
)
from app.services import review_service


class ProductClientTests(unittest.TestCase):
    @patch.dict(os.environ, {"PRODUCT_SERVICE_URL": "http://products:3000/"})
    @patch("app.clients.product_client.requests.get")
    def test_existing_product(self, get):
        get.return_value = Mock(status_code=200, ok=True)

        self.assertTrue(product_client.product_exists(3))
        get.assert_called_once_with(
            "http://products:3000/products/3",
            timeout=3,
        )

    @patch("app.clients.product_client.requests.get")
    def test_missing_product(self, get):
        get.return_value = Mock(status_code=404, ok=False)

        self.assertFalse(product_client.product_exists(999))

    @patch("app.clients.product_client.requests.get")
    def test_product_service_error(self, get):
        get.return_value = Mock(status_code=500, ok=False)

        with self.assertRaises(ProductServiceUnavailableError):
            product_client.product_exists(3)

    @patch("app.clients.product_client.requests.get", side_effect=requests.Timeout)
    def test_product_service_timeout(self, _get):
        with self.assertRaises(ProductServiceUnavailableError) as error:
            product_client.product_exists(3)

        self.assertIsInstance(error.exception.__cause__, requests.Timeout)


class ReviewServiceTests(unittest.TestCase):
    @patch("app.services.review_service.review_model.insert")
    @patch("app.services.review_service.product_client.product_exists", return_value=True)
    def test_create_review_checks_product_and_sets_timestamps(
        self,
        product_exists,
        insert,
    ):
        review = {"id": "review-id"}
        insert.return_value = review
        data = {"product_id": 3, "user_id": 4, "rating": 5, "comment": "Bagus"}

        result = review_service.create_review(data)

        self.assertEqual(result, review)
        product_exists.assert_called_once_with(3)
        document = insert.call_args.args[0]
        self.assertEqual(
            {key: document[key] for key in data},
            data,
        )
        self.assertEqual(document["created_at"], document["updated_at"])
        self.assertIsNotNone(document["created_at"].tzinfo)

    @patch("app.services.review_service.review_model.insert")
    @patch("app.services.review_service.product_client.product_exists", return_value=False)
    def test_create_review_rejects_missing_product(self, _product_exists, insert):
        with self.assertRaises(ProductNotFoundError):
            review_service.create_review({
                "product_id": 999,
                "user_id": 4,
                "rating": 5,
                "comment": "",
            })

        insert.assert_not_called()

    @patch(
        "app.services.review_service.review_model.insert",
        side_effect=DuplicateKeyError("duplicate"),
    )
    @patch("app.services.review_service.product_client.product_exists", return_value=True)
    def test_duplicate_review_is_mapped_to_business_error(
        self,
        _product_exists,
        _insert,
    ):
        with self.assertRaises(DuplicateReviewError):
            review_service.create_review({
                "product_id": 3,
                "user_id": 4,
                "rating": 5,
                "comment": "",
            })

    @patch("app.services.review_service.review_model.update", return_value=None)
    def test_update_missing_review(self, _update):
        with self.assertRaises(ReviewNotFoundError):
            review_service.update_review("507f1f77bcf86cd799439011", {"rating": 4})

    @patch("app.services.review_service.review_model.delete", return_value=False)
    def test_delete_missing_review(self, _delete):
        with self.assertRaises(ReviewNotFoundError):
            review_service.delete_review("507f1f77bcf86cd799439011")

    def test_invalid_review_id_is_not_found(self):
        with self.assertRaises(ReviewNotFoundError):
            review_service.get_review("not-an-object-id")
