import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
  const navigate = useNavigate();

  // --- KEY CHANGE: Get username from the session object ---
  const sessionData = JSON.parse(localStorage.getItem('adminSession'));
  const username = sessionData?.username || 'Admin'; // Use optional chaining for safety

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // --- KEY CHANGE: Remove the single session item ---
      localStorage.removeItem('adminSession');
      navigate('/auth');
    }
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand>Admin Dashboard</Navbar.Brand>
        <Nav className="ms-auto d-flex align-items-center gap-3">
          <span className="text-white fw-semibold">Welcome, {username}</span>
          <Button variant="outline-light" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </Nav>
      </Container>
    </Navbar>
  );
};

export default AdminNavbar;