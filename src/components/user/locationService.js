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
 * Fetches the user's most accurate GPS position.
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


export const LocationService = {
  getAccuratePosition,
  reverseGeocode,
  updateUserLocationInDb,
};