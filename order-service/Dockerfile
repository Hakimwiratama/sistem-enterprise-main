FROM php:8.4-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libsqlite3-dev unzip git \
    && docker-php-ext-install mbstring pdo_mysql pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1
WORKDIR /app

COPY . .
RUN cp .env.example .env \
    && sed -i \
        -e 's/^APP_DEBUG=true$/APP_DEBUG=false/' \
        -e 's/^DB_CONNECTION=sqlite$/DB_CONNECTION=mysql/' \
        -e 's#^DB_HOST=127.0.0.1$#DB_HOST=order-db#' \
        -e 's/^DB_PORT=3307$/DB_PORT=3306/' \
        -e 's/^DB_DATABASE=ordersdb$/DB_DATABASE=ordersdb/' \
        -e 's/^DB_USERNAME=appuser$/DB_USERNAME=appuser/' \
        -e 's/^DB_PASSWORD=$/DB_PASSWORD=apppassword/' \
        -e 's#^CART_SERVICE_URL=http://127.0.0.1:3001$#CART_SERVICE_URL=http://cart-service:3001#' \
        -e 's#^PRODUCT_SERVICE_URL=http://127.0.0.1:3000$#PRODUCT_SERVICE_URL=http://product-service:3000#' \
        .env \
    && composer install --no-interaction --prefer-dist --optimize-autoloader

EXPOSE 3003

CMD ["sh", "-c", "if [ -z \"$APP_KEY\" ]; then export APP_KEY=\"$(php -r 'echo \"base64:\".base64_encode(random_bytes(32));')\"; fi; php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=3003"]
