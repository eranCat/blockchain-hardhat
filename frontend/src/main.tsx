import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, metaMask } from 'wagmi/connectors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Get RPC URLs from environment
const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
const hardhatRpcUrl = import.meta.env.VITE_HARDHAT_RPC_URL || 'http://127.0.0.1:8545';

const config = createConfig({
  chains: [sepolia, hardhat],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl, {
      batch: true,
      retryCount: 3,
    }),
    [hardhat.id]: http(hardhatRpcUrl, {
      batch: true,
    }),
  },
  ssr: false,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);