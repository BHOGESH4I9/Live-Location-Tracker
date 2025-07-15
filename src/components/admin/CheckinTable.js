import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Table, Spinner, Row, Col, Form } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'react-datepicker/dist/react-datepicker.css';

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
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const q = query(collection(db, 'checkins'), orderBy('timestamp', 'asc'));

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

  useEffect(() => {
    const dateKey = selectedDate.toLocaleDateString();
    const sameDayRecords = records.filter((r) => formatDate(r.timestamp) === dateKey);

    const sessionsByUser = {};

    sameDayRecords.forEach((rec) => {
      const key = rec.userId;
      if (!sessionsByUser[key]) {
        sessionsByUser[key] = [];
      }

      const sessionList = sessionsByUser[key];

      if (rec.checkedIn) {
        sessionList.push({
          username: rec.username || 'Unknown',
          address: rec.location?.address || 'N/A',
          date: formatDate(rec.timestamp),
          checkIn: formatTime(rec.timestamp),
          checkOut: null,
          _timestamp: rec.timestamp.seconds,
        });
      } else {
        const lastSession = [...sessionList].reverse().find((s) => !s.checkOut);
        if (lastSession) {
          lastSession.checkOut = formatTime(rec.timestamp);
        } else {
          sessionList.push({
            username: rec.username || 'Unknown',
            address: rec.location?.address || 'N/A',
            date: formatDate(rec.timestamp),
            checkIn: null,
            checkOut: formatTime(rec.timestamp),
            _timestamp: rec.timestamp.seconds,
          });
        }
      }
    });

    const allSessions = Object.values(sessionsByUser).flat();
    allSessions.sort((a, b) => a._timestamp - b._timestamp);
    setSessions(allSessions);
  }, [records, selectedDate]);

  const handleExportPDF = () => {
  const doc = new jsPDF();
  doc.text('Employee Logs', 14, 10);

  const tableColumn = ['Date', 'Username', 'Address', 'Check-In', 'Check-Out'];
  const tableRows = [];

  sessions
    .filter((entry) =>
      entry.username.toLowerCase().includes(searchTerm.trim())
    )
    .forEach((entry) => {
      tableRows.push([
        entry.date,
        entry.username,
        entry.address,
        entry.checkIn || '-',
        entry.checkOut || '-',
      ]);
    });

  autoTable(doc, {
    startY: 20,
    head: [tableColumn],
    body: tableRows,
    styles: { fontSize: 10 },
  });

  doc.save(`employee_logs_${selectedDate.toLocaleDateString().replaceAll('/', '-')}.pdf`);
};



  return (
    <div className="mt-4">
      <Row className="align-items-center mb-3 gy-2">
  <Col xs={12} md={3}>
    <h5 className="mb-0 text-md-start text-center">Employee Logs</h5>
  </Col>

  <Col xs={12} md={3}>
    <Form.Control
      type="text"
      placeholder="Search by username..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
    />
  </Col>

  <Col xs={12} md={3}>
    <DatePicker
      selected={selectedDate}
      onChange={(date) => setSelectedDate(date)}
      dateFormat="dd/MM/yyyy"
      className="form-control"
      maxDate={new Date()}
    />
  </Col>

  <Col xs={12} md={3} className="text-md-end text-center">
    <button onClick={handleExportPDF} className="btn btn-outline-primary w-100">
      Export PDF
    </button>
  </Col>
</Row>


      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-muted">No logs found for this date.</div>
      ) : (
        <div className="table-responsive">
          <Table striped bordered hover className="table-sm">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Username</th>
                <th>Check-In Time</th>
                <th>Check-Out Time</th>
              </tr>
            </thead>
            <tbody>
              {sessions
                .filter((entry) =>
                  entry.username.toLowerCase().includes(searchTerm.trim())
                )
                .map((entry, idx) => (
                  <tr key={idx}>
                    <td>{entry.date}</td>
                    <td>{entry.username}</td>
                    <td>{entry.checkIn || '-'}</td>
                    <td>{entry.checkOut || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CheckinTable;
