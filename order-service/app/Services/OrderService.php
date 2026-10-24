<?php

namespace App\Services;

use App\Exceptions\CheckoutConflictException;
use App\Exceptions\OrderNotFoundException;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class OrderService
{
    public function __construct(
        private CartServiceClient $cartClient,
        private ProductServiceClient $productClient,
    ) {}

    public function checkout(int $userId): Order
    {
        $cartItems = $this->cartClient->getCart($userId);
        if ($cartItems === []) {
            throw new CheckoutConflictException('Keranjang kosong');
        }

        $items = [];
        $total = 0;

        foreach ($cartItems as $cartItem) {
            $productId = (int) $cartItem['product_id'];
            $quantity = (int) $cartItem['quantity'];
            $product = $this->productClient->getProduct($productId);

            if ($product === null) {
                throw new CheckoutConflictException("Produk dengan id {$productId} tidak ditemukan");
            }

            if ((int) $product['stock'] < $quantity) {
                throw new CheckoutConflictException(
                    "Stok {$product['name']} tidak mencukupi: diminta {$quantity}, tersedia {$product['stock']}"
                );
            }

            $unitPrice = round((float) $product['price'], 2);
            $subtotal = round($unitPrice * $quantity, 2);
            $total = round($total + $subtotal, 2);
            $items[] = [
                'product_id' => $productId,
                'product_name' => $product['name'],
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'subtotal' => $subtotal,
            ];
        }

        $order = DB::transaction(function () use ($userId, $items, $total): Order {
            $order = Order::create([
                'user_id' => $userId,
                'status' => 'PENDING',
                'total_amount' => $total,
            ]);
            $order->items()->createMany($items);

            return $order->load('items');
        });

        try {
            $this->cartClient->clearCart($userId);
        } catch (Throwable $exception) {
            Log::warning('Order was created but cart could not be cleared', [
                'order_id' => $order->id,
                'user_id' => $userId,
                'error' => $exception->getMessage(),
            ]);
        }

        return $order;
    }

    public function find(int $id): Order
    {
        $order = Order::with('items')->find($id);
        if (! $order) {
            throw new OrderNotFoundException("Pesanan dengan id {$id} tidak ditemukan");
        }

        return $order;
    }

    public function findForUser(int $userId, ?string $status): array
    {
        return Order::with('items')
            ->where('user_id', $userId)
            ->when($status !== null, fn ($query) => $query->where('status', $status))
            ->latest('id')
            ->get()
            ->all();
    }

    public function pay(int $id): Order
    {
        return DB::transaction(function () use ($id): Order {
            $order = Order::query()->lockForUpdate()->find($id);
            if (! $order) {
                throw new OrderNotFoundException("Pesanan dengan id {$id} tidak ditemukan");
            }

            if ($order->status !== 'PENDING') {
                throw new CheckoutConflictException('Pesanan tidak berstatus PENDING');
            }

            $order->update(['status' => 'PAID']);

            return $order->load('items');
        });
    }
}
