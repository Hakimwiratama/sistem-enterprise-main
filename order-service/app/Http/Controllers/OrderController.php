<?php

namespace App\Http\Controllers;

use App\Exceptions\CheckoutConflictException;
use App\Exceptions\OrderNotFoundException;
use App\Exceptions\ServiceUnavailableException;
use App\Http\Requests\CheckoutOrderRequest;
use App\Http\Requests\ListUserOrdersRequest;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class OrderController extends Controller
{
    public function __construct(private OrderService $orderService) {}

    public function health(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'service' => 'order-service',
        ]);
    }

    public function store(CheckoutOrderRequest $request): JsonResponse
    {
        try {
            return response()->json([
                'message' => 'Pesanan berhasil dibuat',
                'data' => $this->orderData(
                    $this->orderService->checkout((int) $request->validated('user_id'))
                ),
            ], 201);
        } catch (CheckoutConflictException $exception) {
            return response()->json(['message' => $exception->getMessage()], 409);
        } catch (ServiceUnavailableException $exception) {
            return $this->serviceUnavailable($exception);
        } catch (Throwable $exception) {
            return $this->serverError($exception, 'membuat pesanan');
        }
    }

    public function show(string $id): JsonResponse
    {
        try {
            return response()->json([
                'message' => 'Berhasil mengambil pesanan',
                'data' => $this->orderData($this->orderService->find((int) $id)),
            ]);
        } catch (OrderNotFoundException $exception) {
            return response()->json(['message' => $exception->getMessage()], 404);
        } catch (Throwable $exception) {
            return $this->serverError($exception, 'mengambil pesanan');
        }
    }

    public function userOrders(ListUserOrdersRequest $request, string $userId): JsonResponse
    {
        try {
            return response()->json([
                'message' => 'Berhasil mengambil daftar pesanan',
                'data' => array_map(
                    fn (Order $order) => $this->orderData($order),
                    $this->orderService->findForUser((int) $userId, $request->validated('status')),
                ),
            ]);
        } catch (Throwable $exception) {
            return $this->serverError($exception, 'mengambil daftar pesanan');
        }
    }

    public function pay(string $id): JsonResponse
    {
        try {
            return response()->json([
                'message' => 'Pesanan berhasil dibayar',
                'data' => $this->orderData($this->orderService->pay((int) $id)),
            ]);
        } catch (OrderNotFoundException $exception) {
            return response()->json(['message' => $exception->getMessage()], 404);
        } catch (CheckoutConflictException $exception) {
            return response()->json(['message' => $exception->getMessage()], 409);
        } catch (Throwable $exception) {
            return $this->serverError($exception, 'membayar pesanan');
        }
    }

    public function destroy(string $id): JsonResponse
    {
        try {
            $this->orderService->delete((int) $id);

            return response()->json(['message' => 'Pesanan berhasil dihapus']);
        } catch (OrderNotFoundException $exception) {
            return response()->json(['message' => $exception->getMessage()], 404);
        } catch (Throwable $exception) {
            return $this->serverError($exception, 'menghapus pesanan');
        }
    }

    private function serviceUnavailable(ServiceUnavailableException $exception): JsonResponse
    {
        $message = $exception->serviceName === 'Cart'
            ? 'Cart service tidak dapat dihubungi, coba lagi nanti'
            : 'Product service tidak dapat dihubungi, coba lagi nanti';
        $body = ['message' => $message];

        if (config('app.debug')) {
            $body['error'] = $exception->getPrevious()?->getMessage() ?? $exception->getMessage();
        }

        return response()->json($body, 503);
    }

    private function orderData(Order $order): array
    {
        return [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'status' => $order->status,
            'total_amount' => (float) $order->total_amount,
            'items' => $order->items->map(fn ($item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'unit_price' => (float) $item->unit_price,
                'quantity' => $item->quantity,
                'subtotal' => (float) $item->subtotal,
            ])->values(),
            'created_at' => $order->created_at->toISOString(),
            'updated_at' => $order->updated_at->toISOString(),
        ];
    }

    private function serverError(Throwable $exception, string $action): JsonResponse
    {
        Log::error("Gagal {$action}", [
            'error' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
        ]);

        $body = ['message' => "Gagal {$action}"];
        if (config('app.debug')) {
            $body['error'] = $exception->getMessage();
        }

        return response()->json($body, 500);
    }
}
