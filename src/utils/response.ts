/**
 * Standard response format for API endpoints
 */
export interface StandardResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
    };
}

/**
 * Create a standard success response
 */
export function standardSuccess<T>(data: T): StandardResponse<T> {
    return {
        success: true,
        data
    };
}

/**
 * Create a standard error response
 */
export function standardError(
    code: string,
    message: string,
    details?: any
): StandardResponse {
    return {
        success: false,
        error: {
            code,
            message,
            details,
            timestamp: new Date().toISOString()
        }
    };
}
