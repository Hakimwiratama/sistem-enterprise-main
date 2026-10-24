<?php

namespace App\Services;

use App\Exceptions\ServiceUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProductServiceClient
{
    public function getProduct(int $productId): ?array
    {
        $url = rtrim(config('services.product.url'), '/')."/products/{$productId}";

        try {
            $response = Http::acceptJson()
                ->timeout(5)
                ->get($url);
        } catch (ConnectionException $exception) {
            Log::error('Product service request failed', [
                'operation' => 'get_product',
                'product_id' => $productId,
                'url' => $url,
                'error' => $exception->getMessage(),
            ]);
            throw new ServiceUnavailableException('Product', $exception);
        }

        if ($response->status() === 404) {
            return null;
        }

        if (! $response->successful()) {
            Log::error('Product service returned an unsuccessful response', [
                'operation' => 'get_product',
                'product_id' => $productId,
                'status' => $response->status(),
            ]);
            throw new ServiceUnavailableException('Product');
        }

        $product = $response->json('data');
        if (
            ! is_array($product)
            || ! is_string($product['name'] ?? null)
            || trim($product['name']) === ''
            || ! is_numeric($product['price'] ?? null)
            || (float) $product['price'] < 0
            || filter_var($product['stock'] ?? null, FILTER_VALIDATE_INT) === false
            || (int) $product['stock'] < 0
        ) {
            Log::error('Product service returned an invalid product payload', [
                'operation' => 'get_product',
                'product_id' => $productId,
            ]);
            throw new ServiceUnavailableException('Product');
        }

        return $product;
    }
}
