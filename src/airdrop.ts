import { FileReader } from './utils/fileReader';
import { CONFIG } from './config';
import * as dotenv from 'dotenv';
import { AirdropService } from './airdropService';
import { ConnectionManager } from './utils/connectionManager';
import * as fs from 'fs';

dotenv.config();

interface TransactionResult {
  address: string;
  status: 'success' | 'failed';
  signature?: string;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processInParallel(items: any[], concurrency: number, processor: (item: any) => Promise<any>) {
  const results: TransactionResult[] = [];
  let processedCount = 0;
  const total = items.length;

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    console.log(`\nProcessing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(items.length / concurrency)}`);
    
    try {
      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          try {
            const signature = await processor(item);
            processedCount++;
            
            const progress = (processedCount / total * 100).toFixed(1);
            console.log(`✅ Sent (${progress}%): ${item.address.slice(0, 4)}...${item.address.slice(-4)} (${signature.slice(0, 8)}...)`);
            
            return {
              address: item.address,
              status: 'success' as const,
              signature
            };
          } catch (error: any) {
            processedCount++;
            console.log(`❌ Failed: ${item.address.slice(0, 4)}...${item.address.slice(-4)} - ${error.message}`);
            return {
              address: item.address,
              status: 'failed' as const,
              error: error.message
            };
          }
        })
      );

      results.push(...chunkResults);
      
      if (i + concurrency < items.length) {
        const delay = 500;
        await sleep(delay);
      }
      
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }
  
  return results;
}

function saveResults(results: TransactionResult[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const successResults = results.filter(r => r.status === 'success');
  const failedResults = results.filter(r => r.status === 'failed');

  if (successResults.length > 0) {
    const successCsv = ['address,signature'].concat(
      successResults.map(r => `${r.address},${r.signature}`)
    ).join('\n');
    const successFile = `successful_airdrops_${timestamp}.csv`;
    fs.writeFileSync(successFile, successCsv);
    console.log(`\nSuccessful transactions saved to: ${successFile}`);
  }

  if (failedResults.length > 0) {
    const failedCsv = ['address,error'].concat(
      failedResults.map(r => `${r.address},${r.error}`)
    ).join('\n');
    const failedFile = `failed_airdrops_${timestamp}.csv`;
    fs.writeFileSync(failedFile, failedCsv);
    console.log(`Failed transactions saved to: ${failedFile}`);
  }
}

async function main() {
  try {
    console.log('Initializing airdrop process...');
    
    if (!CONFIG.tokenMintAddress || CONFIG.tokenMintAddress === "") {
      throw new Error("Enter mint address of the token you want to airdrop into .env.config");
    }

    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is required in .env file");
    }

    const recipients = FileReader.read();
    console.log(`Found ${recipients.length} recipients from ${CONFIG.fileConfig.type} file`);

    if (!CONFIG.amount || CONFIG.amount <= 0) {
      throw new Error("Invalid amount specified in configuration");
    }

    const uniqueEndpoints = [...new Set(CONFIG.rpcEndpoints)].filter(endpoint => endpoint && endpoint.trim() !== '');
    
    if (uniqueEndpoints.length === 0) {
      throw new Error("No valid RPC endpoints configured");
    }

    console.log(`Using ${uniqueEndpoints.length} RPC endpoint(s):`);
    uniqueEndpoints.forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint.replace(/\/.*@/, '/***@')}`);
    });

    const connectionManager = new ConnectionManager(uniqueEndpoints, {
      commitment: 'processed',
      confirmTransactionInitialTimeout: 60000,
    });

    const airdropService = new AirdropService(
      connectionManager,
      process.env.PRIVATE_KEY,
      CONFIG.tokenMintAddress
    );

    console.log('\nStarting airdrop process...');
    console.log(`Total recipients: ${recipients.length}`);
    console.log(`Amount per recipient: ${CONFIG.tokenAmount}`);
    
    const concurrency = uniqueEndpoints.length * 2;
    console.log(`Processing with concurrency of ${concurrency}\n`);

    const results = await processInParallel(recipients, concurrency, async (recipient) => {
      return await airdropService.airdropToRecipient(
        recipient.address,
        CONFIG.amount
      );
    });

    saveResults(results);

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    console.log('\nAirdrop Summary:');
    console.log('================');
    console.log(`Total Recipients: ${recipients.length}`);
    console.log(`Transactions Sent: ${successCount}`);
    console.log(`Failed to Send: ${failedCount}`);
    console.log(`Success Rate: ${((successCount / recipients.length) * 100).toFixed(2)}%`);
    console.log('\nNote: Transactions were sent but not confirmed. Check your wallet or explorer for final status.');

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();