// import React, { useEffect, useState, useRef } from 'react';
// import { Container, Row, Col, Button, Spinner, Alert, NavDropdown, Navbar, Nav } from 'react-bootstrap';
// import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import {
//   collection,
//   setDoc,
//   doc,
//   getDoc,
//   addDoc,
// } from 'firebase/firestore';
// import { auth, db } from '../../config/firebaseConfig';
// import { onAuthStateChanged } from 'firebase/auth';
// import { OPENCAGE_API_KEY } from '../../config/apiConfig';
// import { FaLocationArrow, FaClock } from 'react-icons/fa';
// import '../../styles/LocationTracker.css';

// const gpsIcon = new L.Icon({
//   iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
//   iconSize: [45, 45],
//   iconAnchor: [17, 42],
// });

// const OFFICE_LOCATION = {
//   lat: 17.43542607603663,
//   lng: 78.45767098753461,
// };
// const OFFICE_RADIUS_METERS = 100;

// const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
//   const R = 6371e3;
//   const toRad = (deg) => deg * (Math.PI / 180);
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRad(lat1)) *
//       Math.cos(toRad(lat2)) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// };

// const LocationTracker = () => {
//   const [position, setPosition] = useState(null);
//   const [address, setAddress] = useState('');
//   const [username, setUsername] = useState('');
//   const [isFetchingLocation, setIsFetchingLocation] = useState(false);
//   const [locationError, setLocationError] = useState('');
//   const [checkInTime, setCheckInTime] = useState(null);
//   const [checkOutTime, setCheckOutTime] = useState(null);
//   const [isCheckedIn, setIsCheckedIn] = useState(false);
//   const [checkInStatus, setCheckInStatus] = useState(null);

//   const mapRef = useRef(null);
//   const watchIdRef = useRef(null);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         const docSnap = await getDoc(doc(db, 'users', user.uid));
//         if (docSnap.exists()) {
//           setUsername(docSnap.data().username || user.email);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     return () => {
//       if (watchIdRef.current)
//         navigator.geolocation.clearWatch(watchIdRef.current);
//     };
//   }, []);

//   const reverseGeocodeAndStore = async (latitude, longitude) => {
//     try {
//       const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}&limit=1&no_annotations=1`;
//       const res = await fetch(apiUrl);
//       const data = await res.json();

//       const formatted = data?.results?.[0]?.formatted || 'Unknown';
//       setAddress(formatted);

//       if (auth.currentUser) {
//         await setDoc(doc(db, 'user_locations', auth.currentUser.uid), {
//           username: username || auth.currentUser.email,
//           location: {
//             latitude,
//             longitude,
//             address: formatted,
//             timestamp: new Date(),
//           },
//         });
//       }
//     } catch (err) {
//       console.error('Geocode error:', err);
//       setAddress('Unknown');
//     } finally {
//       setIsFetchingLocation(false);
//     }
//   };

//   const getLocation = () => {
//     setIsFetchingLocation(true);
//     setLocationError('');
//     let bestPosition = null;

//     const options = {
//       enableHighAccuracy: true,
//       timeout: 15000,
//       maximumAge: 0,
//     };

//     watchIdRef.current = navigator.geolocation.watchPosition(
//       (pos) => {
//         if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
//           bestPosition = pos;
//           setPosition([pos.coords.latitude, pos.coords.longitude]);
//         }
//       },
//       (err) => {
//         setLocationError(err.message);
//         setIsFetchingLocation(false);
//       },
//       options
//     );

//     setTimeout(() => {
//       if (watchIdRef.current)
//         navigator.geolocation.clearWatch(watchIdRef.current);

//       if (bestPosition) {
//         const { latitude, longitude } = bestPosition.coords;
//         setPosition([latitude, longitude]);
//         reverseGeocodeAndStore(latitude, longitude);
//       } else {
//         setLocationError('Failed to acquire accurate location.');
//         setIsFetchingLocation(false);
//       }
//     }, 4000);
//   };

//   const handleCheckToggle = async () => {
//   try {
//     const currentUser = auth.currentUser;
//     if (!currentUser || !position) return;

//     const [lat, lng] = position;
//     const distance = getDistanceFromLatLonInMeters(lat, lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);

//     // Check-in Logic
//     if (!isCheckedIn) {
//       if (distance <= OFFICE_RADIUS_METERS) {
//         const now = new Date().toLocaleString();
//         setIsCheckedIn(true);
//         setCheckInTime(now);
//         setCheckOutTime(null);
//         setCheckInStatus({
//           message: '✅ Check-in successful. You are at the office.',
//           color: 'success',
//         });

//         await addDoc(collection(db, 'checkins'), {
//           userId: currentUser.uid,
//           username: username || currentUser.email,
//           checkedIn: true,
//           timestamp: new Date(),
//           location: {
//             latitude: lat,
//             longitude: lng,
//             address: address || 'Unknown',
//           },
//         });
//       } else {
//         const readableDistance =
//           distance < 1000 ? `${Math.round(distance)} meters` : `${(distance / 1000).toFixed(2)} km`;
//         setCheckInStatus({
//           message: `❌ Not in range. Distance to office: ${readableDistance}`,
//           color: 'danger',
//         });
//       }
//     }

//     // Check-out Logic
//     else {
//       const now = new Date().toLocaleString();
//       setIsCheckedIn(false);
//       setCheckOutTime(now);
//       setCheckInStatus(null);

//       await addDoc(collection(db, 'checkins'), {
//         userId: currentUser.uid,
//         username: username || currentUser.email,
//         checkedIn: false,
//         timestamp: new Date(),
//         location: {
//           latitude: lat,
//           longitude: lng,
//           address: address || 'Unknown',
//         },
//       });
//     }
//   } catch (err) {
//     console.error('Check-in/out error:', err);
//   }
// };


//   return (
//     <Container fluid className="location-wrapper">
//       <Row className="justify-content-center">
//         <Col lg={10}>
//           <Row className="location-card rounded">
//             <h5 className="fw-semibold mb-3">Live Location</h5>
//             <Col md={6} className="mb-4">
//               {position ? (
//                 <MapContainer
//                   center={position}
//                   zoom={16}
//                   style={{ height: '400px', width: '100%' }}
//                   className="rounded shadow-sm map-container"
//                   whenCreated={(map) => (mapRef.current = map)}
//                 >
//                   <TileLayer
//                     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                     attribution="&copy; OpenStreetMap contributors"
//                   />

//                   {/* User's Current Location */}
//                   <Marker position={position} icon={gpsIcon}>
//                     <Popup>
//                       <strong>{username || 'User'}</strong>
//                       <br />
//                       {address || 'Locating...'}
//                     </Popup>
//                   </Marker>

//                   {/* Office Radius Circle */}
//                   <Circle
//                     center={OFFICE_LOCATION}
//                     radius={OFFICE_RADIUS_METERS}
//                     pathOptions={{ color: '#6863f3', fillColor: '#6863f3', fillOpacity: 0.1 }}
//                   />

//                   {/* Office Landmark Icon */}
//                   <Marker
//                     position={OFFICE_LOCATION}
//                     icon={new L.Icon({
//                       iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Office Mark Location
//                       iconSize: [40, 40],
//                       iconAnchor: [20, 40],
//                     })}
//                   >
//                     <Popup>
//                       <strong>Office</strong><br />
//                       Landmark
//                     </Popup>
//                   </Marker>
//                 </MapContainer>

//               ) : (
//                 <div className="d-flex flex-column justify-content-center align-items-center border rounded bg-light" style={{ height: '400px' }}>
//                   <Spinner animation="border" className="mb-3" />
//                   <p className="text-muted">Waiting for location...</p>
//                 </div>
//               )}
//             </Col>

//             <Col md={6}>
//               <div className="user-action-panel shadow-sm">
//                 <h3 >User Information</h3>
//                 <p className="user-info-label">
//                   Username: <span className="user-info-text">{username || 'Unknown'}</span>
//                 </p>
//                 <p className="user-info-label">
//                   Email: <span className="user-info-text">{auth.currentUser?.email || 'N/A'}</span>
//                 </p>

//                 <h5 className="fw-semibold mt-3">Actions</h5>

//                 <div className="button-with-info shadow-sm">
//                   <Button
//                     onClick={getLocation}
//                     disabled={isFetchingLocation}
//                     className="custom-gradient-btn"
//                   >
//                     <FaLocationArrow className="me-2" />
//                     {isFetchingLocation ? 'Fetching...' : 'Get My Address'}
//                   </Button>
//                   {address && (
//                     <p className="button-info-text">
//                       <strong>📍</strong> {address}
//                     </p>
//                   )}
//                 </div>

//                 <div className="button-with-info shadow-sm">
//   <Button
//     className="custom-gradient-btn"
//     style={{ backgroundColor: isCheckedIn ? '#dc3545' : undefined }}
//     onClick={handleCheckToggle}
//     disabled={
//       !position || isFetchingLocation || (!isCheckedIn && checkInStatus?.color === 'danger')
//     }
//   >
//     <FaClock className="me-2" />
//     {isCheckedIn ? 'Check-Out' : 'Check-In'}
//   </Button>

//   <p className="button-info-text">
//     {isCheckedIn
//       ? `✅ Checked In: ${checkInTime}`
//       : checkOutTime
//       ? `⏹️ Checked Out: ${checkOutTime}`
//       : 'Not yet checked in'}
//   </p>
// </div>

// {checkInStatus && (
//   <Alert variant={checkInStatus.color} className="shadow-sm">
//     {checkInStatus.message}
//   </Alert>
// )}


//                 {locationError && (
//                   <Alert variant="danger" className="shadow-sm">
//                     {locationError}
//                   </Alert>
//                 )}
//               </div>
//             </Col>

//           </Row>
//         </Col>
//       </Row>
//     </Container>
//   );
// };

// export default LocationTracker;


import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  collection,
  setDoc,
  doc,
  getDoc,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { OPENCAGE_API_KEY } from '../../config/apiConfig';
import { FaLocationArrow, FaClock } from 'react-icons/fa';
import '../../styles/LocationTracker.css';

const gpsIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [45, 45],
  iconAnchor: [17, 42],
});

const OFFICE_LOCATION = {
  lat: 17.43542607603663,
  lng: 78.45767098753461,
};
const OFFICE_RADIUS_METERS = 2000;

const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
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

const LocationTracker = () => {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState(null);

  const mapRef = useRef(null);
  const watchIdRef = useRef(null);

  // Fetch user info and last check-in status on component mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (userDocSnap.exists()) {
          setUsername(userDocSnap.data().username || user.email);
        }

        // Check the last check-in record to set initial state
        const q = query(
          collection(db, 'checkins'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const lastCheckin = querySnapshot.docs[0].data();
          if (lastCheckin.userId === user.uid && lastCheckin.checkedIn) {
            setIsCheckedIn(true);
            setCheckInTime(new Date(lastCheckin.timestamp.seconds * 1000).toLocaleString());
            setCheckOutTime(null);
            // Automatically start tracking if already checked in
            startLiveTracking();
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Cleanup watcher on component unmount
  useEffect(() => {
    return () => {
      stopLiveTracking();
    };
  }, []);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}&limit=1&no_annotations=1`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      return data?.results?.[0]?.formatted || 'Address not found';
    } catch (err) {
      console.error('Geocode error:', err);
      return 'Address not found';
    }
  };

  const updateLocationInFirestore = async (latitude, longitude) => {
    const currentAddress = await reverseGeocode(latitude, longitude);
    setAddress(currentAddress);
    if (auth.currentUser) {
      await setDoc(doc(db, 'user_locations', auth.currentUser.uid), {
        username: username || auth.currentUser.email,
        location: {
          latitude,
          longitude,
          address: currentAddress,
          timestamp: serverTimestamp(),
        },
      });
    }
  };

  const getLocation = () => {
    setIsFetchingLocation(true);
    setLocationError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          await updateLocationInFirestore(latitude, longitude);
          setIsFetchingLocation(false);
        },
        (err) => {
          setLocationError(err.message);
          setIsFetchingLocation(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
      setIsFetchingLocation(false);
    }
  };

  const startLiveTracking = () => {
    if (watchIdRef.current) return; // Already tracking

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000, // Use a cached position if it's within 5 seconds
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);

        // Update main location for the marker
        await updateLocationInFirestore(latitude, longitude);

        // Add to the user's path history for the polyline
        if (auth.currentUser) {
          await addDoc(
            collection(db, 'user_locations', auth.currentUser.uid, 'path'),
            {
              latitude,
              longitude,
              timestamp: serverTimestamp(),
            }
          );
        }
      },
      (err) => {
        console.error('Tracking error:', err);
        setLocationError(`Tracking error: ${err.message}`);
      },
      options
    );
  };

  const stopLiveTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handleCheckToggle = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !position) return;

      const [lat, lng] = position;

      // Check-in Logic
      if (!isCheckedIn) {
        const distance = getDistanceFromLatLonInMeters(
          lat,
          lng,
          OFFICE_LOCATION.lat,
          OFFICE_LOCATION.lng
        );
        if (distance <= OFFICE_RADIUS_METERS) {
          const now = new Date();
          setIsCheckedIn(true);
          setCheckInTime(now.toLocaleString());
          setCheckOutTime(null);
          setCheckInStatus({
            message: '✅ Check-in successful. Live tracking has started.',
            color: 'success',
          });

          await addDoc(collection(db, 'checkins'), {
            userId: currentUser.uid,
            username: username || currentUser.email,
            checkedIn: true,
            timestamp: now,
            location: { latitude: lat, longitude: lng, address },
          });

          // Start live tracking
          startLiveTracking();
        } else {
          const readableDistance =
            distance < 1000
              ? `${Math.round(distance)} meters`
              : `${(distance / 1000).toFixed(2)} km`;
          setCheckInStatus({
            message: `❌ Not in range. Distance to office: ${readableDistance}`,
            color: 'danger',
          });
        }
      } else { // Check-out Logic
        const now = new Date();
        setIsCheckedIn(false);
        setCheckOutTime(now.toLocaleString());
        setCheckInStatus(null);

        await addDoc(collection(db, 'checkins'), {
          userId: currentUser.uid,
          username: username || currentUser.email,
          checkedIn: false,
          timestamp: now,
          location: { latitude: lat, longitude: lng, address },
        });

        // Stop live tracking
        stopLiveTracking();
      }
    } catch (err) {
      console.error('Check-in/out error:', err);
      setCheckInStatus({
        message: 'An error occurred. Please try again.',
        color: 'danger',
      });
    }
  };

  return (
    <Container fluid className="location-wrapper">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Row className="location-card rounded">
            <h5 className="fw-semibold mb-3">Live Location</h5>
            <Col md={6} className="mb-4">
              {position ? (
                <MapContainer
                  center={position}
                  zoom={16}
                  style={{ height: '400px', width: '100%' }}
                  className="rounded shadow-sm map-container"
                  whenCreated={(map) => (mapRef.current = map)}
                  key={position.toString()} // Force re-render on position change
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />
                  <Marker position={position} icon={gpsIcon}>
                    <Popup>
                      <strong>{username || 'User'}</strong>
                      <br />
                      {address || 'Locating...'}
                    </Popup>
                  </Marker>
                  <Circle
                    center={OFFICE_LOCATION}
                    radius={OFFICE_RADIUS_METERS}
                    pathOptions={{ color: '#6863f3', fillColor: '#6863f3', fillOpacity: 0.1 }}
                  />
                  <Marker
                    position={OFFICE_LOCATION}
                    icon={new L.Icon({
                      iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                      iconSize: [40, 40],
                      iconAnchor: [20, 40],
                    })}
                  >
                    <Popup><strong>Office</strong><br />Landmark</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="d-flex flex-column justify-content-center align-items-center border rounded bg-light" style={{ height: '400px' }}>
                  <Spinner animation="border" className="mb-3" />
                  <p className="text-muted">Click 'Get My Address' to show location.</p>
                </div>
              )}
            </Col>

            <Col md={6}>
              <div className="user-action-panel shadow-sm">
                <h3>User Information</h3>
                <p className="user-info-label">
                  Username: <span className="user-info-text">{username || 'Unknown'}</span>
                </p>
                <p className="user-info-label">
                  Email: <span className="user-info-text">{auth.currentUser?.email || 'N/A'}</span>
                </p>

                <h5 className="fw-semibold mt-3">Actions</h5>

                <div className="button-with-info shadow-sm">
                  <Button
                    onClick={getLocation}
                    disabled={isFetchingLocation || isCheckedIn}
                    className="custom-gradient-btn"
                  >
                    <FaLocationArrow className="me-2" />
                    {isFetchingLocation ? 'Fetching...' : 'Get My Address'}
                  </Button>
                  {address && (
                    <p className="button-info-text">
                      <strong>📍</strong> {address}
                    </p>
                  )}
                </div>

                <div className="button-with-info shadow-sm">
                  <Button
                    className="custom-gradient-btn"
                    style={{ backgroundColor: isCheckedIn ? '#dc3545' : undefined }}
                    onClick={handleCheckToggle}
                    disabled={!position || isFetchingLocation}
                  >
                    <FaClock className="me-2" />
                    {isCheckedIn ? 'Check-Out' : 'Check-In'}
                  </Button>
                  <p className="button-info-text">
                    {isCheckedIn
                      ? `✅ Checked In: ${checkInTime}`
                      : checkOutTime
                      ? `⏹️ Checked Out: ${checkOutTime}`
                      : 'Not yet checked in'}
                  </p>
                </div>

                {checkInStatus && (
                  <Alert variant={checkInStatus.color} className="shadow-sm">
                    {checkInStatus.message}
                  </Alert>
                )}

                {locationError && (
                  <Alert variant="danger" className="shadow-sm">
                    {locationError}
                  </Alert>
                )}
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default LocationTracker;