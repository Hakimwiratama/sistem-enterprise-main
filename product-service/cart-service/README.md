# Cart Service

Laravel API service for managing user shopping carts. Cart data is stored in PostgreSQL; product details remain owned by `product-service`.

## Run locally

1. Copy `.env.example` to `.env` and set `DB_HOST=127.0.0.1`.
2. Start PostgreSQL (or run `docker compose up -d cart-db`).
3. Install dependencies and generate the application key:

   ```sh
   composer install
   php artisan key:generate
   ```

4. Create the database tables and start the API:

   ```sh
   php artisan migrate
   php artisan serve --port=3001
   ```

The API is available at `http://localhost:3001`. PostgreSQL connection settings are in `.env`; the example defaults match the included Compose database.

## Run with Docker Compose

Build and start the API together with its PostgreSQL database:

```sh
docker compose up --build
```

The service is available at `http://localhost:3001`. Compose runs migrations before starting Laravel. Stop the services with `docker compose down`; the database volume is retained.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/carts/{userId}` | Get a user's cart and total quantity |
| `POST` | `/carts` | Add a product; adding the same product increases its quantity |
| `PUT` | `/carts/items/{id}` | Set a cart item's quantity |
| `DELETE` | `/carts/items/{id}` | Remove one cart item |
| `DELETE` | `/carts/{userId}` | Clear a user's cart |

`POST /carts` expects `user_id` and `product_id`; `quantity` is optional and defaults to `1`. `PUT /carts/items/{id}` expects `quantity`. Invalid input returns JSON with status `422`; missing cart items return `404`.

## Tests

```sh
php artisan test
```

The test suite uses an in-memory SQLite database and does not require a running PostgreSQL server.
