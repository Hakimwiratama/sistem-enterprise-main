# Sistem Enterprise - Microservices

Proyek ini berisi product-service (Node.js/Express), cart-service dan
order-service (Laravel), serta review-service (Flask). Setiap service memiliki
database sendiri. Service hanya berkomunikasi melalui HTTP API; Order Service
tidak membaca database Cart atau Product secara langsung.

## Arsitektur

```text
Client
  | POST /orders, GET /orders..., PATCH /orders/{id}/pay
  v
Order Service (Laravel :3003) ---- MySQL Order (ordersdb :3307)
  | GET /carts/{userId}, DELETE /carts/{userId}
  +------------------------------> Cart Service (Laravel :3001) ---- PostgreSQL
  |
  | GET /products/{id}
  +------------------------------> Product Service (Express :3000) --- MySQL
                                                                   ^
Review Service (Flask :3002) --------------------------------------+
  +---------------------------------------------------------------- MongoDB
```

Saat checkout, Order Service membaca cart, meminta detail tiap produk,
memastikan produk masih tersedia dan stok cukup, lalu menyimpan pesanan dan
snapshot nama/harga item dalam satu transaksi. Setelah pesanan tersimpan,
service meminta cart dikosongkan. Stok produk tidak dikurangi. Jika pengosongan
cart gagal, pesanan tetap berhasil dibuat dan kegagalan dicatat di log.
Pembayaran hanya mengubah status `PENDING` menjadi `PAID`.

## Menjalankan seluruh sistem

Prasyarat: Docker Desktop/Docker Engine dengan Compose aktif, koneksi internet
untuk mengunduh image dan dependency saat build, serta port `3000`-`3003`,
`3307`, dan `27017` yang tersedia.

Dari root repository jalankan:

```sh
docker compose up --build
```

Perintah ini membangun dan menjalankan semua service beserta database mereka.
Tidak perlu membuat `.env` untuk menjalankan Compose; konfigurasi development
non-rahasia sudah disediakan melalui `environment` di `docker-compose.yml`.
Endpoint yang tersedia:

| Service | URL | Database |
| --- | --- | --- |
| Product | `http://localhost:3000` | MySQL internal Compose |
| Cart | `http://localhost:3001` | PostgreSQL internal Compose |
| Review | `http://localhost:3002` | MongoDB internal Compose |
| Order | `http://localhost:3003` | MySQL `127.0.0.1:3307` |

Migration Order dijalankan otomatis saat container Order mulai. Untuk hanya
menjalankan layanan yang diperlukan untuk checkout:

```sh
docker compose up --build order-service
```

Compose juga menyalakan Cart dan Product beserta database masing-masing. Review
tidak diperlukan untuk checkout. Pemeriksaan status:

```sh
docker compose ps
curl.exe http://localhost:3003/health
```

Hentikan service dengan `Ctrl+C`, atau gunakan `docker compose down`. Data
database disimpan di named volumes dan tetap ada setelah container dihentikan.
Jangan gunakan `docker compose down -v` kecuali memang ingin menghapus data.

## API Order Service

Semua respons memakai JSON. Request `POST /orders` memerlukan `user_id`:

```json
{
  "user_id": 7
}
```

| Method | Endpoint | Sukses | Kondisi gagal utama |
| --- | --- | --- | --- |
| `GET` | `/health` | `200`, status layanan | - |
| `POST` | `/orders` | `201`, pesanan beserta item | `422` input; `409` cart kosong, produk hilang, stok kurang; `503` Cart/Product bermasalah |
| `GET` | `/orders/{id}` | `200`, detail pesanan | `404` tidak ditemukan |
| `GET` | `/orders/user/{userId}` | `200`, terbaru dahulu | `422` filter status selain `PENDING`/`PAID` |
| `PATCH` | `/orders/{id}/pay` | `200`, status menjadi `PAID` | `404` tidak ditemukan; `409` bukan `PENDING` |

Contoh:

```sh
curl.exe http://localhost:3003/health
curl.exe -X POST http://localhost:3003/orders -H "Content-Type: application/json" -d "{\"user_id\":7}"
curl.exe http://localhost:3003/orders/1
curl.exe "http://localhost:3003/orders/user/7?status=PENDING"
curl.exe -X PATCH http://localhost:3003/orders/1/pay
```

Order Service memakai kontrak yang sudah ada: `GET /carts/{userId}`,
`DELETE /carts/{userId}`, dan `GET /products/{id}`. Ia tidak mengubah kontrak
service tersebut. Detail teknis error hanya dikirim saat `APP_DEBUG=true`.

## Environment variables

Compose memberi nilai development berikut. Password ini hanya untuk penggunaan
lokal, bukan rahasia production. Tidak ada file `.env` lokal yang perlu
di-commit.

| Variable | Service | Default Compose |
| --- | --- | --- |
| `APP_NAME`, `APP_ENV`, `APP_DEBUG` | Cart, Order | nama service, `local`, debug Cart aktif dan Order nonaktif |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | Cart, Order | Cart memakai PostgreSQL; Order memakai MySQL |
| `CART_SERVICE_URL` | Order | `http://cart-service:3001` |
| `PRODUCT_SERVICE_URL` | Order, Review | `http://product-service:3000` |
| `SESSION_DRIVER`, `CACHE_STORE`, `QUEUE_CONNECTION`, `LOG_CHANNEL` | Cart, Order | `file`, `file`, `sync`, `stderr` |
| `DB_HOST`, `DB_USER`, `DB_PORT`, `DB_PASSWORD`, `DB_NAME` | Product | `product-db`, `appuser`, `3306`, `password`, `productdb` |
| `PRODUCT_JWT_SECRET` | Product | Wajib untuk operasi tulis; rahasia HS256 minimal 32 byte, jangan di-commit |
| `PRODUCT_JWT_ISSUER`, `PRODUCT_JWT_AUDIENCE` | Product | Opsional, untuk membatasi issuer dan audience JWT |
| `HOST`, `PORT`, `FLASK_DEBUG`, `MONGO_URI`, `MONGO_DB_NAME` | Review | `0.0.0.0`, `3002`, `0`, URL internal Compose, `reviewdb` |
| `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Order/Product DB | nilai development pada `docker-compose.yml` |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Cart DB | nilai development pada `docker-compose.yml` |
| `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD` | Review DB | nilai development pada `docker-compose.yml` |

Untuk menjalankan Order Service di luar Compose, salin
`order-service/.env.example` menjadi `order-service/.env`, lalu sesuaikan
database dan URL dependency. `.env` tidak boleh dimasukkan ke Git.

## Pengujian Order Service

Test menggunakan SQLite in-memory dan HTTP fake untuk dependency, sehingga
tidak memerlukan database atau service lain yang aktif:

```sh
docker compose run --no-deps --build --rm -e APP_ENV=testing -e APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: order-service php artisan test
```

Test otomatis mencakup request tidak valid, cart kosong, stok kurang, produk
hilang, Cart/Product Service bermasalah, keranjang yang gagal dikosongkan,
snapshot item, pembayaran ganda, dan pencatatan error Product Service. Database
Product yang baru dibuat memuat contoh produk Tas Laptop; data contoh
Keyboard/Mouse/Monitor pada soal perlu ditambahkan melalui API Product Service
sebelum demo skenario tersebut. Perubahan harga setelah order juga dapat
diverifikasi secara manual: ubah harga lewat `PUT /products/{id}`, lalu ambil
ulang order dan pastikan snapshot harga tetap sama.

## Struktur dan keterbatasan

Order Service memisahkan routes, Form Request, controller, service bisnis,
Eloquent model, dan client HTTP untuk Cart/Product. Panggilan upstream memiliki
timeout maksimal 5 detik. Tidak ada autentikasi, pengurangan stok, pembayaran
nyata, pembatalan pesanan, API gateway, atau message broker; fitur-fitur itu
memang di luar lingkup soal. Commit bertahap, repositori publik, tautan video,
dan SHA commit penilaian harus dipersiapkan untuk pengumpulan secara terpisah.
