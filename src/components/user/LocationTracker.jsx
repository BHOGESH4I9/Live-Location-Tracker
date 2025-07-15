import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../config/firebaseConfig';
import { OPENCAGE_API_KEY } from '../../config/apiConfig';
import { FaLocationArrow, FaClock } from 'react-icons/fa';
import { HiBuildingOffice2 } from "react-icons/hi2";
import '../../styles/LocationTracker.css';

// Import our new services
import { LocationService } from './locationService'; 
import { AttendanceService } from './attendanceService'; 
import { renderToString } from 'react-dom/server';

const gpsIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [45, 45],
  iconAnchor: [17, 42],
});

const officeIcon = new L.DivIcon({
    // Render the React component to an HTML string
    html: renderToString(<HiBuildingOffice2 />),
    // Use the CSS class you just created
    className: 'office-react-icon',
    // Set the size and anchor point
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

  const mapRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUsername(docSnap.data().username || user.email);
        }
      }
    });
    return () => unsub();
  }, []);

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

      // Also update the live location in the database
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
      
      // Update state based on the result from the service
      if (result.newIsCheckedIn !== undefined) setIsCheckedIn(result.newIsCheckedIn);
      if (result.newCheckInTime !== undefined) setCheckInTime(result.newCheckInTime);
      if (result.newCheckOutTime !== undefined) setCheckOutTime(result.newCheckOutTime);
      if (result.newStatus !== undefined) setCheckInStatus(result.newStatus);

    } catch (error) {
      console.error('Check-in/out error:', error);
      setCheckInStatus({ message: 'An error occurred. Please try again.', color: 'danger'});
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
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                  <Marker position={position} icon={gpsIcon}>
                    <Popup><strong>{username || 'User'}</strong><br />{address || 'Locating...'}</Popup>
                  </Marker>
                  <Circle center={OFFICE_LOCATION} radius={OFFICE_RADIUS_METERS} pathOptions={{ color: '#6863f3', fillColor: '#6863f3', fillOpacity: 0.1 }} />
                  <Marker position={OFFICE_LOCATION} icon={officeIcon}>
                    <Popup><strong>Office Location</strong></Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="d-flex flex-column justify-content-center align-items-center border rounded bg-light" style={{ height: '400px' }}>
                  {isFetchingLocation ? (
                    <><Spinner animation="border" className="mb-3" /><p className="text-muted">Acquiring GPS signal...</p></>
                  ) : (
                    <p className="text-muted">Click "Get My Address" to begin.</p>
                  )}
                </div>
              )}
            </Col>
            <Col md={6}>
              <div className="user-action-panel shadow-sm">
                <h3>User Information</h3>
                <p className="user-info-label">Username: <span className="user-info-text">{username || 'Unknown'}</span></p>
                <p className="user-info-label">Email: <span className="user-info-text">{auth.currentUser?.email || 'N/A'}</span></p>
                <h5 className="fw-semibold mt-3">Actions</h5>
                <div className="button-with-info shadow-sm">
                  <Button onClick={getLocation} disabled={isFetchingLocation} className="custom-gradient-btn">
                    <FaLocationArrow className="me-2" />
                    {isFetchingLocation ? 'Fetching...' : 'Get My Address'}
                  </Button>
                  {address && (<p className="button-info-text"><strong>📍</strong> {address}</p>)}
                </div>
                <div className="button-with-info shadow-sm">
                  <Button
                    className="custom-gradient-btn"
                    style={{ backgroundColor: isCheckedIn ? '#dc3545' : undefined }}
                    onClick={handleCheckToggle}
                    disabled={!position || isFetchingLocation || (!isCheckedIn && checkInStatus?.color === 'danger')}
                  >
                    <FaClock className="me-2" />
                    {isCheckedIn ? 'Check-Out' : 'Check-In'}
                  </Button>
                  <p className="button-info-text">
                    {isCheckedIn ? `✅ Checked In: ${checkInTime}` : checkOutTime ? `⏹️ Checked Out: ${checkOutTime}` : 'Not yet checked in'}
                  </p>
                </div>
                {checkInStatus && (<Alert variant={checkInStatus.color} className="shadow-sm">{checkInStatus.message}</Alert>)}
                {locationError && (<Alert variant="danger" className="shadow-sm">{locationError}</Alert>)}
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default LocationTracker;