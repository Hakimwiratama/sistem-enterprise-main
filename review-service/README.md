# Review Service

Flask API untuk membuat, membaca, memperbarui, dan menghapus review produk.
Review disimpan di MongoDB; keberadaan produk diverifikasi melalui
`product-service`. Satu user hanya dapat membuat satu review untuk produk yang
sama. Rating berupa bilangan bulat 1–5 dan komentar maksimal 1.000 karakter.

## Menjalankan dengan Docker Compose

Dari direktori root proyek:

```sh
docker compose up --build review-service
```

API tersedia di `http://localhost:3002`. Cek layanan di
`GET /health`. MongoDB berjalan sebagai layanan internal Compose dan datanya
disimpan di volume `review-db-data`. Port MongoDB `27017` dipublikasikan hanya
ke loopback host agar aplikasi lokal dapat menggunakannya.

## Menjalankan lokal

1. Dari root proyek, jalankan database dan product-service:

   ```sh
   docker compose up -d review-db product-service
   ```

2. Dari folder `review-service`, salin `.env.example` menjadi `.env`.
   Nilai bawaannya cocok dengan MongoDB dan product-service yang dijalankan
   Compose di atas.
3. Pasang dependency dan jalankan service:

   ```sh
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python run.py
   ```

API berjalan di `http://localhost:3002`. Mode debug lokal dapat diaktifkan
dengan `FLASK_DEBUG=1`; biarkan `FLASK_DEBUG=0` di lingkungan production.

## API

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/health` | Cek status layanan |
| `GET` | `/reviews/product/{product_id}` | Daftar review beserta ringkasan rating |
| `GET` | `/reviews/{review_id}` | Detail satu review |
| `POST` | `/reviews` | Membuat review |
| `PUT` | `/reviews/{review_id}` | Mengubah rating dan/atau komentar |
| `DELETE` | `/reviews/{review_id}` | Menghapus review |

Contoh request `POST /reviews`:

```json
{
  "product_id": 1,
  "user_id": 1,
  "rating": 5,
  "comment": "Produk sesuai deskripsi"
}
```

Request yang tidak valid menghasilkan `422`, produk yang tidak ditemukan
menghasilkan `422`, review duplikat menghasilkan `409`, dan gangguan pada
product-service menghasilkan `503`.

## Tests

Jalankan dari folder `review-service`:

```sh
python -m unittest discover -s tests -v
```

Test API menggunakan Flask test client dan mock untuk database serta
product-service, jadi tidak memerlukan MongoDB yang sedang aktif.
