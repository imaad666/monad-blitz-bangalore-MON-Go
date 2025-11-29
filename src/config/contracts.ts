/**
 * Contract addresses and configuration
 * Update these with your deployed contract addresses
 */

// MON Token contract address on Monad Testnet
// Update this with your actual MON token contract address
export const MON_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_MON_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';

// Faucet contract deployment configuration
export const FAUCET_CONTRACT_CONFIG = {
  mineAmount: '0.01', // MON per mine
  cooldownPeriod: 60, // seconds
  miningRadius: 50, // meters
} as const;

// MonadGoManager contract address on Monad Testnet
// Update this with your deployed MonadGoManager contract address
export const MANAGER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MANAGER_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

