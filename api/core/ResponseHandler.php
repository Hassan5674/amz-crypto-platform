<?php
/**
 * api/core/ResponseHandler.php
 * Enforces unified JSON response format {success: boolean, data: any, message: string}
 */

class ResponseHandler {
    public static function success($data = null, string $message = 'Success', int $statusCode = 200): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'data' => $data,
            'message' => $message
        ]);
        exit;
    }

    public static function error(string $message = 'An error occurred', int $statusCode = 400, $data = null): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'data' => $data,
            'message' => $message
        ]);
        exit;
    }
}

// Global helper functions for convenience
if (!function_exists('api_success')) {
    function api_success($data = null, string $message = 'Success', int $statusCode = 200) {
        ResponseHandler::success($data, $message, $statusCode);
    }
}

if (!function_exists('api_error')) {
    function api_error(string $message = 'An error occurred', int $statusCode = 400, $data = null) {
        ResponseHandler::error($message, $statusCode, $data);
    }
}
?>
