'use client';

import { useConnect, useConnectors, useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';

export function WalletOptions() {
  const { connect } = useConnect();
  const connectors = useConnectors();

  if (connectors.length === 0) {
    return (
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-4">No wallets available</p>
        <p className="text-gray-500 text-xs">
          Install a wallet extension like MetaMask to continue
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector) => (
        <WalletOption
          key={connector.uid}
          connector={connector}
          onClick={() => connect({ connector })}
        />
      ))}
    </div>
  );
}

function WalletOption({
  connector,
  onClick,
}: {
  connector: any;
  onClick: () => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const provider = await connector.getProvider();
      setReady(!!provider);
    })();
  }, [connector]);

  return (
    <button
      disabled={!ready}
      onClick={onClick}
      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-none font-semibold transition text-center"
    >
      {connector.name}
    </button>
  );
}

export function Connection() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  return (
      <button
        onClick={() => disconnect()}
      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-none transition text-sm font-semibold w-full text-center"
      >
        Disconnect
      </button>
  );
}

export function ConnectWallet() {
  const { isConnected } = useAccount();

  if (isConnected) return <Connection />;
  return <WalletOptions />;
}

