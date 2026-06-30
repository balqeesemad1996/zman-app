import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

const hasUpstash =
  !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN;

// تهيئة اتصال Redis بقاعدة بيانات Upstash (فقط إذا كانت المتغيرات متوفرة)
export const redis = hasUpstash
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined;

// تهيئة محدد المعدل مع دعم محدد وهمي (No-op limiter) عند غياب إعدادات Upstash
export const ratelimit =
  hasUpstash && redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "60 s"),
        analytics: true,
        prefix: "zman_ratelimit",
      })
    : ({
        limit: async () => ({ success: true }),
      } as unknown as Ratelimit);
