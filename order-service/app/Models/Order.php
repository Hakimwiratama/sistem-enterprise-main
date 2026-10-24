<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'status', 'total_amount'])]
class Order extends Model
{
    protected function casts(): array
    {
        return ['total_amount' => 'float'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
