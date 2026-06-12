import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { realtimeDb } from '../firebase';
import { MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Google Maps API Key from environment variable
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const USE_GOOGLE_MAPS = !!GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== '';

// Debug log
console.log('🔑 Google Maps API Key:', GOOGLE_MAPS_API_KEY ? 'Found' : 'Not found');
console.log('🗺️ USE_GOOGLE_MAPS:', USE_GOOGLE_MAPS);

// Component to auto-fit map bounds to markers
const AutoFitBounds = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      if (locations.length === 1) {
        const [lat, lng] = [locations[0].latitude, locations[0].longitude];
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          map.setView([lat, lng], 18); // zoom close to single point
        }
      } else {
        const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 18 });
      }
    }
  }, [locations, map]);

  return null;
};

const SupervisorLocationMap = ({ supervisorEmail, live = true }) => {
  const [locations, setLocations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const liveMarkerRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  // Helper function to safely convert timestamp to Date
  const getDateFromTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  };

  // Load Google Maps Script (only if API key is available)
  useEffect(() => {
    if (!USE_GOOGLE_MAPS) {
      console.warn('⚠️ Google Maps disabled - API key not found or invalid');
      console.warn('📝 Please check .env file has: REACT_APP_GOOGLE_MAPS_API_KEY=your_key');
      console.warn('🔄 After updating .env, restart the app: Ctrl+C then npm start');
      console.log('ℹ️ Using OpenStreetMap (Leaflet) as fallback');
      setMapLoaded(true);
      return;
    }

    console.log('✅ Google Maps enabled - Loading...');
    console.log('🔑 API Key present:', GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');

    // Check if script already loaded
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    if (scriptLoadedRef.current) return;

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setMapLoaded(true);
        initializeMap();
      });
      return;
    }

    // Load new script
    scriptLoadedRef.current = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('✅ Google Maps loaded successfully');
      setMapLoaded(true);
      setTimeout(() => {
        initializeMap();
      }, 100);
    };

    script.onerror = () => {
      console.error('❌ Failed to load Google Maps');
      setMapError('Failed to load Google Maps. Please check your API key.');
      scriptLoadedRef.current = false;
    };

    document.head.appendChild(script);
  }, []);

  // Initialize map when loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && !googleMapRef.current) {
      initializeMap();
    }
  }, [mapLoaded]);



  // Helper function to get address from coordinates using Google Geocoding API
  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      if (!USE_GOOGLE_MAPS) {
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Get the formatted address
        const result = data.results[0];

        // Try to get a shorter, more readable address
        const addressComponents = result.address_components;
        const locality = addressComponents.find(c => c.types.includes('locality'))?.long_name;
        const sublocality = addressComponents.find(c => c.types.includes('sublocality'))?.long_name;
        const area = addressComponents.find(c => c.types.includes('sublocality_level_1'))?.long_name;

        if (sublocality || area) {
          return `${sublocality || area}, ${locality || ''}`.trim().replace(/,\s*$/, '');
        }

        if (locality) {
          return locality;
        }

        // Fallback to formatted address (shortened)
        const parts = result.formatted_address.split(',');
        return parts.slice(0, 2).join(',').trim();
      }

      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Error fetching address:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  // Fetch live location track from Firebase Realtime Database
  useEffect(() => {
    if (!supervisorEmail || !realtimeDb || !mapLoaded) return;

    // Use selected date if it's today, otherwise we might not find data in 'default'
    // But since the structure seems to be 'default' instead of date-based, we'll look at 'default' for now.
    // TODO: Verify how historical data is stored if not in 'default'

    // const todayStr = selectedDate || new Date().toISOString().split('T')[0];
    const sanitizedEmail = supervisorEmail
      .toLowerCase()
      .trim()
      .replace(/@/g, '_')
      .replace(/\./g, '_');

    console.log('📍 Fetching locations for:', sanitizedEmail);

    // New path based on debug: root -> sanitizedEmail -> default -> user -> sanitizedEmail -> Route
    const routeRef = ref(realtimeDb, `${sanitizedEmail}/default/user/${sanitizedEmail}/Route`);

    const unsubscribe = onValue(routeRef, async (snapshot) => {
      const data = snapshot.val();
      console.log('📊 Firebase data received:', data);

      if (!data) {
        console.log('⚠️ No location data found at path:', routeRef.toString());
        setLocations([]);
        return;
      }

      // Handle array data from 'Route'
      const points = await Promise.all(
        (Array.isArray(data) ? data : Object.values(data)).map(async (value, index) => {
          if (!value) return null;

          const latitude = parseFloat(value.latitude);
          const longitude = parseFloat(value.longitude);

          // Timestamp is missing in new structure, use current time or fake incremental time
          // If we want to show path order, index is sufficient.
          const ts = new Date();

          // Try to derive a readable place name/address from available fields
          let derivedAddress =
            value.address ||
            value.placeName ||
            value.locationName ||
            value.area ||
            value.city ||
            value.town ||
            value.village ||
            '';

          // If no address is available, fetch it from Google Geocoding API (Limit calls if possible)
          // For now, let's fetch for start and end points only to save quota if implicit array is large
          const isStartOrEnd = index === 0 || index === (data.length - 1);

          if (!derivedAddress && !Number.isNaN(latitude) && !Number.isNaN(longitude) && isStartOrEnd) {
            derivedAddress = await getAddressFromCoordinates(latitude, longitude);
          }

          return {
            id: index.toString(),
            latitude,
            longitude,
            timestamp: ts,
            address: derivedAddress || 'Location point',
          };
        })
      );

      const validPoints = points.filter(p => p && !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude));

      // No timestamp to sort by, so rely on array order (which should be chronological for a Route)
      // validPoints.sort((a, b) => a.timestamp - b.timestamp); 

      console.log(`✅ Found ${validPoints.length} valid location points`);

      setLocations(validPoints);

      // Update map with locations if using Google Maps
      if (USE_GOOGLE_MAPS && validPoints.length > 0) {
        updateMapWithLocations(validPoints, isLiveMode);
      }
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorEmail, selectedDate, mapLoaded]);

  const initializeMap = () => {
    if (!window.google || !window.google.maps || !mapRef.current) {
      console.warn('⚠️ Google Maps not ready yet');
      return;
    }

    if (googleMapRef.current) {
      console.log('ℹ️ Map already initialized');
      return;
    }

    try {
      console.log('🗺️ Initializing Google Map...');
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 16.8524, lng: 74.5815 }, // Center: Sangli, Maharashtra
        zoom: 10,
        minZoom: 6,
        maxZoom: 18,
        mapTypeId: 'roadmap',
        mapTypeControl: false, // Disable map type control (no satellite option)
        streetViewControl: false, // Disable street view
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ],
        // Disable all imagery requests
        gestureHandling: 'greedy',
        disableDefaultUI: false
      });

      googleMapRef.current = map;
      console.log('✅ Map initialized successfully (Roadmap only - No satellite)');
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      setMapError('Failed to initialize map');
    }
  };





  const updateMapWithLocations = (locationData, isLive) => {
    if (!googleMapRef.current || !window.google) {
      console.log('⚠️ Map not ready yet');
      return;
    }

    console.log(`🗺️ Updating map with ${locationData.length} locations`);

    // Clear existing markers and polyline
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }
    if (liveMarkerRef.current) {
      liveMarkerRef.current.setMap(null);
    }

    const bounds = new window.google.maps.LatLngBounds();

    // Create path for polyline
    const path = locationData.map(loc => ({
      lat: loc.latitude,
      lng: loc.longitude
    }));

    // Draw polyline in red
    if (path.length > 1) {
      // Draw shadow/outline first
      new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#000000',
        strokeOpacity: 0.3,
        strokeWeight: 6,
        map: googleMapRef.current
      });

      // Draw main path in red
      polylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#ef4444',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: googleMapRef.current
      });
    }

    // Add markers
    locationData.forEach((location, index) => {
      const position = { lat: location.latitude, lng: location.longitude };
      bounds.extend(position);

      const isStart = index === 0;
      const isEnd = index === locationData.length - 1;
      const isCurrent = isLive && isEnd;

      // All markers in red color
      let markerColor = '#ef4444'; // red for all points
      let markerScale = 10;
      let strokeWeight = 3;

      // Create SVG marker with number
      const svgMarker = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: markerScale,
        fillColor: markerColor,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: strokeWeight,
      };

      // Create label for marker
      const markerLabel = {
        text: String(index + 1),
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      };

      let markerIcon = svgMarker;

      const marker = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        icon: markerIcon,
        label: markerLabel,
        title: `Point ${index + 1} - ${getDateFromTimestamp(location.timestamp).toLocaleTimeString()}`,
        animation: isCurrent ? window.google.maps.Animation.BOUNCE : null,
        zIndex: isCurrent ? 1000 : (isStart || isEnd ? 500 : 100)
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 220px; font-family: system-ui;">
            <div style="font-weight: 600; color: #2563eb; margin-bottom: 8px; font-size: 14px;">
              ${isStart ? '🟢 Start Point' : isEnd ? (isCurrent ? '🔴 Current Location (Live)' : '🔴 End Point') : `📍 Point ${index + 1}`}
            </div>
            <div style="font-size: 12px; margin-top: 6px; color: #333;">
              <strong>Time:</strong> ${getDateFromTimestamp(location.timestamp).toLocaleTimeString()}
            </div>
            <div style="font-size: 12px; margin-top: 4px; color: #333;">
              <strong>Date:</strong> ${getDateFromTimestamp(location.timestamp).toLocaleDateString()}
            </div>
            ${location.address ? `
              <div style="font-size: 11px; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                📍 ${location.address}
              </div>
            ` : ''}
            <div style="font-size: 10px; color: #999; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              Lat: ${location.latitude.toFixed(6)}<br/>
              Lng: ${location.longitude.toFixed(6)}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker);
      });

      markersRef.current.push(marker);

      if (isCurrent) {
        liveMarkerRef.current = marker;
      }
    });

    // Fit map to bounds
    if (locationData.length > 0) {
      googleMapRef.current.fitBounds(bounds);
      if (locationData.length === 1) {
        googleMapRef.current.setZoom(15);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative">
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-gray-200 text-sm font-medium shadow"
          >
            <CalendarIcon className="h-4 w-4 text-blue-600" />
            {filtersOpen ? 'Close' : 'Date Filter'}
          </button>
        </div>

        {filtersOpen && (
          <div className="absolute top-16 right-4 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-72">
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📅 Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  const today = new Date().toISOString().split('T')[0];
                  setIsLiveMode(newDate === today);
                }}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="mb-3 text-xs text-gray-600">
              <div className="flex items-center justify-between mb-1">
                <span>Selected:</span>
                <span className="font-semibold">{selectedDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mode:</span>
                <span className={`font-semibold ${isLiveMode ? 'text-green-600' : 'text-blue-600'}`}>
                  {isLiveMode ? '🔴 Live' : '📊 Historical'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                  setIsLiveMode(true);
                }}
                className="flex-1 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const dateStr = yesterday.toISOString().split('T')[0];
                  setSelectedDate(dateStr);
                  setIsLiveMode(false);
                }}
                className="flex-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => {
                  const lastWeek = new Date();
                  lastWeek.setDate(lastWeek.getDate() - 7);
                  const dateStr = lastWeek.toISOString().split('T')[0];
                  setSelectedDate(dateStr);
                  setIsLiveMode(false);
                }}
                className="flex-1 px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Last Week
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="w-full py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-gray-800"
            >
              Apply Filter
            </button>
          </div>
        )}

        {!mapLoaded && !mapError && USE_GOOGLE_MAPS && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading Google Maps...</p>
            </div>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center p-4">
              <div className="text-red-600 text-4xl mb-2">⚠️</div>
              <p className="text-red-700 font-semibold">{mapError}</p>
              <p className="text-sm text-red-600 mt-2">Please add your Google Maps API key to .env file</p>
              <p className="text-xs text-gray-600 mt-1">REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here</p>
            </div>
          </div>
        )}


        {/* Live badges */}
        {isLiveMode && mapLoaded && (
          <div className="absolute top-4 left-4 z-20 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center">
            <span className="h-2 w-2 rounded-full bg-white mr-2 animate-pulse" />
            Live Tracking Active
          </div>
        )}

        {live && mapLoaded && (
          <div className="absolute bottom-4 left-4 z-20 bg-blue-600 text-white px-2 py-1 rounded-full text-[10px] font-semibold shadow flex items-center">
            <span className="h-2 w-2 rounded-full bg-white mr-1 animate-pulse" />
            Live Updating...
          </div>
        )}

        {/* Render Google Maps or OpenStreetMap based on availability */}
        {USE_GOOGLE_MAPS ? (
          <div
            ref={mapRef}
            className="h-96 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg bg-gray-100"
            style={{ width: '100%' }}
          />
        ) : (
          mapLoaded && (
            <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg">
              <MapContainer
                center={[16.8524, 74.5815]}
                zoom={10}
                minZoom={6}
                maxZoom={18}
                style={{ height: '100%', width: '100%' }}
                key={`${supervisorEmail}-${selectedDate}`}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />

                {/* Auto-fit bounds when locations change */}
                <AutoFitBounds locations={locations} />

                {/* Draw path in red */}
                {locations.length > 1 && (
                  <>
                    {/* Shadow/outline for better visibility */}
                    <Polyline
                      positions={locations.map(loc => [loc.latitude, loc.longitude])}
                      color="#000000"
                      weight={5}
                      opacity={0.3}
                    />
                    {/* Main path in red */}
                    <Polyline
                      positions={locations.map(loc => [loc.latitude, loc.longitude])}
                      color="#ef4444"
                      weight={3}
                      opacity={0.9}
                    />
                  </>
                )}

                {/* Markers for each location */}
                {locations.map((location, index) => {
                  const isStart = index === 0;
                  const isEnd = index === locations.length - 1;
                  const isCurrent = isLiveMode && isEnd;

                  // All markers in red color
                  let iconColor = '#ef4444'; // red for all points
                  let iconSize = 28;
                  let strokeWidth = 3;

                  const customIcon = new L.Icon({
                    iconUrl: `data:image/svg+xml;base64,${btoa(`
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${iconSize}" height="${iconSize}">
                        <circle cx="24" cy="24" r="18" fill="${iconColor}" stroke="white" stroke-width="${strokeWidth}"/>
                        ${isCurrent ? '<circle cx="24" cy="24" r="10" fill="white" opacity="0.5"/>' : ''}
                        <text x="24" y="28" font-size="16" font-weight="bold" fill="white" text-anchor="middle">${index + 1}</text>
                      </svg>
                    `)}`,
                    iconSize: [iconSize, iconSize],
                    iconAnchor: [iconSize / 2, iconSize / 2],
                    popupAnchor: [0, -iconSize / 2]
                  });

                  return (
                    <Marker
                      key={location.id}
                      position={[location.latitude, location.longitude]}
                      icon={customIcon}
                    >
                      {location.address && (
                        <Tooltip
                          permanent
                          direction="top"
                          className="!bg-white !text-xs !text-gray-800 !px-2 !py-1 !rounded shadow"
                        >
                          {`📍 ${location.address}`}
                        </Tooltip>
                      )}
                      <Popup>
                        <div className="text-sm min-w-[200px]">
                          <div className="font-semibold text-blue-600 mb-2">
                            {isStart ? '🟢 Start Point' : isEnd ? (isCurrent ? '🔴 Current Location (Live)' : '🔴 End Point') : `📍 Point ${index + 1}`}
                          </div>
                          <div className="mt-1 text-xs">
                            <strong>Time:</strong> {getDateFromTimestamp(location.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="mt-1 text-xs">
                            <strong>Date:</strong> {getDateFromTimestamp(location.timestamp).toLocaleDateString()}
                          </div>
                          {location.address && (
                            <div className="mt-2 text-xs text-gray-600 border-t pt-1">
                              📍 {location.address}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-gray-500 border-t pt-1">
                            Lat: {location.latitude.toFixed(6)}<br />
                            Lng: {location.longitude.toFixed(6)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )
        )}
      </div>

      {/* Location summary and stats */}
      {locations.length > 0 && (
        <div className="mt-4 space-y-3">
          {/* Date and count info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-600">Tracking Date</div>
                  <div className="text-sm font-semibold text-gray-900">{selectedDate}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600">Total Points</div>
                <div className="text-2xl font-bold text-blue-600">{locations.length}</div>
              </div>
            </div>
          </div>

          {/* Current/Last location */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="text-xs text-gray-600">
                  {isLiveMode ? 'Current Location' : 'Last Location'}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {(() => {
                    const last = locations[locations.length - 1];
                    return last.address || 'Location available';
                  })()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const last = locations[locations.length - 1];
                    return getDateFromTimestamp(last.timestamp).toLocaleString();
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Time range */}
          {locations.length > 1 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Time Range</div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-600">Start:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {getDateFromTimestamp(locations[0].timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-400">→</div>
                <div>
                  <span className="text-gray-600">End:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {getDateFromTimestamp(locations[locations.length - 1].timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Data Message */}
      {locations.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm flex items-center justify-center gap-2">
          <MapPinIcon className="h-5 w-5 text-gray-400" />
          <span>No live location data for {selectedDate}</span>
        </div>
      )}
    </div>
  );
};

export default SupervisorLocationMap;
