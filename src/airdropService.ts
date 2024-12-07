import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

export class AirdropService {
  private connection: Connection;
  private payer: Keypair;
  private mintPublicKey: PublicKey;

  constructor(connection: Connection, payerPrivateKey: string, mintAddress: string) {
    this.connection = connection;
    this.payer = Keypair.fromSecretKey(bs58.decode(payerPrivateKey));
    this.mintPublicKey = new PublicKey(mintAddress);
  }

  async airdropToRecipient(recipientAddress: string, amount: number): Promise<string> {
    try {
      const recipientPublicKey = new PublicKey(recipientAddress);

      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.payer,
        this.mintPublicKey,
        this.payer.publicKey
      );

      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.payer,
        this.mintPublicKey,
        recipientPublicKey
      );

      if (senderTokenAccount.amount < amount) {
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

      const transaction = new Transaction().add(transferInstruction);
      const signature = await this.connection.sendTransaction(transaction, [this.payer]);
      
      return signature;
    } catch (error:any) {
      throw new Error(`Airdrop failed for ${recipientAddress}: ${error.message}`);
    }
  }
}