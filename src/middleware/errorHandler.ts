import type { Context, Next } from 'hono';
import { standardError } from '../utils/response';

/**
 * Custom application error class
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Global error handler middleware
 * Catches all errors and returns standardized error responses
 */
export const errorHandler = async (c: Context, next: Next) => {
    try {
        await next();
    } catch (error) {
        console.error('Error Handler: Caught error:', error);

        // Handle custom AppError
        if (error instanceof AppError) {
            return c.json(
                standardError(error.code, error.message, error.details),
                error.statusCode
            );
        }

        // Handle unexpected errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return c.json(
            standardError('INTERNAL_ERROR', 'An unexpected error occurred', errorMessage),
            500
        );
    }
};
