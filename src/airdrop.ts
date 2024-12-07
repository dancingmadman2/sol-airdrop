import { Connection } from '@solana/web3.js';
import { FileReader } from './utils/fileReader';
import { CONFIG } from './config';
import * as dotenv from 'dotenv';
import { AirdropService } from './airdropService';

dotenv.config();

async function main() {
  try {  

    if(CONFIG.tokenMintAddress==undefined || CONFIG.tokenMintAddress == ""){
      console.error("Enter mint address of the token you want to airdrop into .env.config");
      return;
    }

    const recipients = FileReader.read();
    console.log(`Found ${recipients.length} recipients from ${CONFIG.fileConfig.type} file`);



    const connection = new Connection(CONFIG.connection, "confirmed");
    const airdropService = new AirdropService(
      connection,
      process.env.PRIVATE_KEY!,
      CONFIG.tokenMintAddress
    );

    for (const recipient of recipients) {
      try {
        const signature = await airdropService.airdropToRecipient(
          recipient.address,
          CONFIG.amount
        );
        console.log(`Airdropped ${CONFIG.tokenAmount} tokens to ${recipient.address} (Tx: ${signature})`);
      } catch (error:any) {
        console.error(error.message);
      }
    }
  } catch (error:any) {
    console.error('Airdrop failed:', error.message);
  }
}

main();