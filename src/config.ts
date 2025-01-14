import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.config' });

function getConfiguredRpcEndpoints(): string[] {
  const endpoints: string[] = [];
  let index = 0;
  
  while (true) {
    const endpoint = process.env[`RPC_ENDPOINT_${index}`];
    if (!endpoint) break;
    endpoints.push(endpoint);
    index++;
  }

  return endpoints.length > 0 ? endpoints : ['https://api.mainnet-beta.solana.com'];
}

export const CONFIG = {
  fileConfig: {
    type: process.env.FILE_TYPE || 'json',
    path: process.env.FILE_PATH || 'addresses.json'
  },
  tokenMintAddress: process.env.TOKEN_MINT_ADDRESS || "",
  rpcEndpoints: getConfiguredRpcEndpoints(),
  tokenAmount: Number(process.env.AMOUNT),
  amount: Number(process.env.AMOUNT)*100000000,
  generateWalletsAmount: Number(process.env.GENERATE_WALLETS_AMOUNT)
} as const;