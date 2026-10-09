<?php

use App\Models\CartItem;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user can view an empty cart', function () {
    $this->get('/carts/1')
        ->assertOk()
        ->assertJsonPath('data.user_id', 1)
        ->assertJsonPath('data.items', [])
        ->assertJsonPath('data.total_quantity', 0);
});

test('adding the same product increases its quantity instead of creating another item', function () {
    $payload = ['user_id' => 1, 'product_id' => 10, 'quantity' => 2];

    $this->postJson('/carts', $payload)
        ->assertCreated()
        ->assertJsonPath('data.quantity', 2);

    $this->postJson('/carts', $payload)
        ->assertOk()
        ->assertJsonPath('data.quantity', 4);

    expect(CartItem::count())->toBe(1);

    $this->getJson('/carts/1')
        ->assertOk()
        ->assertJsonPath('data.total_quantity', 4);
});

test('a cart item can be updated and deleted', function () {
    $item = CartItem::create(['user_id' => 1, 'product_id' => 10, 'quantity' => 2]);

    $this->putJson("/carts/items/{$item->id}", ['quantity' => 5])
        ->assertOk()
        ->assertJsonPath('data.quantity', 5);

    $this->deleteJson("/carts/items/{$item->id}")
        ->assertOk();

    $this->assertDatabaseMissing('cart_items', ['id' => $item->id]);
});

test('a user can clear their cart without deleting another users items', function () {
    CartItem::create(['user_id' => 1, 'product_id' => 10, 'quantity' => 2]);
    CartItem::create(['user_id' => 1, 'product_id' => 11, 'quantity' => 1]);
    $otherUsersItem = CartItem::create(['user_id' => 2, 'product_id' => 10, 'quantity' => 3]);

    $this->deleteJson('/carts/1')
        ->assertOk()
        ->assertJsonPath('data.deleted_items', 2);

    $this->assertDatabaseHas('cart_items', ['id' => $otherUsersItem->id]);
});

test('invalid input returns validation errors as JSON', function () {
    $this->postJson('/carts', ['user_id' => 1])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['product_id']);

    $this->putJson('/carts/items/1', ['quantity' => 0])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['quantity']);
});

test('missing cart items and routes return JSON 404 responses', function () {
    $this->putJson('/carts/items/999', ['quantity' => 1])
        ->assertNotFound()
        ->assertJsonPath('message', 'Item Keranjang dengan id 999 tidak ditemukan');

    $this->deleteJson('/carts/items/999')
        ->assertNotFound();

    $this->get('/carts/not-a-user')
        ->assertNotFound()
        ->assertJson([]);
});
