# Solana token airdrop

Simple airdrop script for solana tokens

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- A Solana wallet with a private key
- Access to a Solana RPC provider
- A csv or a json file with recipient addresses in it.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dancingmadman2/sol-airdrop.git
   cd sol-airdrop

2. Install dependencies

    ```bash
    npm install
    ```

### Configuration

#### Wallet and RPC Settings (.env)

Example `.env`:
```ini
PRIVATE_KEY=yourSolWalletsPrivateKeyString
RPC_ENDPOINT=https://summer-omniscient-gadget.solana-mainnet.quiknode.pro/apiKey
```

#### Airdrop parameters (.env.config)

Example `.env.config`:
```ini
TOKEN_MINT_ADDRESS=HAWKThXRcNL9ZGZKqgUXLm4W8tnRZ7U6MVdEepSutj34
AMOUNT=100000
FILE_TYPE=csv # or json
FILE_PATH=addresses.csv # or addresses.json
```

Example `addresses.json`:
```json
[
    { "address": "address1"},
    { "address": "address2"},
    { "address": "address3"}
]  
```

Example `addresses.csv`:
```csv
address
address1
address2
address3
```

### Usage

```bash
ts-node src/airdrop.ts
```