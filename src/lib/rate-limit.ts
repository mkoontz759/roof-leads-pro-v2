import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Create a new ratelimiter that allows 5 requests per 1 hour
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
})

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier)
  
  return {
    success,
    limit,
    reset,
    remaining,
    error: success ? null : {
      message: "Too many requests",
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      }
    }
  }
}

// Simple in-memory rate limiter

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store IP addresses and their request counts
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  // Use Array.from to convert Map entries to an array for iteration
  Array.from(rateLimitStore.entries()).forEach(([ip, entry]) => {
    if (now > entry.resetTime) {
      rateLimitStore.delete(ip);
    }
  });
}, 10 * 60 * 1000);

export function rateLimit(ip: string, limit: number, windowMs: number = 60 * 1000): boolean {
  const now = Date.now();
  const resetTime = now + windowMs;
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime });
    return true;
  }
  
  const entry = rateLimitStore.get(ip)!;
  
  // Reset if the window has expired
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = resetTime;
    return true;
  }
  
  // Increment count and check against limit
  entry.count += 1;
  return entry.count <= limit;
} 