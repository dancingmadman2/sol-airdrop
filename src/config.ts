import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.config' });

export const CONFIG = {
  fileConfig: {
    type: process.env.FILE_TYPE || 'json',
    path: process.env.FILE_PATH || 'addresses.json'
  },
  tokenMintAddress: process.env.TOKEN_MINT_ADDRESS,
  connection: process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  tokenAmount: Number(process.env.AMOUNT),
  amount: Number(process.env.AMOUNT)*100000000
} as const;