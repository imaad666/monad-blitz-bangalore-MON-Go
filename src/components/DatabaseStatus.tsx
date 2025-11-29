'use client';

import { useEffect, useState } from 'react';

interface TestResult {
  name: string;
  status: 'loading' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function DatabaseStatus() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Check Supabase connection and faucets table exists
    testResults.push({ name: 'Supabase Connection', status: 'loading' });
    setResults([...testResults]);

    try {
      const response = await fetch('/api/supabase/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'faucets', select: '*', limit: 1 }),
      });
      const result = await response.json();

      if (response.ok && !result.error) {
        testResults[0] = {
          name: 'Supabase Connection & faucets Table',
          status: 'success',
          message: `Connected! Found ${Array.isArray(result.data) ? result.data.length : 0} records`,
        };
      } else {
        testResults[0] = {
          name: 'Supabase Connection & faucets Table',
          status: 'error',
          message: result.error || 'Connection failed',
        };
      }
    } catch (error: any) {
      testResults[0] = {
        name: 'Supabase Connection',
        status: 'error',
        message: error.message || 'Failed to connect',
      };
    }

    setResults([...testResults]);

    // Test 2: Check user_claims table
    testResults.push({ name: 'user_claims Table', status: 'loading' });
    setResults([...testResults]);

    try {
      const response = await fetch('/api/supabase/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'user_claims', select: '*', limit: 1 }),
      });
      const result = await response.json();

      if (response.ok && !result.error) {
        testResults[1] = {
          name: 'user_claims Table',
          status: 'success',
          message: `Table exists! Found ${Array.isArray(result.data) ? result.data.length : 0} records`,
        };
      } else {
        testResults[1] = {
          name: 'user_claims Table',
          status: 'error',
          message: result.error || 'Table check failed',
        };
      }
    } catch (error: any) {
      testResults[1] = {
        name: 'user_claims Table',
        status: 'error',
        message: error.message || 'Failed',
      };
    }

    setResults([...testResults]);

    // Test 3: Check view_leaderboard
    testResults.push({ name: 'view_leaderboard View', status: 'loading' });
    setResults([...testResults]);

    try {
      const response = await fetch('/api/supabase/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'view_leaderboard', select: '*', limit: 5 }),
      });
      const result = await response.json();

      if (response.ok && !result.error) {
        testResults[2] = {
          name: 'view_leaderboard View',
          status: 'success',
          message: `View works! ${Array.isArray(result.data) ? result.data.length : 0} users on leaderboard`,
          data: result.data,
        };
      } else {
        testResults[2] = {
          name: 'view_leaderboard View',
          status: 'error',
          message: result.error || 'View check failed',
        };
      }
    } catch (error: any) {
      testResults[2] = {
        name: 'view_leaderboard View',
        status: 'error',
        message: error.message || 'Failed',
      };
    }

    setResults([...testResults]);

    // Test 4: Check view_recent_activity
    testResults.push({ name: 'view_recent_activity View', status: 'loading' });
    setResults([...testResults]);

    try {
      const response = await fetch('/api/supabase/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'view_recent_activity', select: '*', limit: 5 }),
      });
      const result = await response.json();

      if (response.ok && !result.error) {
        testResults[3] = {
          name: 'view_recent_activity View',
          status: 'success',
          message: `View works! ${Array.isArray(result.data) ? result.data.length : 0} recent activities`,
          data: result.data,
        };
      } else {
        testResults[3] = {
          name: 'view_recent_activity View',
          status: 'error',
          message: result.error || 'View check failed',
        };
      }
    } catch (error: any) {
      testResults[3] = {
        name: 'view_recent_activity View',
        status: 'error',
        message: error.message || 'Failed',
      };
    }

    setResults([...testResults]);

    // Test 5: Test claim_coins function (requires a faucet to exist)
    testResults.push({ name: 'claim_coins Function', status: 'loading' });
    setResults([...testResults]);

    try {
      // First, get a faucet or create a test one
      let faucetId = null;
      const faucetsResponse = await fetch('/api/supabase/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'faucets', select: 'id,remaining_coins', limit: 1 }),
      });
      const faucetsResult = await faucetsResponse.json();

      if (faucetsResult.data && faucetsResult.data.length > 0) {
        faucetId = faucetsResult.data[0].id;
      }

      if (faucetId) {
        // Test the function (with a test wallet address)
        const functionResponse = await fetch('/api/supabase/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: 'claim_coins',
            params: {
              p_faucet_id: faucetId,
              p_user_wallet: `0x${Date.now().toString(16)}`, // Unique test address
            },
          }),
        });
        const functionResult = await functionResponse.json();

        if (functionResponse.ok && functionResult.data?.success) {
          testResults[4] = {
            name: 'claim_coins Function',
            status: 'success',
            message: `Function works! Remaining coins: ${functionResult.data.remaining_coins}`,
            data: functionResult.data,
          };
        } else {
          testResults[4] = {
            name: 'claim_coins Function',
            status: 'error',
            message: functionResult.data?.error || functionResult.error || 'Function test failed',
            data: functionResult.data,
          };
        }
      } else {
        testResults[4] = {
          name: 'claim_coins Function',
          status: 'error',
          message: 'No faucets available to test (create a faucet first)',
        };
      }
    } catch (error: any) {
      testResults[4] = {
        name: 'claim_coins Function',
        status: 'error',
        message: error.message || 'Failed to test function',
      };
    }

    setResults([...testResults]);
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests on mount
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const allPassed = results.length > 0 && results.every((r) => r.status === 'success');
  const hasErrors = results.some((r) => r.status === 'error');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Database Status Check</h2>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running Tests...' : 'Re-run Tests'}
        </button>
      </div>

      {allPassed && !isRunning && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg">
          <p className="font-semibold">🎉 All tests passed! Your database is working correctly.</p>
        </div>
      )}

      {hasErrors && !isRunning && (
        <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg">
          <p className="font-semibold">⚠️ Some tests failed. Check the details below.</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg ${getStatusColor(result.status)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{getStatusIcon(result.status)}</span>
                  <span className="font-semibold">{result.name}</span>
                </div>
                {result.message && (
                  <p className="text-sm mt-1 ml-7">{result.message}</p>
                )}
                {result.data && result.status === 'success' && (
                  <details className="mt-2 ml-7">
                    <summary className="text-xs cursor-pointer hover:underline">
                      View details
                    </summary>
                    <pre className="mt-2 p-2 bg-black/10 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !isRunning && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
          Click "Re-run Tests" to check your database setup
        </div>
      )}
    </div>
  );
}

