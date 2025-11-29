import { http, createConfig } from 'wagmi';
import { metaMask, walletConnect } from 'wagmi/connectors';
import { defineChain } from 'viem';

// Monad Testnet configuration
const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-testnet.monadinfra.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet-explorer.monad.xyz',
    },
  },
  testnet: true,
});

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    metaMask(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
});
