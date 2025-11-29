'use client';

import { useState } from 'react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const seedFaucets = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Sample faucet data around Bangalore
      const faucets = [
        { name: 'Bangalore Palace', lat: 12.9977, lng: 77.5925, total_coins: 100 },
        { name: 'Cubbon Park', lat: 12.9716, lng: 77.5946, total_coins: 100 },
        { name: 'Vidhana Soudha', lat: 12.9784, lng: 77.5908, total_coins: 100 },
        { name: 'Lalbagh Botanical Garden', lat: 12.9507, lng: 77.5848, total_coins: 100 },
        { name: 'UB City Mall', lat: 12.9708, lng: 77.6095, total_coins: 100 },
        { name: 'Commercial Street', lat: 12.9733, lng: 77.6083, total_coins: 100 },
        { name: 'MG Road', lat: 12.9750, lng: 77.6092, total_coins: 100 },
        { name: 'Brigade Road', lat: 12.9742, lng: 77.6097, total_coins: 100 },
        { name: 'Manyata Tech Park', lat: 13.0457, lng: 77.6200, total_coins: 100 },
        { name: 'Electronic City', lat: 12.8456, lng: 77.6633, total_coins: 100 },
        { name: 'Whitefield', lat: 12.9698, lng: 77.7499, total_coins: 100 },
        { name: 'IISC Bangalore', lat: 12.9904, lng: 77.5668, total_coins: 100 },
        { name: 'Bannerghatta National Park', lat: 12.8000, lng: 77.5783, total_coins: 100 },
        { name: 'Phoenix Mall', lat: 12.9344, lng: 77.6994, total_coins: 100 },
        { name: 'Kempegowda Bus Station', lat: 12.9759, lng: 77.5663, total_coins: 100 },
        { name: 'Indiranagar', lat: 12.9789, lng: 77.6408, total_coins: 100 },
        { name: 'Koramangala', lat: 12.9352, lng: 77.6245, total_coins: 100 },
        { name: 'HSR Layout', lat: 12.9124, lng: 77.6441, total_coins: 100 },
      ];

      const response = await fetch('/api/admin/faucets/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ faucets }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to seed faucets');
      }

      setMessage({
        type: 'success',
        text: `Successfully created ${result.count} faucets!`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to seed faucets',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkFaucets = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/faucets');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch faucets');
      }

      setMessage({
        type: 'success',
        text: `Found ${result.count} faucets in the database`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to check faucets',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Admin - Seed Database</h1>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Seed Faucets</h2>
            <p className="text-gray-600 mb-4">
              This will create 18 faucet locations around Bangalore. Each faucet starts with 100 coins.
            </p>
            <button
              onClick={seedFaucets}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Seeding...' : 'Seed Faucets'}
            </button>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-xl font-semibold mb-2">Check Existing Faucets</h2>
            <p className="text-gray-600 mb-4">
              Check how many faucets are currently in the database.
            </p>
            <button
              onClick={checkFaucets}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Check Faucets'}
            </button>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-xl font-semibold mb-2">Manual SQL Seeding</h2>
            <p className="text-gray-600 mb-2">
              Alternatively, you can run the SQL seed file directly in your Supabase dashboard:
            </p>
            <code className="block bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              supabase/seed.sql
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

