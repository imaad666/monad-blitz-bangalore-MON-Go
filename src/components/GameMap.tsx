'use client';

import { Map, Marker } from '@vis.gl/react-google-maps';
import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FaucetMineModal from './FaucetMineModal';
import { isWithinRadius } from '@/lib/distance';

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] }, // Keep street names
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }], // Keep highway names
  },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  // Hide all POI markers (businesses, attractions, etc.)
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.attraction',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.place_of_worship',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.school',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.sports_complex',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  // Hide transit markers
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  // Keep labels for areas/neighborhoods but hide markers
  {
    featureType: 'administrative',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ visibility: 'off' }],
  },
];

// Purple circle SVG icon for loot
const lootIcon = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" fill="#836EF9" stroke="white" stroke-width="2"/>
  <text x="12" y="16" font-size="12" font-weight="bold" fill="white" text-anchor="middle">M</text>
</svg>
`)}`;

// Player avatar icon
const playerIcon = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="14" fill="#836EF9" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="16" r="10" fill="#836EF9" opacity="0.8"/>
</svg>
`)}`;

interface Faucet {
  id: string;
  name: string;
  lat: number;
  lng: number;
  remaining_coins: number;
  total_coins: number;
  is_active: boolean;
}

export default function GameMap() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hasCentered, setHasCentered] = useState(false);
  const [selectedFaucet, setSelectedFaucet] = useState<Faucet | null>(null);
  const [isMineModalOpen, setIsMineModalOpen] = useState(false);

  // Fetch active faucets from Supabase
  const { data: faucetsData } = useQuery<{ faucets: Faucet[] }>({
    queryKey: ['faucets', userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', '10'); // 10km radius
      }
      
      const response = await fetch(`/api/game/faucets?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch faucets');
      }
      return response.json();
    },
    enabled: true,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const faucets = faucetsData?.faucets || [];

  // Get user location immediately on load
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      console.log('Geolocation not supported');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    // Request location immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      options
    );

    // Then watch for updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
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

  // Center map on user location when it first becomes available
  useEffect(() => {
    if (map && userLocation && !hasCentered) {
      // Center once when location is first received, then let user interact freely
      map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      map.setZoom(18); // More zoomed in for better visibility of nearby faucets
      setHasCentered(true);
    }
  }, [map, userLocation, hasCentered]);

  // Handle faucet click - open mining modal
  const handleFaucetClick = useCallback(
    (faucet: Faucet) => {
      if (!address || !isConnected) {
        alert('Please connect your wallet first');
        return;
      }

      if (!userLocation) {
        alert('Location not available. Please enable location permissions.');
        return;
      }

      // Check if user is within mining radius (50 meters)
      const MINING_RADIUS_METERS = 50;
      const withinRadius = isWithinRadius(
        userLocation.lat,
        userLocation.lng,
        faucet.lat,
        faucet.lng,
        MINING_RADIUS_METERS
      );

      if (!withinRadius) {
        alert(`You're too far from this faucet. You need to be within ${MINING_RADIUS_METERS} meters.`);
        return;
      }

      // Open mining modal
      setSelectedFaucet(faucet);
      setIsMineModalOpen(true);
    },
    [address, isConnected, userLocation]
  );

  // Handle successful mining
  const handleMineSuccess = useCallback(() => {
    // Refresh data after successful mine
    if (address) {
      queryClient.invalidateQueries({ queryKey: ['faucets'] });
      queryClient.invalidateQueries({ queryKey: ['userData', address] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  }, [address, queryClient]);

  // Use defaultCenter - update when location is available
  const mapCenter = userLocation || { lat: 12.9716, lng: 77.5946 };

  return (
    <Map
      key={userLocation ? `${userLocation.lat}-${userLocation.lng}` : 'default'}
      style={{ width: '100vw', height: '100vh' }}
      defaultCenter={mapCenter}
      defaultZoom={userLocation ? 18 : 17}
      disableDefaultUI={true}
      styles={mapStyles}
      onLoad={(mapInstance) => {
        setMap(mapInstance);
        // Always center on user location when map loads (if available)
        if (userLocation) {
          mapInstance.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
          mapInstance.setZoom(18); // More zoomed in for better visibility
          if (!hasCentered) {
            setHasCentered(true);
          }
        }
      }}
    >
      {/* Player marker */}
      {userLocation && (
        <Marker position={userLocation} icon={playerIcon} />
      )}

      {/* Faucet markers (coins) */}
      {faucets.map((faucet) => (
        <Marker
          key={faucet.id}
          position={{ lat: faucet.lat, lng: faucet.lng }}
          icon={lootIcon}
          onClick={() => handleFaucetClick(faucet)}
          title={`${faucet.name} - ${faucet.remaining_coins}/${faucet.total_coins} coins remaining`}
        />
      ))}
      
      {/* Mining Modal */}
      <FaucetMineModal
        isOpen={isMineModalOpen}
        onClose={() => setIsMineModalOpen(false)}
        faucet={selectedFaucet}
        userLat={userLocation?.lat || null}
        userLng={userLocation?.lng || null}
        onMineSuccess={handleMineSuccess}
      />
    </Map>
  );
}

