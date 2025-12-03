import type { Context, Next } from 'hono';

/**
 * CORS headers configuration
 */
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Transcript',
    'Access-Control-Max-Age': '86400'
};

/**
 * CORS middleware for Cloudflare Workers
 * Handles preflight requests and sets CORS headers
 */
export const corsMiddleware = async (c: Context, next: Next) => {
    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
        console.log('CORS: Handling OPTIONS preflight request:', c.req.url);
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }

    // Set CORS headers for actual requests
    Object.entries(corsHeaders).forEach(([key, value]) => {
        c.res.headers.set(key, value);
    });

    await next();
};
