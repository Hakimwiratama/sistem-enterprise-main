<?php

namespace App\Services;

use App\Exceptions\ServiceUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CartServiceClient
{
    public function getCart(int $userId): array
    {
        $url = rtrim(config('services.cart.url'), '/')."/carts/{$userId}";

        try {
            $response = Http::acceptJson()
                ->timeout(5)
                ->get($url);
        } catch (ConnectionException $exception) {
            Log::error('Cart service request failed', [
                'operation' => 'get_cart',
                'user_id' => $userId,
                'url' => $url,
                'error' => $exception->getMessage(),
            ]);
            throw new ServiceUnavailableException('Cart', $exception);
        }

        if (! $response->successful()) {
            Log::error('Cart service returned an unsuccessful response', [
                'operation' => 'get_cart',
                'user_id' => $userId,
                'status' => $response->status(),
            ]);
            throw new ServiceUnavailableException('Cart');
        }

        $items = $response->json('data.items');
        if (! is_array($items)) {
            Log::error('Cart service returned an invalid cart payload', [
                'operation' => 'get_cart',
                'user_id' => $userId,
            ]);
            throw new ServiceUnavailableException('Cart');
        }

        foreach ($items as $item) {
            if (
                ! is_array($item)
                || filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT) === false
                || (int) $item['product_id'] < 1
                || filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT) === false
                || (int) $item['quantity'] < 1
            ) {
                Log::error('Cart service returned an invalid cart item', [
                    'operation' => 'get_cart',
                    'user_id' => $userId,
                ]);
                throw new ServiceUnavailableException('Cart');
            }
        }

        return $items;
    }

    public function clearCart(int $userId): void
    {
        $url = rtrim(config('services.cart.url'), '/')."/carts/{$userId}";

        try {
            $response = Http::acceptJson()
                ->timeout(5)
                ->delete($url);
        } catch (Throwable $exception) {
            Log::warning('Cart service request failed', [
                'operation' => 'clear_cart',
                'user_id' => $userId,
                'url' => $url,
                'error' => $exception->getMessage(),
            ]);
            throw new ServiceUnavailableException('Cart', $exception);
        }

        if (! $response->successful()) {
            Log::warning('Cart service returned an unsuccessful response', [
                'operation' => 'clear_cart',
                'user_id' => $userId,
                'status' => $response->status(),
            ]);
            throw new ServiceUnavailableException('Cart');
        }
    }
}
