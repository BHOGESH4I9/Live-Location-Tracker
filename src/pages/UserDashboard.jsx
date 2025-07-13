import React, { useEffect, useState } from 'react';
import { auth } from '../config/firebaseConfig';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Navbar, Container, Button, Nav } from 'react-bootstrap';
import { doc, getDoc, deleteDoc } from 'firebase/firestore'; 
import { db } from '../config/firebaseConfig';
import LocationTracker from '../components/user/LocationTracker';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUsername(docSnap.data().username);
        }
      } else {
        navigate('/');
      }
    });

    return () => unsub();
  }, [navigate]);

  const logout = async () => {
    if (auth.currentUser) {
      const userDocRef = doc(db, 'user_locations', auth.currentUser.uid);
      try {
        await deleteDoc(userDocRef); 
      } catch (err) {
        console.error("Error removing user location:", err);
      }
      await signOut(auth);
      navigate('/');
    }
  };

  return (
    <>
      <Navbar bg="light" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand className="fw-semibold">
            Welcome, {username || user?.email}
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Button variant="danger" onClick={logout}>
              Logout
            </Button>
          </Nav>
        </Container>
      </Navbar>

      <div className="mt-4">
        <LocationTracker />
      </div>
    </>
  );
};

export default UserDashboard;
