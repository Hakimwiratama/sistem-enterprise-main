<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class ServiceUnavailableException extends RuntimeException
{
    public function __construct(
        public readonly string $serviceName,
        ?Throwable $previous = null,
    ) {
        parent::__construct("{$serviceName} service is unavailable", 0, $previous);
    }
}
