import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMap,
  Polyline,
} from 'react-leaflet';
import { collection, onSnapshot } from 'firebase/firestore';
import { Spinner } from 'react-bootstrap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';

import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { db } from '../../config/firebaseConfig';
import { useOfficeAddress } from './useOfficeAddress';

const officeLocation = {
  lat: 17.43542607603663,
  lng: 78.45767098753461,
};
const OFFICE_RADIUS_METERS = 100;
const officeIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});
const markerColors = ['blue', 'green', 'orange', 'yellow', 'violet', 'grey', 'red'];
const userIcons = markerColors.map((color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  })
);
const getUserIcon = (userId) => {
  let sum = 0;
  for (let i = 0; i < userId.length; i++) sum += userId.charCodeAt(i);
  return userIcons[sum % userIcons.length];
};
const getUserColor = (userId) => {
  let sum = 0;
  for (let i = 0; i < userId.length; i++) sum += userId.charCodeAt(i);
  return markerColors[sum % markerColors.length];
};
const isWithinRadius = (lat1, lng1, lat2, lng2, radiusInMeters) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusInMeters;
};

const FitBounds = ({ officeLocation, userLocations }) => {
  const map = useMap();
  useEffect(() => {
    if (!userLocations || Object.keys(userLocations).length === 0) {
      map.setView([officeLocation.lat, officeLocation.lng], 15);
      return;
    }
    const latestCoords = Object.values(userLocations)
      .map((user) => user.path?.at(-1))
      .filter(Boolean);
    const bounds = L.latLngBounds([[officeLocation.lat, officeLocation.lng], ...latestCoords]);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [officeLocation, userLocations, map]);
  return null;
};

const RoutingPath = ({ start, end }) => {
  const map = useMap();
  const routeLayerRef = useRef(null);

  useEffect(() => {
    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    if (!start || !end) return;

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes?.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          const polyline = L.polyline(coordinates, { color: '#007bff', weight: 6, opacity: 0.7 });
          const decorator = L.polylineDecorator(polyline, {
            patterns: [
              {
                offset: '100%',
                repeat: 0,
                symbol: L.Symbol.arrowHead({
                  pixelSize: 15,
                  polygon: false,
                  pathOptions: { stroke: true, color: '#007bff', weight: 3 },
                }),
              },
            ],
          });
          const group = L.layerGroup([polyline, decorator]).addTo(map);
          routeLayerRef.current = group;
        }
      } catch (err) {
        console.error('Error fetching route:', err);
      }
    };
    fetchRoute();
    return () => {
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    };
  }, [start, end, map]);

  return null;
};

const OfficeMap = () => {
  const { officeAddress, loading: addressLoading } = useOfficeAddress(officeLocation);
  const [userLocations, setUserLocations] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'user_locations'), (snapshot) => {
      setUserLocations((prev) => {
        const updated = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const id = doc.id;

          // 🔴 Skip users with status: 'offline'
          if (data.status === 'offline') return;

          const point = [data.location?.latitude, data.location?.longitude];
          if (!point[0] || !point[1]) return;

          updated[id] = {
            ...data,
            id,
            path: [...(prev[id]?.path || []), point],
          };
        });
        return updated;
      });
      setIsDataLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedUser && !userLocations[selectedUser.id]) setSelectedUser(null);
  }, [userLocations, selectedUser]);

  if (isDataLoading)
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '500px' }}>
        <Spinner animation="border" />
      </div>
    );

  return (
    <MapContainer
      center={[officeLocation.lat, officeLocation.lng]}
      zoom={17}
      style={{ height: '500px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds officeLocation={officeLocation} userLocations={userLocations} />
      <Marker position={[officeLocation.lat, officeLocation.lng]} icon={officeIcon}>
        <Popup>
          <strong>🏢 Office Location</strong>
          <br />
          {addressLoading ? <Spinner animation="border" size="sm" /> : officeAddress}
        </Popup>
      </Marker>
      <Circle
        center={[officeLocation.lat, officeLocation.lng]}
        radius={OFFICE_RADIUS_METERS}
        pathOptions={{ color: 'blue', fillColor: '#4287f5', fillOpacity: 0.2 }}
      />
      <RoutingPath
        start={officeLocation}
        end={
          selectedUser
            ? {
                lat: selectedUser.path.at(-1)[0],
                lng: selectedUser.path.at(-1)[1],
              }
            : null
        }
      />
      {Object.values(userLocations).map((user) => (
        <Polyline
          key={user.id}
          positions={user.path}
          pathOptions={{ color: getUserColor(user.id), weight: 5, opacity: 0.7 }}
        />
      ))}
      <MarkerClusterGroup>
        {Object.values(userLocations).map((user) => {
          const pos = user.path.at(-1);
          const inside = isWithinRadius(pos[0], pos[1], officeLocation.lat, officeLocation.lng, OFFICE_RADIUS_METERS);
          return (
            <Marker
              key={user.id}
              position={pos}
              icon={getUserIcon(user.id)}
              eventHandlers={{
                popupopen: () => setSelectedUser(user),
                popupclose: () => setSelectedUser(null),
              }}
            >
              <Popup>
                <strong>👤 {user.username || 'Unknown User'}</strong>
                <br />
                {user.location?.address}
                <br />
                <small>
                  {user.location?.timestamp?.seconds
                    ? new Date(user.location.timestamp.seconds * 1000).toLocaleString()
                    : 'No timestamp'}
                </small>
                <br />
                <span style={{ color: inside ? 'green' : 'red', fontWeight: 'bold' }}>
                  {inside ? 'Inside Radius' : 'Outside Radius'}
                </span>
                <br />
                <em className="text-muted">Click to show route from office.</em>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default OfficeMap;
