'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Faucet {
  id: string;
  name: string;
  lat: number;
  lng: number;
  total_coins: number;
  remaining_coins: number;
  is_active: boolean;
  contract_address: string | null;
  created_at: string;
}

const formatAddress = (addr: string | null | undefined) => {
  if (!addr) return 'Not set';
  if (!addr.startsWith('0x') || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export default function AdminFaucetsPage() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    total_coins: '10',
    remaining_coins: '10',
  });

  // Fetch all faucets
  const { data: faucetsData, isLoading } = useQuery<{ data: Faucet[]; count: number }>({
    queryKey: ['admin-faucets'],
    queryFn: async () => {
      const response = await fetch('/api/admin/faucets');
      if (!response.ok) throw new Error('Failed to fetch faucets');
      return response.json();
    },
  });

  const faucets = faucetsData?.data || [];

  const handleCreateFaucet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/faucets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          total_coins: parseInt(formData.total_coins),
          remaining_coins: parseInt(formData.remaining_coins),
          is_active: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create faucet');
      }

      // Reset form and refresh
      setFormData({ name: '', lat: '', lng: '', total_coins: '10', remaining_coins: '10' });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin-faucets'] });
      queryClient.invalidateQueries({ queryKey: ['faucets'] });
      
      alert(`Faucet "${result.data.name}" created successfully!`);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateContract = async (faucetId: string, contractAddress: string) => {
    try {
      const response = await fetch('/api/admin/faucets/contract', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faucet_id: faucetId,
          contract_address: contractAddress,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update contract address');
      }

      queryClient.invalidateQueries({ queryKey: ['admin-faucets'] });
      queryClient.invalidateQueries({ queryKey: ['faucets'] });
      alert('Contract address updated successfully!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600">Loading faucets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin - Manage Faucets</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add New Faucet'}
            </button>
          </div>

          {/* Create Faucet Form */}
          {showForm && (
            <form onSubmit={handleCreateFaucet} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Create New Faucet</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Central Park"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="12.961311"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="77.710243"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Coins (default: 10 = 0.1 MON, each coin = 0.01 MON)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.total_coins}
                    onChange={(e) => setFormData({ ...formData, total_coins: e.target.value, remaining_coins: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.total_coins ? `= ${(parseInt(formData.total_coins) * 0.01).toFixed(2)} MON total` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>After creating:</strong> Deploy a faucet contract, fund it with MON tokens, then set the contract address above.
                </p>
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Faucet'}
              </button>
            </form>
          )}

          {/* Admin Info */}
          <div className="text-sm text-gray-600 mb-4">
            Connected as: <span className="font-mono">{address}</span>
          </div>
        </div>

        {/* Faucets List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">All Faucets ({faucets.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {faucets.map((faucet) => (
                  <FaucetRow
                    key={faucet.id}
                    faucet={faucet}
                    onUpdateContract={handleUpdateContract}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaucetRow({
  faucet,
  onUpdateContract,
}: {
  faucet: Faucet;
  onUpdateContract: (id: string, address: string) => void;
}) {
  const [showContractInput, setShowContractInput] = useState(false);
  const [contractAddress, setContractAddress] = useState(faucet.contract_address || '');

  const handleSubmit = () => {
    if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Invalid contract address format');
      return;
    }
    onUpdateContract(faucet.id, contractAddress);
    setShowContractInput(false);
  };

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{faucet.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">
          {faucet.lat.toFixed(6)}, {faucet.lng.toFixed(6)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {faucet.remaining_coins}/{faucet.total_coins}
        </div>
      </td>
      <td className="px-6 py-4">
        {showContractInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="0x..."
            />
            <button
              onClick={handleSubmit}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowContractInput(false);
                setContractAddress(faucet.contract_address || '');
              }}
              className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-sm font-mono text-gray-600">
              {formatAddress(faucet.contract_address)}
            </div>
            <button
              onClick={() => setShowContractInput(true)}
              className="text-xs text-purple-600 hover:text-purple-700"
            >
              {faucet.contract_address ? 'Edit' : 'Set'}
            </button>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            faucet.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {faucet.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <a
          href={`https://www.google.com/maps?q=${faucet.lat},${faucet.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-900"
        >
          View on Map
        </a>
      </td>
    </tr>
  );
}

