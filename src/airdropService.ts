import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { ConnectionManager } from './utils/connectionManager';

export class AirdropService {
  private connectionManager: ConnectionManager;
  private payer: Keypair;
  private mintPublicKey: PublicKey;
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000;

  constructor(connectionManager: ConnectionManager, payerPrivateKey: string, mintAddress: string) {
    this.connectionManager = connectionManager;
    this.payer = Keypair.fromSecretKey(bs58.decode(payerPrivateKey));
    this.mintPublicKey = new PublicKey(mintAddress);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getLatestBlockhashWithRetry(): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    return this.connectionManager.executeWithRetry(
      (connection) => connection.getLatestBlockhash('confirmed'),
      'Failed to get latest blockhash'
    );
  }

  async airdropToRecipient(recipientAddress: string, amount: number): Promise<string> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`Sending to ${recipientAddress.slice(0, 4)}...${recipientAddress.slice(-4)}`);
        const recipientPublicKey = new PublicKey(recipientAddress);

        const senderTokenAccount = await this.connectionManager.executeWithRetry(
          async (connection) => getOrCreateAssociatedTokenAccount(
            connection,
            this.payer,
            this.mintPublicKey,
            this.payer.publicKey,
            true
          ),
          'Failed to get/create sender token account'
        );

        const recipientTokenAccount = await this.connectionManager.executeWithRetry(
          async (connection) => getOrCreateAssociatedTokenAccount(
            connection,
            this.payer,
            this.mintPublicKey,
            recipientPublicKey,
            true
          ),
          'Failed to get/create recipient token account'
        );

        const balance = await this.connectionManager.executeWithRetry(
          (connection) => connection.getTokenAccountBalance(senderTokenAccount.address),
          'Failed to get token balance'
        );

        if (Number(balance.value.amount) < amount) {
          throw new Error(`Insufficient balance in sender's account: ${senderTokenAccount.address}`);
        }

        const transferInstruction = createTransferInstruction(
          senderTokenAccount.address,
          recipientTokenAccount.address,
          this.payer.publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        );

        const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 250000
        });

        const transaction = new Transaction();
        transaction.add(computeBudgetIx, transferInstruction);

        const { blockhash } = await this.getLatestBlockhashWithRetry();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.payer.publicKey;

        const signature = await this.connectionManager.executeWithRetry(
          async (connection) => {
            transaction.sign(this.payer);
            return await connection.sendRawTransaction(transaction.serialize(), {
              skipPreflight: false,
              maxRetries: 2,
            });
          },
          'Failed to send transaction'
        );

        return signature;
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        console.log(`Attempt ${attempt + 1} failed: ${errorMessage}`);
        
        if (attempt === this.MAX_RETRIES - 1) {
          throw new Error(`Failed after ${this.MAX_RETRIES} attempts: ${errorMessage}`);
        }
        
        const backoff = Math.min(this.RETRY_DELAY * Math.pow(2, attempt), 5000);
        await this.sleep(backoff);
      }
    }
    throw new Error('Unexpected error in airdrop process');
  }
}