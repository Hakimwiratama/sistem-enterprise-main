<?php

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.cart.url' => 'http://cart-service:3001',
            'services.product.url' => 'http://product-service:3000',
        ]);
    }

    public function test_health_endpoint_returns_service_status(): void
    {
        $this->getJson('/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok', 'service' => 'order-service']);
    }

    public function test_checkout_validates_user_id(): void
    {
        $this->postJson('/orders', [])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Data yang dikirim tidak valid')
            ->assertJsonPath('errors.user_id.0', 'Field user_id wajib diisi');

        $this->postJson('/orders', ['user_id' => 0])
            ->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['user_id']]);
    }

    public function test_checkout_creates_order_with_product_snapshots_and_clears_cart(): void
    {
        $this->fakeCheckout(
            [
                ['product_id' => 1, 'quantity' => 2],
                ['product_id' => 2, 'quantity' => 1],
            ],
            [
                1 => ['id' => 1, 'name' => 'Keyboard Mekanikal', 'price' => 450000, 'stock' => 10],
                2 => ['id' => 2, 'name' => 'Mouse Wireless', 'price' => 150000, 'stock' => 5],
            ],
        );

        $response = $this->postJson('/orders', ['user_id' => 7])
            ->assertCreated()
            ->assertJsonPath('message', 'Pesanan berhasil dibuat')
            ->assertJsonPath('data.user_id', 7)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.total_amount', 1050000)
            ->assertJsonPath('data.items.0.product_name', 'Keyboard Mekanikal')
            ->assertJsonPath('data.items.0.unit_price', 450000)
            ->assertJsonPath('data.items.0.subtotal', 900000)
            ->assertJsonPath('data.items.1.product_name', 'Mouse Wireless')
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'user_id',
                    'status',
                    'total_amount',
                    'items' => [['product_id', 'product_name', 'unit_price', 'quantity', 'subtotal']],
                    'created_at',
                    'updated_at',
                ],
            ]);

        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'user_id' => 7,
            'status' => 'PENDING',
            'total_amount' => 1050000,
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'product_name' => 'Keyboard Mekanikal',
            'unit_price' => 450000,
            'quantity' => 2,
            'subtotal' => 900000,
        ]);
        $this->getJson('/orders/'.$response->json('data.id'))
            ->assertOk()
            ->assertJsonPath('data.items.0.product_name', 'Keyboard Mekanikal')
            ->assertJsonPath('data.items.0.unit_price', 450000);
        Http::assertSent(fn (Request $request) => $request->method() === 'DELETE'
            && $request->url() === 'http://cart-service:3001/carts/7');
    }

    public function test_checkout_rejects_empty_cart_and_insufficient_stock(): void
    {
        $this->fakeCheckout([], []);
        $this->postJson('/orders', ['user_id' => 7])
            ->assertConflict()
            ->assertJsonPath('message', 'Keranjang kosong');

        $this->fakeCheckout(
            [['product_id' => 1, 'quantity' => 11]],
            [1 => ['id' => 1, 'name' => 'Monitor 24 Inch', 'price' => 1000000, 'stock' => 10]],
        );
        $this->postJson('/orders', ['user_id' => 7])
            ->assertConflict()
            ->assertJsonPath('message', 'Stok Monitor 24 Inch tidak mencukupi: diminta 11, tersedia 10');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_maps_missing_product_and_unavailable_services(): void
    {
        $this->fakeCheckout([['product_id' => 99, 'quantity' => 1]], [], productNotFound: true);
        $this->postJson('/orders', ['user_id' => 7])
            ->assertConflict()
            ->assertJsonPath('message', 'Produk dengan id 99 tidak ditemukan');

        Log::spy();
        $this->fakeHttp(fn () => Http::response(['message' => 'upstream error'], 500));
        $this->postJson('/orders', ['user_id' => 7])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Cart service tidak dapat dihubungi, coba lagi nanti');

        $this->fakeHttp(function (Request $request) {
            if ($request->method() === 'GET' && parse_url($request->url(), PHP_URL_PATH) === '/carts/7') {
                return Http::response(['data' => ['items' => [['product_id' => 1, 'quantity' => 1]]]]);
            }

            return Http::response(['message' => 'upstream error'], 500);
        });
        $this->postJson('/orders', ['user_id' => 7])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Product service tidak dapat dihubungi, coba lagi nanti');
        Log::shouldHaveReceived('error')
            ->withArgs(fn (string $message, array $context) => $message === 'Product service returned an unsuccessful response'
                && $context['operation'] === 'get_product'
                && $context['product_id'] === 1
                && $context['status'] === 500)
            ->once();

        $this->fakeHttp(function (Request $request) {
            if ($request->method() === 'GET' && parse_url($request->url(), PHP_URL_PATH) === '/carts/7') {
                return Http::response(['data' => ['items' => [['product_id' => 1, 'quantity' => 1]]]]);
            }

            throw new ConnectionException('Connection refused');
        });
        $this->postJson('/orders', ['user_id' => 7])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Product service tidak dapat dihubungi, coba lagi nanti');
        Log::shouldHaveReceived('error')
            ->withArgs(fn (string $message, array $context) => $message === 'Product service request failed'
                && $context['operation'] === 'get_product'
                && $context['product_id'] === 1
                && $context['error'] === 'Connection refused')
            ->once();
    }

    public function test_checkout_remains_created_when_cart_cannot_be_cleared(): void
    {
        $this->fakeCheckout(
            [['product_id' => 1, 'quantity' => 1]],
            [1 => ['id' => 1, 'name' => 'Mouse', 'price' => 150000, 'stock' => 5]],
            clearStatus: 500,
        );

        $this->postJson('/orders', ['user_id' => 7])->assertCreated();
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_order_detail_list_and_path_ids_follow_the_contract(): void
    {
        $order = Order::create(['user_id' => 7, 'status' => 'PENDING', 'total_amount' => 150000]);
        $order->items()->create([
            'product_id' => 2,
            'product_name' => 'Mouse Wireless',
            'unit_price' => 150000,
            'quantity' => 1,
            'subtotal' => 150000,
        ]);

        $this->getJson("/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.items.0.product_name', 'Mouse Wireless');
        $this->getJson("/orders/{$order->id}x")->assertNotFound();
        $this->getJson('/orders/999')->assertNotFound();

        $this->getJson('/orders/user/7?status=SHIPPED')
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', 'Status harus PENDING, PAID, atau CANCELLED');
        $this->getJson('/orders/user/7?status=PENDING')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_payment_changes_pending_order_to_paid_only_once(): void
    {
        $order = Order::create(['user_id' => 7, 'status' => 'PENDING', 'total_amount' => 150000]);

        $this->patchJson("/orders/{$order->id}/pay")
            ->assertOk()
            ->assertJsonPath('message', 'Pesanan berhasil dibayar')
            ->assertJsonPath('data.status', 'PAID');
        $this->patchJson("/orders/{$order->id}/pay")->assertConflict();
        $this->patchJson('/orders/999/pay')->assertNotFound();
        $this->patchJson('/orders/abc/pay')->assertNotFound();
    }

    public function test_pending_order_can_be_cancelled_once(): void
    {
        $order = Order::create(['user_id' => 7, 'status' => 'PENDING', 'total_amount' => 150000]);
        $order->items()->create([
            'product_id' => 2,
            'product_name' => 'Mouse Wireless',
            'unit_price' => 150000,
            'quantity' => 1,
            'subtotal' => 150000,
        ]);

        $this->putJson("/orders/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('message', 'Pesanan berhasil dibatalkan')
            ->assertJsonPath('data.status', 'CANCELLED')
            ->assertJsonPath('data.items.0.product_name', 'Mouse Wireless');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'CANCELLED']);
        $this->getJson('/orders/user/7?status=CANCELLED')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $order->id);
        $this->putJson("/orders/{$order->id}/cancel")->assertConflict();
        $this->patchJson("/orders/{$order->id}/pay")->assertConflict();
    }

    public function test_cancelling_missing_order_returns_not_found(): void
    {
        $this->putJson('/orders/999/cancel')
            ->assertNotFound()
            ->assertJsonPath('message', 'Pesanan dengan id 999 tidak ditemukan');
        $this->putJson('/orders/abc/cancel')->assertNotFound();
    }

    public function test_paid_order_cannot_be_cancelled(): void
    {
        $order = Order::create(['user_id' => 7, 'status' => 'PAID', 'total_amount' => 150000]);

        $this->putJson("/orders/{$order->id}/cancel")
            ->assertConflict()
            ->assertJsonPath('message', 'Hanya pesanan berstatus PENDING yang dapat dibatalkan');
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'PAID']);
    }

    public function test_deleting_order_removes_it_and_its_items_from_user_order_list(): void
    {
        $deletedOrder = Order::create(['user_id' => 7, 'status' => 'PENDING', 'total_amount' => 150000]);
        $deletedOrder->items()->create([
            'product_id' => 2,
            'product_name' => 'Mouse Wireless',
            'unit_price' => 150000,
            'quantity' => 1,
            'subtotal' => 150000,
        ]);
        $remainingOrder = Order::create(['user_id' => 7, 'status' => 'PENDING', 'total_amount' => 450000]);

        $this->deleteJson("/orders/{$deletedOrder->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Pesanan berhasil dihapus');

        $this->assertDatabaseMissing('orders', ['id' => $deletedOrder->id]);
        $this->assertDatabaseMissing('order_items', ['order_id' => $deletedOrder->id]);
        $this->getJson('/orders/user/7')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $remainingOrder->id);
        $this->getJson("/orders/{$deletedOrder->id}")->assertNotFound();
    }

    public function test_deleting_missing_order_returns_not_found(): void
    {
        $this->deleteJson('/orders/999')
            ->assertNotFound()
            ->assertJsonPath('message', 'Pesanan dengan id 999 tidak ditemukan');
        $this->deleteJson('/orders/abc')->assertNotFound();
    }

    private function fakeCheckout(
        array $cartItems,
        array $products,
        int $clearStatus = 200,
        bool $productNotFound = false,
    ): void {
        $this->fakeHttp(function (Request $request) use ($cartItems, $products, $clearStatus, $productNotFound) {
            $path = parse_url($request->url(), PHP_URL_PATH);

            if ($request->method() === 'GET' && $path === '/carts/7') {
                return Http::response(['data' => ['items' => $cartItems]]);
            }

            if ($request->method() === 'GET' && preg_match('#^/products/(\d+)$#', $path, $matches)) {
                $productId = (int) $matches[1];
                if ($productNotFound || ! isset($products[$productId])) {
                    return Http::response(['message' => 'Product tidak ditemukan'], 404);
                }

                return Http::response(['data' => $products[$productId]]);
            }

            if ($request->method() === 'DELETE' && $path === '/carts/7') {
                return Http::response(['message' => 'Cart cleared'], $clearStatus);
            }

            return Http::response(['message' => 'Unexpected test request'], 500);
        });
    }

    private function fakeHttp(callable $callback): void
    {
        Http::swap(new Factory());
        Http::fake($callback);
    }
}
