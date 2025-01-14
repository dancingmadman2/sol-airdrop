import { Connection, ConnectionConfig } from '@solana/web3.js';
import { TokenBucket } from './rateLimiter';

export class ConnectionManager {
    private connections: Connection[];
    private rateLimiters: TokenBucket[];
    private currentIndex: number = 0;
    private readonly RATE_LIMIT = 2;
    private readonly BURST_LIMIT = 4;

    constructor(endpoints: string[], config: ConnectionConfig) {
        this.connections = endpoints.map(endpoint => new Connection(endpoint, config));
        this.rateLimiters = endpoints.map(() => new TokenBucket(this.BURST_LIMIT, this.RATE_LIMIT));
    }

    private getNextConnection(): { connection: Connection; rateLimiter: TokenBucket } {
        const connection = this.connections[this.currentIndex];
        const rateLimiter = this.rateLimiters[this.currentIndex];
        
        this.currentIndex = (this.currentIndex + 1) % this.connections.length;
        
        return { connection, rateLimiter };
    }

    async executeWithRetry<T>(
        operation: (connection: Connection) => Promise<T>,
        errorMessage: string,
        maxRetries: number = 3
    ): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt < maxRetries * this.connections.length; attempt++) {
            const { connection, rateLimiter } = this.getNextConnection();
            
            try {
                await rateLimiter.waitForToken();
                return await operation(connection);
            } catch (error: any) {
                lastError = error;
                
                if (error.message?.includes('429') || error.message?.includes('request limit reached')) {
                    console.log(`Rate limit hit on endpoint ${this.currentIndex}, rotating to next...`);
                    continue;
                }
                
                if (attempt % this.connections.length === this.connections.length - 1) {
                    console.log(`All endpoints failed, retrying after delay...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        throw new Error(`${errorMessage}: ${lastError?.message || 'Unknown error'}`);
    }

    getAllConnections(): Connection[] {
        return this.connections;
    }
} 