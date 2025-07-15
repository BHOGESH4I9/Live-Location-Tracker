import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../config/firebaseConfig';
import { OPENCAGE_API_KEY } from '../../config/apiConfig';
import { FaLocationArrow, FaClock, FaSatelliteDish } from 'react-icons/fa';
import { HiBuildingOffice2 } from "react-icons/hi2";
import '../../styles/LocationTracker.css';
import { LocationService } from './locationService';
import { AttendanceService } from './attendanceService';
import { renderToString } from 'react-dom/server';

const gpsIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [45, 45],
  iconAnchor: [17, 42],
});

const officeIcon = new L.DivIcon({
  html: renderToString(<HiBuildingOffice2 />),
  className: 'office-react-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const OFFICE_LOCATION = {
  lat: 17.43542607603663,
  lng: 78.45767098753461,
};
const OFFICE_RADIUS_METERS = 100;

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
  const [isTracking, setIsTracking] = useState(false);
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUsername(docSnap.data().username || user.email);
        }
      }
    });

    return () => {
      unsub();
      if (watchIdRef.current) {
        LocationService.stopWatchingPosition(watchIdRef.current);
      }
    };
  }, []);

  const startRealtimeTracking = () => {
    setLocationError('');
    setIsTracking(false);

    const onPositionUpdate = async (coords) => {
      console.log("Updating position:", coords);
      const newPosition = [coords.latitude, coords.longitude];
      setPosition(newPosition);

      try {
        const newAddress = await LocationService.reverseGeocode(coords.latitude, coords.longitude, OPENCAGE_API_KEY);
        setAddress(newAddress);
        await LocationService.updateUserLocationInDb(auth.currentUser, username, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: newAddress,
        });

        if (mapRef.current) {
          mapRef.current.flyTo(newPosition, mapRef.current.getZoom());
        }
      } catch (error) {
        console.error("Error in onPositionUpdate:", error);
        setLocationError(`Failed to update location: ${error.message}`);
      }
    };

    const onTrackingError = (error) => {
      console.error("Tracking error:", error.message);
      setLocationError(error.message);
      setIsTracking(false);
      setCheckInStatus({ message: `Tracking failed: ${error.message}`, color: 'danger' });
    };

    const watchId = LocationService.startWatchingPosition(onPositionUpdate, onTrackingError);
    if (watchId !== null) {
      watchIdRef.current = watchId;
      setIsTracking(true);
      setCheckInStatus({ message: '🛰️ Real-time tracking is active.', color: 'info' });
    } else {
      setIsTracking(false);
      setCheckInStatus({ message: 'Failed to start tracking. Geolocation may be unsupported.', color: 'danger' });
    }
  };

  // Add this function to stop real-time tracking
  const stopRealtimeTracking = () => {
    if (watchIdRef.current !== null) {
      LocationService.stopWatchingPosition(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      setCheckInStatus({ message: 'Tracking stopped.', color: 'warning' });
    }
  };

  const getLocation = async () => {
    setIsFetchingLocation(true);
    setLocationError('');
    setCheckInStatus(null);
    try {
      const coords = await LocationService.getAccuratePosition();
      const newPosition = [coords.latitude, coords.longitude];
      setPosition(newPosition);

      const newAddress = await LocationService.reverseGeocode(coords.latitude, coords.longitude, OPENCAGE_API_KEY);
      setAddress(newAddress);

      await LocationService.updateUserLocationInDb(auth.currentUser, username, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: newAddress,
      });
    } catch (error) {
      setLocationError(error.message);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleCheckToggle = async () => {
    if (isCheckedIn) {
      stopRealtimeTracking();
      try {
        const result = await AttendanceService.handleCheckInOrOut({
          isCheckedIn,
          position,
          officeLocation: OFFICE_LOCATION,
          radius: OFFICE_RADIUS_METERS,
          user: auth.currentUser,
          username,
          address,
        });
        setIsCheckedIn(result.newIsCheckedIn);
        setCheckOutTime(result.newCheckOutTime);
        setCheckInStatus(null);
      } catch (error) {
        console.error('Check-out error:', error);
        setCheckInStatus({ message: 'An error occurred during check-out.', color: 'danger' });
      }
      return;
    }

    try {
      const result = await AttendanceService.handleCheckInOrOut({
        isCheckedIn,
        position,
        officeLocation: OFFICE_LOCATION,
        radius: OFFICE_RADIUS_METERS,
        user: auth.currentUser,
        username,
        address,
      });

      if (result.newIsCheckedIn) {
        setIsCheckedIn(result.newIsCheckedIn);
        setCheckInTime(result.newCheckInTime);
        setCheckOutTime(result.newCheckOutTime);
        startRealtimeTracking();
      } else {
        setCheckInStatus(result.newStatus);
      }
    } catch (error) {
      console.error('Check-in/out error:', error);
      setCheckInStatus({ message: 'An error occurred. Please try again.', color: 'danger' });
    }
  };

  return (
    <Container fluid className="location-wrapper">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Row className="location-card rounded">
            <h5 className="fw-semibold mb-3">
              Live Location {isTracking && <FaSatelliteDish className="text-info" title="Real-time tracking active" />}
            </h5>
            <Col md={6} className="mb-4">
              {position ? (
                <MapContainer
                  center={position}
                  zoom={16}
                  style={{ height: '400px', width: '100%' }}
                  className="rounded shadow-sm map-container"
                  whenCreated={(map) => (mapRef.current = map)}
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
                  <Marker position={OFFICE_LOCATION} icon={officeIcon}>
                    <Popup>
                      <strong>Office Location</strong>
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div
                  className="d-flex flex-column justify-content-center align-items-center border rounded bg-light"
                  style={{ height: '400px' }}
                >
                  {isFetchingLocation ? (
                    <>
                      <Spinner animation="border" className="mb-3" />
                      <p className="text-muted">Acquiring GPS signal...</p>
                    </>
                  ) : (
                    <p className="text-muted">Click "Get My Address" to begin.</p>
                  )}
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
                    disabled={isFetchingLocation || isTracking}
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