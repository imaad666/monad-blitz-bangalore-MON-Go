'use client';

import { useState, useEffect } from 'react';

export function useCurrentLocation() {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser');
      setIsLoading(false);
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
        setError(null);
        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(error.message);
        setIsLoading(false);
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
        setError(null);
      },
      (error) => {
        console.error('Geolocation watch error:', error);
        setError(error.message);
      },
      options
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { coordinates, accuracy, error, isLoading };
}

