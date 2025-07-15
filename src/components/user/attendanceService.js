import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

/**
 * Calculates the distance between two GPS coordinates in meters.
 * @returns {number} The distance in meters.
 */
const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radius of the earth in meters
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Handles the logic for checking a user in or out and returns the new state.
 * @param {object} params - Object containing all necessary data.
 * @returns {Promise<object>} An object with the new state values for the component.
 */
const handleCheckInOrOut = async ({
  isCheckedIn,
  position,
  officeLocation,
  radius,
  user,
  username,
  address,
}) => {
  if (!user || !position) {
    throw new Error("User or position is missing.");
  }

  const [lat, lng] = position;
  const distance = getDistanceFromLatLonInMeters(lat, lng, officeLocation.lat, officeLocation.lng);
  const now = new Date();

  // Logic for Checking In
  if (!isCheckedIn) {
    if (distance <= radius) {
      await addDoc(collection(db, 'checkins'), {
        userId: user.uid,
        username: username || user.email,
        checkedIn: true,
        timestamp: now,
        location: { latitude: lat, longitude: lng, address },
      });
      return {
        newIsCheckedIn: true,
        newCheckInTime: now.toLocaleString(),
        newCheckOutTime: null,
        newStatus: { message: '✅ Check-in successful. You are at the office.', color: 'success' },
      };
    } else {
      const readableDistance = distance < 1000 ? `${Math.round(distance)} meters` : `${(distance / 1000).toFixed(2)} km`;
      return {
        newStatus: { message: `❌ Not in range. Distance to office: ${readableDistance}`, color: 'danger' },
      };
    }
  }
  // Logic for Checking Out
  else {
    await addDoc(collection(db, 'checkins'), {
      userId: user.uid,
      username: username || user.email,
      checkedIn: false,
      timestamp: now,
      location: { latitude: lat, longitude: lng, address },
    });
    return {
      newIsCheckedIn: false,
      newCheckOutTime: now.toLocaleString(),
      newStatus: null,
    };
  }
};


export const AttendanceService = {
  handleCheckInOrOut,
};