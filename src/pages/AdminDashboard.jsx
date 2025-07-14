import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import OfficeMap from '../components/admin/OfficeMap'; 
import AdminNavbar from '../components/admin/AdminNavbar'; 
import CheckinTable from '../components/admin/CheckinTable';

const AdminDashboard = () => {
  return (
    <>
      <AdminNavbar />
      <Container className="mt-4">

        {/* ✅ Office Location Card */}
        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-primary text-white fw-bold">
                Office Location & Radius (100m)
              </Card.Header>
              <Card.Body>
                <OfficeMap />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col md={12}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-success text-white fw-bold">
                Employee Logs
              </Card.Header>
              <Card.Body>
                <CheckinTable />
              </Card.Body>
            </Card>
          </Col>
        </Row>

      </Container>
    </>
  );
};

export default AdminDashboard;
