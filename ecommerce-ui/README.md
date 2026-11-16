# Toko Hakim — E-commerce UI

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
no authentication service. Product writes therefore require a valid access
token issued by an external authentication service; do not use the demo user
selector as a security identity.

## Product photos and product management

Product management is available at `/manage/products` to a seller or admin.
Paste the external service's JWT access token into the management page. The
token is held in the current browser session and must contain `sub` (user ID),
`role` (`admin`, `seller`, or `buyer`), and an unexpired `exp` claim. Product
Service verifies its HS256 signature using `PRODUCT_JWT_SECRET`; frontend role
checks only control the UI and are not an authorization boundary.

The form sends `multipart/form-data` with an `image` file (JPG/JPEG, PNG, or
WEBP, up to 5 MB). Images are stored under the persistent Compose volume
`product-image-data`, while MySQL stores only the generated `/uploads/...` path.
Existing rows with Base64 photos remain readable; newly uploaded files are not
stored as Base64.
The upload directory defaults to `product-service/uploads` for local runs and
is `/app/uploads` in Compose (`PRODUCT_UPLOAD_DIR`); Compose mounts that
directory to `product-image-data`.

When upgrading an existing database volume, apply the safe, repeatable schema
migration from the repository root:

```powershell
Get-Content -Raw .\product-service\database\migrations\001_add_product_category_and_owner.sql |
  docker compose exec -T product-db mysql -uappuser -ppassword productdb
```

The migration adds a category default of `Umum` and a nullable `seller_id`;
existing products and image data are preserved. Existing ownerless products can
be managed by admins, not by sellers.

Set a private, random secret of at least 32 bytes before starting Compose:

```powershell
$env:PRODUCT_JWT_SECRET = "replace-with-a-private-random-secret-at-least-32-bytes"
docker compose up --build product-service ecommerce-ui
```

The external token issuer must sign tokens with this same secret using HS256
and issue role claims exactly as `admin`, `seller`, or `buyer`. Optional
`PRODUCT_JWT_ISSUER` and `PRODUCT_JWT_AUDIENCE` Compose variables enforce the
token issuer and audience when set. Public product GET requests remain
unauthenticated; POST, PUT, and DELETE require admin/seller tokens, and sellers
can only change rows whose `seller_id` matches the verified token `sub`.

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
  pages/        Catalog, product management, detail, cart, orders, and not-found pages
  utils/        Currency, date, image, auth-claim, and error formatting
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
2. Open `/manage/products` with an admin or seller token, create a product
   with a JPG, JPEG, PNG, or WEBP photo, then refresh the catalog and product
   detail to verify the photo is still displayed.
3. Replace the photo as an admin and as its owning seller; confirm another
   seller and a buyer receive an access-denied response for product writes.
4. Restart `product-service` without deleting Compose volumes and verify the
   uploaded photo remains available.
5. Add a product to the cart, change its quantity, remove it, and verify the cart total.
6. Check out, open the new order, then pay or cancel while it is `PENDING`.
7. Submit a review once for a product and verify the updated rating summary.
8. In DevTools Network, confirm the expected requests:
   `GET /products`, `GET /carts/{userId}`, `GET /orders/user/{userId}`,
   product detail/review requests, and the corresponding cart/order/review
   mutation requests. Verify the browser console has no CORS errors.

The UI reports unavailable services inline. End-to-end checks require the
backend services and databases to be running.
