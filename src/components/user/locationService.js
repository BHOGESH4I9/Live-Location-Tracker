import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

/**
* Converts latitude and longitude to a human-readable address using OpenCage API.
* @param {number} latitude - The latitude.
* @param {number} longitude - The longitude.
* @param {string} apiKey - Your OpenCage Geocoding API key.
* @returns {Promise<string>} The formatted address.
*/
const reverseGeocode = async (latitude, longitude, apiKey) => {
 try {
  const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}&limit=1&no_annotations=1`;
  const res = await fetch(apiUrl);
  const data = await res.json();
  return data?.results?.[0]?.formatted || 'Address not found';
 } catch (err) {
  console.error('Geocode error:', err);
  return 'Could not fetch address';
 }
};

/**
* Updates the user's location in the 'user_locations' Firestore collection.
* @param {object} user - The Firebase auth user object.
* @param {string} username - The user's display name.
* @param {object} locationData - Object containing latitude, longitude, and address.
*/
const updateUserLocationInDb = async (user, username, { latitude, longitude, address }) => {
 if (user) {
  await setDoc(doc(db, 'user_locations', user.uid), {
   username: username || user.email,
   location: {
    latitude,
    longitude,
    address,
    timestamp: new Date(),
   },
  });
 }
};

/**
* Fetches a single, most accurate GPS position (for initial check-in).
* @returns {Promise<Coordinates>} The user's coordinates object.
*/
const getAccuratePosition = () => {
 return new Promise((resolve, reject) => {
  let bestPosition = null;
  const options = {
   enableHighAccuracy: true,
   timeout: 15000,
   maximumAge: 0,
  };

  const watchId = navigator.geolocation.watchPosition(
   (pos) => {
    if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
     bestPosition = pos;
    }
   },
   (err) => {
    let message = err.message;
    if (err.code === 1) {
     message = "Please allow location access to use this feature.";
    }
    reject(new Error(message));
    navigator.geolocation.clearWatch(watchId);
   },
   options
  );

  setTimeout(() => {
   navigator.geolocation.clearWatch(watchId);
   if (bestPosition) {
    resolve(bestPosition.coords);
   } else {
    reject(new Error('Failed to get a location. Please try again in an open area.'));
   }
  }, 10000); // 10-second timeout
 });
};

// --- NEW FUNCTION: Starts persistent real-time location tracking ---
/**
 * Starts watching the user's position and calls a success callback with each update.
 * @param {function} onSuccess - Callback function for successful position updates. Receives the `coords` object.
 * @param {function} onError - Callback function for errors. Receives the `error` object.
 * @returns {number} The watch ID, which can be used to stop tracking.
 */
const startWatchingPosition = (onSuccess, onError) => {
  if (!navigator.geolocation) {
    const error = new Error("Geolocation is not supported by your browser.");
    console.error(error.message);
    onError(error);
    return null;
  }

  const options = {
    enableHighAccuracy: false, // Relax high-accuracy to improve reliability
    timeout: 15000, // Increase timeout to 15 seconds
    maximumAge: 10000, // Allow cached positions up to 10 seconds old
  };

  console.log("Starting watchPosition with options:", options); // Debug log
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      console.log("Position update received:", position.coords); // Debug log
      onSuccess(position.coords);
    },
    (error) => {
      let message = error.message;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = "Location access denied. Please enable location permissions.";
          break;
        case error.POSITION_UNAVAILABLE:
          message = "Location information is unavailable. Try moving to an open area.";
          break;
        case error.TIMEOUT:
          message = "Location request timed out. Please try again.";
          break;
        default:
          message = "An error occurred while tracking location.";
      }
      console.error("watchPosition error:", message, error); // Debug log
      onError(new Error(message));
    },
    options
  );

  console.log("watchPosition ID:", watchId); // Debug log
  return watchId;
};


// --- NEW FUNCTION: Stops real-time location tracking ---
/**
 * Stops watching the user's position using its ID.
 * @param {number} watchId - The ID of the watch process to stop.
 */
const stopWatchingPosition = (watchId) => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
};


export const LocationService = {
 getAccuratePosition,
 reverseGeocode,
 updateUserLocationInDb,
  startWatchingPosition,   // <-- NEWLY EXPORTED
  stopWatchingPosition,     // <-- NEWLY EXPORTED
};