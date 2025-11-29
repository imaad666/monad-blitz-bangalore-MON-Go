'use client';

import { useState, useEffect } from 'react';

export default function CoordinatesDisplay() {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setAccuracy(position.coords.accuracy || null);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      options
    );

    // Watch for updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setAccuracy(position.coords.accuracy || null);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      options
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  if (!coordinates) {
    return (
      <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-xs">
        <div className="text-gray-400">Coordinates</div>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-black/80 text-white px-3 py-2 rounded-lg">
      <div className="text-xs text-gray-400 mb-1">Coordinates</div>
      <div className="text-sm font-mono">
        <div>Lat: {coordinates.lat.toFixed(6)}</div>
        <div>Lng: {coordinates.lng.toFixed(6)}</div>
      </div>
      {accuracy && (
        <div className="text-xs text-gray-500 mt-1">
          ±{(accuracy / 1000).toFixed(1)}km
        </div>
      )}
    </div>
  );
}

