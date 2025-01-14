import { performance } from 'perf_hooks';

export class TokenBucket {
    private tokens: number;
    private lastRefillTime: number;
    private readonly maxTokens: number;
    private readonly refillRate: number;

    constructor(maxTokens: number, refillRate: number) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.tokens = maxTokens;
        this.lastRefillTime = performance.now();
    }

    async waitForToken(): Promise<void> {
        await this.refill();
        
        if (this.tokens < 1) {
            const timeToWait = (1 / this.refillRate) * 1000;
            await new Promise(resolve => setTimeout(resolve, timeToWait));
            await this.refill();
        }
        
        this.tokens -= 1;
    }

    private async refill(): Promise<void> {
        const now = performance.now();
        const timePassed = (now - this.lastRefillTime) / 1000;
        const newTokens = timePassed * this.refillRate;
        
        this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
        this.lastRefillTime = now;
    }
} 