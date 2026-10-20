import unittest
from unittest.mock import patch

from app import create_app
from app.exceptions import (
    DuplicateReviewError,
    ProductNotFoundError,
    ProductServiceUnavailableError,
    ReviewNotFoundError,
)


class ReviewApiTests(unittest.TestCase):
    def setUp(self):
        self.init_db_patcher = patch("app.init_db")
        self.init_db_patcher.start()
        self.app = create_app()
        self.client = self.app.test_client()

    def tearDown(self):
        self.init_db_patcher.stop()

    def test_health_check(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"status": "ok", "service": "review-service"},
        )

    def test_list_product_reviews(self):
        payload = {
            "product_id": 1,
            "summary": {"average_rating": 5.0, "total_reviews": 1},
            "reviews": [],
        }
        with patch(
            "app.controllers.review_controller.review_service.get_product_reviews",
            return_value=payload,
        ):
            response = self.client.get("/reviews/product/1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"], payload)

    def test_create_review_returns_created_review(self):
        review = {"id": "abc", "product_id": 1, "user_id": 2, "rating": 5}
        with patch(
            "app.controllers.review_controller.review_service.create_review",
            return_value=review,
        ) as create_review:
            response = self.client.post(
                "/reviews",
                json={
                    "product_id": 1,
                    "user_id": 2,
                    "rating": 5,
                    "comment": "Bagus",
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["data"], review)
        create_review.assert_called_once_with({
            "product_id": 1,
            "user_id": 2,
            "rating": 5,
            "comment": "Bagus",
        })

    def test_invalid_review_is_rejected_before_service_call(self):
        with patch(
            "app.controllers.review_controller.review_service.create_review"
        ) as create_review:
            response = self.client.post(
                "/reviews",
                json={"product_id": True, "user_id": 2, "rating": 6},
            )

        self.assertEqual(response.status_code, 422)
        self.assertIn("product_id", response.get_json()["errors"])
        self.assertIn("rating", response.get_json()["errors"])
        create_review.assert_not_called()

    def test_product_not_found_returns_unprocessable_entity(self):
        with patch(
            "app.controllers.review_controller.review_service.create_review",
            side_effect=ProductNotFoundError(999),
        ):
            response = self.client.post(
                "/reviews",
                json={"product_id": 999, "user_id": 2, "rating": 5},
            )

        self.assertEqual(response.status_code, 422)
        self.assertIn("product_id", response.get_json()["errors"])

    def test_duplicate_review_returns_conflict(self):
        with patch(
            "app.controllers.review_controller.review_service.create_review",
            side_effect=DuplicateReviewError(2, 1),
        ):
            response = self.client.post(
                "/reviews",
                json={"product_id": 1, "user_id": 2, "rating": 5},
            )

        self.assertEqual(response.status_code, 409)

    def test_product_service_unavailable_returns_service_unavailable(self):
        with patch(
            "app.controllers.review_controller.review_service.create_review",
            side_effect=ProductServiceUnavailableError("Product service down"),
        ):
            response = self.client.post(
                "/reviews",
                json={"product_id": 1, "user_id": 2, "rating": 5},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("tidak dapat dihubungi", response.get_json()["message"])

    def test_missing_review_returns_not_found(self):
        with patch(
            "app.controllers.review_controller.review_service.get_review",
            side_effect=ReviewNotFoundError("invalid-id"),
        ):
            response = self.client.get("/reviews/invalid-id")

        self.assertEqual(response.status_code, 404)

    def test_update_review(self):
        review = {"id": "abc", "rating": 4}
        with patch(
            "app.controllers.review_controller.review_service.update_review",
            return_value=review,
        ) as update_review:
            response = self.client.put(
                "/reviews/abc",
                json={"rating": 4},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"], review)
        update_review.assert_called_once_with("abc", {"rating": 4})

    def test_delete_review(self):
        with patch(
            "app.controllers.review_controller.review_service.delete_review"
        ) as delete_review:
            response = self.client.delete("/reviews/abc")

        self.assertEqual(response.status_code, 200)
        delete_review.assert_called_once_with("abc")

    def test_unknown_route_and_method_return_json_errors(self):
        missing_route = self.client.get("/not-a-route")
        unsupported_method = self.client.patch("/reviews")

        self.assertEqual(missing_route.status_code, 404)
        self.assertIn("message", missing_route.get_json())
        self.assertEqual(unsupported_method.status_code, 405)
        self.assertIn("message", unsupported_method.get_json())


if __name__ == "__main__":
    unittest.main()
