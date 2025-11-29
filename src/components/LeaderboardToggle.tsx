'use client';

import { useState } from 'react';
import Leaderboard from './Leaderboard';

export default function LeaderboardToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black/80 hover:bg-black/90 text-white px-3 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm sm:text-base"
        aria-label={isOpen ? 'Hide leaderboard' : 'Show leaderboard'}
      >
        <span>🏆</span>
        <span className="hidden sm:inline">Leaderboard</span>
        {isOpen ? (
          <span className="text-xs">▼</span>
        ) : (
          <span className="text-xs">▲</span>
        )}
      </button>

      {/* Leaderboard Panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 bg-black/50 z-20 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Leaderboard */}
          <div className="fixed sm:absolute top-4 sm:top-4 right-4 z-30 w-[calc(100vw-2rem)] sm:w-80 max-h-[calc(100vh-2rem)] sm:max-h-[600px]">
            <Leaderboard />
          </div>
        </>
      )}
    </>
  );
}

