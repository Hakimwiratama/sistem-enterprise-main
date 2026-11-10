# Serambi — E-commerce UI

React storefront for the Product, Cart, Review, and Order services in this
repository. The app follows the UI integration guide's API, hook, component,
page, routing, and production-build structure.

## Run locally

Start the services from the repository root:

```sh
docker compose up --build product-service cart-service review-service order-service
```

Then start the UI from this directory:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. The demo user defaults to ID `1`; IDs `1`–`5`
can be selected in the header and are saved in `localStorage`. The project has
no authentication service.

Copy `.env.example` to `.env.local` to override service URLs during local
development:

| Variable | Default |
| --- | --- |
| `VITE_PRODUCT_API_URL` | `http://localhost:3000` |
| `VITE_CART_API_URL` | `http://localhost:3001` |
| `VITE_REVIEW_API_URL` | `http://localhost:3002` |
| `VITE_ORDER_API_URL` | `http://localhost:3003` |

These values are included in the client bundle at build time. For a local
Docker Compose run, the default URLs use the published host ports.

The Cart, Order, and Review services allow browser requests from
`http://localhost:5173` and `http://127.0.0.1:5173` by default. When serving
the UI from another origin, set `CORS_ALLOWED_ORIGINS` on those services to a
comma-separated list of UI origins and restart them.

## Structure

```text
src/
  api/          Shared fetch helper and one API client per service
  components/   Header, product card, async state, and review components
  context/      Shared demo user and storefront data
  hooks/        Async, product, cart, order, and review hooks
  pages/        Catalog, product detail, cart, orders, and not-found pages
  utils/        Currency, date, image, and error formatting
```

## Verify and production build

```sh
npm run lint
npm run build
npm run preview
```

To check the browser flow, run all four services and verify:

1. The catalog loads, product search/filter/sort work, and product detail
   displays its review summary and reviews.
2. Add a product, change its quantity, remove it, and verify the cart total.
3. Check out, open the new order, then pay or cancel while it is `PENDING`.
4. Submit a review once for a product and verify the updated rating summary.
5. In DevTools Network, confirm the expected requests:
   `GET /products`, `GET /carts/{userId}`, `GET /orders/user/{userId}`,
   product detail/review requests, and the corresponding cart/order/review
   mutation requests. Verify the browser console has no CORS errors.

The UI reports unavailable services inline. End-to-end checks require the
backend services and databases to be running.
