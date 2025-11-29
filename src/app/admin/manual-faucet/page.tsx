'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function ManualFaucetPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    contract_address: '',
    total_coins: '',
    remaining_coins: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/faucets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          contract_address: formData.contract_address,
          total_coins: parseInt(formData.total_coins) || 0,
          remaining_coins: parseInt(formData.remaining_coins) || 0,
          is_active: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setMessage({ type: 'success', text: 'Faucet added successfully!' });
      
      // Reset form
      setFormData({
        name: '',
        lat: '',
        lng: '',
        contract_address: '',
        total_coins: '',
        remaining_coins: '',
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['faucets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-faucets'] });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add faucet' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
        }));
      },
      (error) => {
        alert('Error getting location: ' + error.message);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-purple-400">Manually Add Faucet</h1>

        {message && (
          <div
            className={`p-4 rounded mb-6 ${
              message.type === 'success'
                ? 'bg-green-600/20 border border-green-600 text-green-400'
                : 'bg-red-600/20 border border-red-600 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-800 p-6 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Faucet Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="e.g., Central Park Fountain"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                required
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="12.972357"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                required
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="77.746160"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            📍 Use Current Location
          </button>

          <div>
            <label className="block text-sm font-medium mb-1">Contract Address</label>
            <input
              type="text"
              required
              value={formData.contract_address}
              onChange={(e) => setFormData({ ...formData, contract_address: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
              placeholder="0x..."
              pattern="^0x[a-fA-F0-9]{40}$"
            />
            <p className="text-xs text-gray-400 mt-1">
              Full contract address (0x followed by 40 hex characters)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Coins</label>
              <input
                type="number"
                required
                value={formData.total_coins}
                onChange={(e) => setFormData({ ...formData, total_coins: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Remaining Coins</label>
              <input
                type="number"
                required
                value={formData.remaining_coins}
                onChange={(e) => setFormData({ ...formData, remaining_coins: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="1000"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            {isSubmitting ? 'Adding...' : 'Add Faucet'}
          </button>
        </form>

        <div className="mt-8 bg-blue-600/20 border border-blue-600 p-4 rounded text-sm">
          <h3 className="font-bold mb-2">💡 Tips:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>Get contract address from your wallet transaction receipt</li>
            <li>Use the Monad Explorer to verify the contract address</li>
            <li>Total coins = Funding amount / Reward per mine</li>
            <li>Remaining coins should match the contract balance</li>
            <li>You can sync the balance later using the sync endpoint</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

