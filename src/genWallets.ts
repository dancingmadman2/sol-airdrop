import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import { CONFIG } from './config';
function generateWallets(count: number) {
    let csvContent = '';
    
    for (let i = 0; i < count; i++) {
        const wallet = Keypair.generate();
        csvContent += `${wallet.publicKey.toString()}\n`;
    }

    fs.writeFileSync('addresses.csv', csvContent);
    console.log(`Generated ${count} addresses`);
}

generateWallets(CONFIG.generateWalletsAmount);