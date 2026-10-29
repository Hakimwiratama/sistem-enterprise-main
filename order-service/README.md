<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## Order Service

Order Service mengubah keranjang menjadi pesanan. Service ini memakai Laravel
dan MySQL, mengambil isi keranjang dari `cart-service`, mengecek nama/harga/stok
produk melalui `product-service`, menyimpan snapshot item, lalu meminta cart
dikosongkan. Stok produk tidak dikurangi. Pembayaran hanya mengubah status
`PENDING` menjadi `PAID`.

### Menjalankan

Untuk menjalankan Order Service secara terpisah, pastikan Docker Desktop aktif
dan `cart-service` serta `product-service` sudah berjalan pada port `3001` dan
`3000` (misalnya melalui Compose utama). Hentikan Order Service dari Compose
utama terlebih dahulu agar port `3003` tidak bentrok:

```sh
docker compose stop order-service
docker compose -f order-service/docker-compose.yml up --build -d
```

Jalankan perintah dari root repository. Compose khusus ini membangun Order
Service dan MySQL miliknya. Cart/Product diakses melalui
`host.docker.internal`; tidak perlu mengubah Compose atau API mereka. API
tersedia di `http://localhost:3003`, MySQL Order tersedia di
`127.0.0.1:3308`, dan migrations berjalan saat container mulai. Compose utama
masih dapat menjalankan service lain, tetapi jangan jalankan kedua Order
Service sekaligus karena keduanya memakai port `3003`.

Untuk menghentikan Compose khusus:

```sh
docker compose -f order-service/docker-compose.yml down
```

Untuk menjalankan Laravel tests di container:

```sh
docker compose run --no-deps --build --rm order-service php artisan test
```

Test menggunakan SQLite in-memory dan memalsukan HTTP ke service lain, jadi
tidak memerlukan database atau service eksternal yang sedang berjalan.

### API

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/health` | Status layanan |
| `POST` | `/orders` | Checkout; body: `{"user_id": 7}` |
| `GET` | `/orders/{id}` | Detail pesanan beserta item |
| `GET` | `/orders/user/{userId}` | Daftar pesanan, terbaru dahulu; filter opsional `?status=PENDING` atau `?status=PAID` |
| `PATCH` | `/orders/{id}/pay` | Simulasi pembayaran |
| `DELETE` | `/orders/{id}` | Menghapus pesanan beserta item-itemnya secara permanen |

Validasi body dan filter menghasilkan `422`, checkout yang tidak dapat dipenuhi
menghasilkan `409`, service dependency yang bermasalah menghasilkan `503`,
pesanan yang tidak ditemukan menghasilkan `404`, dan error tak terduga
menghasilkan `500`. Hapus pesanan bersifat permanen; item-item pesanan ikut
terhapus. Detail teknis hanya disertakan saat `APP_DEBUG=true`.
Jika cart gagal dikosongkan setelah order tersimpan, order tetap berhasil
dibuat dan kegagalan dicatat di log.

Jalankan dari `order-service` untuk menguji ketika PHP dan Composer tersedia
secara lokal:

```sh
composer install
php artisan test
```

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
