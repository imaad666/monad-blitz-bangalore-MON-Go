# Smart Contract Setup Guide

This guide explains how to compile and deploy the Faucet smart contracts for Monad Go.

## Prerequisites

1. **Install Foundry** (for compiling contracts):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Verify installation**:
   ```bash
   forge --version
   ```

## Compiling the Contract

1. **Navigate to the contracts directory**:
   ```bash
   cd contracts
   ```

2. **Initialize Foundry** (if not already done):
   ```bash
   forge init --no-git
   ```

3. **Compile the Faucet contract**:
   ```bash
   forge build
   ```

4. **Extract the bytecode**:
   After compilation, the bytecode will be in:
   ```
   out/Faucet.sol/Faucet.json
   ```

5. **Get the bytecode**:
   Open `out/Faucet.sol/Faucet.json` and look for the `bytecode` field (or `bytecode.object`). Copy the entire bytecode string (it should start with `0x`).

6. **Set the bytecode in your environment**:
   Create or update `.env.local`:
   ```bash
   NEXT_PUBLIC_FAUCET_BYTECODE=0x608060405234801561001057600080fd5b50...
   ```
   (Replace with your actual bytecode)

## Contract Deployment Flow

1. **User creates a faucet**:
   - User enters name, funding amount, and reward per mine
   - Frontend deploys a new Faucet contract with the mine amount as constructor parameter
   - Contract address is returned from deployment

2. **Contract is funded**:
   - After deployment, the frontend sends the funding amount to the contract
   - Contract accepts funds via its `receive()` function

3. **Faucet is registered**:
   - Contract address, location, and metadata are saved to the database
   - Faucet appears on the map

## Mining Flow

1. **User approaches faucet**:
   - User must be within 50 meters of the faucet location
   - Frontend checks proximity using GPS coordinates

2. **User mines tokens**:
   - User clicks "Mine" button
   - Frontend calls `mine()` function on the contract
   - Contract transfers `MINE_AMOUNT` to the user
   - 60-second cooldown is enforced per address

3. **Database sync**:
   - After successful mining, frontend calls `/api/game/faucets/sync`
   - API reads contract balance and updates database
   - Leaderboard and user stats are refreshed

## Contract Functions

### Public Functions

- `mine()`: Mine tokens from the faucet (requires cooldown and sufficient balance)
- `getBalance()`: Get current contract balance
- `getRemainingBalance()`: Get remaining balance available for mining
- `canMine(address)`: Check if an address can mine (balance + cooldown check)
- `withdraw()`: Owner can withdraw remaining funds (emergency only)

### View Functions

- `MINE_AMOUNT`: The amount that can be mined per transaction (immutable)
- `COOLDOWN_PERIOD`: Cooldown period in seconds (60 seconds)
- `owner`: The creator/owner of the faucet
- `totalDeposited`: Total amount deposited in the faucet
- `totalMined`: Total amount mined from the faucet
- `lastMineTime(address)`: Last mine time for an address

## Testing

To test the contract locally:

1. **Start a local node** (if available for Monad testnet)
2. **Deploy using Foundry**:
   ```bash
   forge script script/Deploy.s.sol --rpc-url <RPC_URL> --private-key <PRIVATE_KEY> --broadcast
   ```

## Troubleshooting

### "Contract bytecode not found" error

- Make sure you've compiled the contract: `forge build`
- Check that `NEXT_PUBLIC_FAUCET_BYTECODE` is set in `.env.local`
- Verify the bytecode starts with `0x`

### Deployment fails

- Check that you're on Monad Testnet (Chain ID: 10143)
- Ensure you have enough MON for gas fees
- Verify the RPC endpoint is accessible

### Mining fails

- Check that you're within 50 meters of the faucet
- Verify the faucet has sufficient balance
- Check if cooldown period has passed (60 seconds)

## Environment Variables

Required environment variables:

```bash
# Contract bytecode (after compilation)
NEXT_PUBLIC_FAUCET_BYTECODE=0x...

# Optional: Wallet Connect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## Database Schema

The `faucets` table should have:
- `id`: UUID (primary key)
- `name`: Text
- `lat`: Decimal (latitude)
- `lng`: Decimal (longitude)
- `total_coins`: Integer
- `remaining_coins`: Integer
- `is_active`: Boolean
- `contract_address`: Text (nullable, stores the deployed contract address)
- `created_at`: Timestamp

