import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Table, Spinner, Row, Col } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Helpers
const formatDate = (timestamp) => {
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString();
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleTimeString();
};

const CheckinTable = () => {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const q = query(collection(db, 'checkins'), orderBy('timestamp', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const raw = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRecords(raw);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Group and filter by selectedDate
  useEffect(() => {
    const dateKey = selectedDate.toLocaleDateString();
    const grouped = {};

    records.forEach((record) => {
      const recordDate = formatDate(record.timestamp);
      if (recordDate !== dateKey) return;

      const userKey = `${record.userId}-${recordDate}`;
      if (!grouped[userKey]) {
        grouped[userKey] = {
          username: record.username || 'Unknown',
          email: record.email || 'N/A',
          address: record.location?.address || 'N/A',
          date: recordDate,
          checkIn: null,
          checkOut: null,
        };
      }

      if (record.checkedIn) {
        grouped[userKey].checkIn = formatTime(record.timestamp);
      } else {
        grouped[userKey].checkOut = formatTime(record.timestamp);
      }
    });

    setFiltered(Object.values(grouped));
  }, [records, selectedDate]);

  return (
    <div className="mt-4">
      <Row className="align-items-center mb-3">
        <Col>
          <h5 className="mb-0">Employee Check-In/Out Logs</h5>
        </Col>
        <Col className="text-end">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd/MM/yyyy"
            className="form-control"
            maxDate={new Date()}
          />
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted">No logs found for this date.</div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Date</th>
              <th>Username</th>
              <th>Address</th>
              <th>Check-In Time</th>
              <th>Check-Out Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, index) => (
              <tr key={index}>
                <td>{entry.date}</td>
                <td>{entry.username}</td>
                <td>{entry.address}</td>
                <td>{entry.checkIn || '-'}</td>
                <td>{entry.checkOut || '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default CheckinTable;
