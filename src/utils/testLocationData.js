// Test Location Data Utility for Supervisor Location Tracking
import { ref, push, set } from 'firebase/database';
import { realtimeDb } from '../firebase';

/**
 * Add test location data for a supervisor
 * @param {string} supervisorEmail - Supervisor's email address
 * @param {string} route - Route name ('mumbai', 'pune', 'sangli')
 */
export const addTestLocations = async (supervisorEmail, route = 'mumbai') => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Sanitize email for Firebase path
    const sanitizedEmail = supervisorEmail
      .toLowerCase()
      .replace(/@/g, '_')
      .replace(/\./g, '_');
    
    // Define test routes
    const routes = {
      mumbai: [
        { lat: 19.0760, lng: 72.8777, addr: 'Mumbai Central, Mumbai' },
        { lat: 19.0896, lng: 72.8656, addr: 'Bandra West, Mumbai' },
        { lat: 19.1136, lng: 72.8697, addr: 'Andheri East, Mumbai' },
        { lat: 19.1197, lng: 72.9089, addr: 'Powai, Mumbai' },
        { lat: 19.1334, lng: 72.9133, addr: 'Vikhroli, Mumbai' },
        { lat: 19.1450, lng: 72.9350, addr: 'Ghatkopar, Mumbai' },
        { lat: 19.1520, lng: 72.9450, addr: 'Mulund, Mumbai' },
        { lat: 19.1600, lng: 72.9550, addr: 'Thane, Maharashtra' }
      ],
      pune: [
        { lat: 18.5204, lng: 73.8567, addr: 'Shivajinagar, Pune' },
        { lat: 18.5314, lng: 73.8446, addr: 'Kothrud, Pune' },
        { lat: 18.5074, lng: 73.8077, addr: 'Hinjewadi, Pune' },
        { lat: 18.5642, lng: 73.7769, addr: 'Wakad, Pune' },
        { lat: 18.5793, lng: 73.7389, addr: 'Pimpri, Pune' }
      ],
      sangli: [
        { lat: 16.8524, lng: 74.5815, addr: 'Sangli City Center' },
        { lat: 16.8600, lng: 74.5900, addr: 'Miraj Road, Sangli' },
        { lat: 16.8450, lng: 74.5700, addr: 'Market Yard, Sangli' },
        { lat: 16.8700, lng: 74.6000, addr: 'Vishrambag, Sangli' },
        { lat: 16.8300, lng: 74.5600, addr: 'Ganpati Chowk, Sangli' }
      ]
    };
    
    const selectedRoute = routes[route] || routes.mumbai;
    const locationRef = ref(realtimeDb, `supervisors/${sanitizedEmail}/${today}/locations`);
    
    // Add locations with timestamps spread over the last hour
    const now = Date.now();
    const timeInterval = 60000 * 10; // 10 minutes between each point
    
    for (let i = 0; i < selectedRoute.length; i++) {
      const loc = selectedRoute[i];
      const timestamp = new Date(now - (selectedRoute.length - i - 1) * timeInterval);
      
      const newLocationRef = push(locationRef);
      await set(newLocationRef, {
        latitude: loc.lat,
        longitude: loc.lng,
        address: loc.addr,
        placeName: loc.addr,
        locationName: loc.addr,
        area: loc.addr.split(',')[0],
        timestamp: timestamp.toISOString(),
        accuracy: 10,
        source: 'test'
      });
      
      console.log(`✅ Added location ${i + 1}/${selectedRoute.length}: ${loc.addr}`);
    }
    
    console.log(`🎉 Successfully added ${selectedRoute.length} test locations for ${supervisorEmail}`);
    return { success: true, count: selectedRoute.length };
    
  } catch (error) {
    console.error('❌ Error adding test locations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add a single live location for a supervisor
 * @param {string} supervisorEmail - Supervisor's email address
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} address - Address/place name
 */
export const addLiveLocation = async (supervisorEmail, latitude, longitude, address = '') => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Sanitize email for Firebase path
    const sanitizedEmail = supervisorEmail
      .toLowerCase()
      .replace(/@/g, '_')
      .replace(/\./g, '_');
    
    const locationRef = ref(realtimeDb, `supervisors/${sanitizedEmail}/${today}/locations`);
    const newLocationRef = push(locationRef);
    
    await set(newLocationRef, {
      latitude: latitude,
      longitude: longitude,
      address: address,
      placeName: address,
      locationName: address,
      area: address.split(',')[0],
      timestamp: new Date().toISOString(),
      accuracy: 10,
      source: 'live'
    });
    
    console.log(`✅ Live location added for ${supervisorEmail}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error adding live location:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear all location data for a supervisor on a specific date
 * @param {string} supervisorEmail - Supervisor's email address
 * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
 */
export const clearLocationData = async (supervisorEmail, date = null) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Sanitize email for Firebase path
    const sanitizedEmail = supervisorEmail
      .toLowerCase()
      .replace(/@/g, '_')
      .replace(/\./g, '_');
    
    const locationRef = ref(realtimeDb, `supervisors/${sanitizedEmail}/${targetDate}/locations`);
    await set(locationRef, null);
    
    console.log(`✅ Cleared location data for ${supervisorEmail} on ${targetDate}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error clearing location data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Simulate live tracking by adding locations every few seconds
 * @param {string} supervisorEmail - Supervisor's email address
 * @param {number} duration - Duration in minutes (default: 5)
 * @param {string} route - Route name ('mumbai', 'pune', 'sangli')
 */
export const simulateLiveTracking = async (supervisorEmail, duration = 5, route = 'mumbai') => {
  try {
    const routes = {
      mumbai: [
        { lat: 19.0760, lng: 72.8777, addr: 'Mumbai Central' },
        { lat: 19.0896, lng: 72.8656, addr: 'Bandra' },
        { lat: 19.1136, lng: 72.8697, addr: 'Andheri' },
        { lat: 19.1197, lng: 72.9089, addr: 'Powai' }
      ],
      sangli: [
        { lat: 16.8524, lng: 74.5815, addr: 'Sangli Center' },
        { lat: 16.8600, lng: 74.5900, addr: 'Miraj Road' },
        { lat: 16.8450, lng: 74.5700, addr: 'Market Yard' },
        { lat: 16.8700, lng: 74.6000, addr: 'Vishrambag' }
      ]
    };
    
    const selectedRoute = routes[route] || routes.mumbai;
    const intervalMs = (duration * 60 * 1000) / selectedRoute.length;
    
    console.log(`🔴 Starting live tracking simulation for ${duration} minutes...`);
    
    let index = 0;
    const intervalId = setInterval(async () => {
      if (index >= selectedRoute.length) {
        clearInterval(intervalId);
        console.log('✅ Live tracking simulation completed!');
        return;
      }
      
      const loc = selectedRoute[index];
      await addLiveLocation(supervisorEmail, loc.lat, loc.lng, loc.addr);
      console.log(`📍 Location ${index + 1}/${selectedRoute.length} sent`);
      index++;
    }, intervalMs);
    
    return { success: true, intervalId };
    
  } catch (error) {
    console.error('❌ Error in live tracking simulation:', error);
    return { success: false, error: error.message };
  }
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testLocationTracking = {
    addTestLocations,
    addLiveLocation,
    clearLocationData,
    simulateLiveTracking
  };
  console.log('📍 Location tracking test utilities loaded!');
  console.log('Usage:');
  console.log('  window.testLocationTracking.addTestLocations("supervisor@example.com", "mumbai")');
  console.log('  window.testLocationTracking.addLiveLocation("supervisor@example.com", 19.0760, 72.8777, "Mumbai")');
  console.log('  window.testLocationTracking.clearLocationData("supervisor@example.com")');
  console.log('  window.testLocationTracking.simulateLiveTracking("supervisor@example.com", 5, "mumbai")');
}
