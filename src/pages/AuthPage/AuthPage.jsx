import React, { useState } from 'react';
import { useFormik } from 'formik';
import { Button, Form } from 'react-bootstrap';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import '../../styles/AuthPage.css';
import { useAuth } from '../../context/AuthContext';
import { adminUsers } from '../../adminlogin/adminUsers';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState('user');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: ''
    },
    validationSchema: Yup.lazy(() => {
      if (userType === 'admin') {
        return Yup.object({
          email: Yup.string().email('Invalid email').required('Email is required'),
          password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
        });
      }

      return isLogin
        ? Yup.object({
            email: Yup.string().email('Invalid email').required('Email is required'),
            password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
          })
        : Yup.object({
            username: Yup.string().required('Username is required'),
            email: Yup.string().email('Invalid email').required('Email is required'),
            password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
          });
    }),

    onSubmit: async (values, { setSubmitting, setErrors }) => {
      try {
        if (userType === 'admin') {
          const matchedAdmin = adminUsers.find(
            (admin) =>
              admin.email === values.email.trim() &&
              admin.password === values.password.trim()
          );

          if (!matchedAdmin) {
            throw new Error('Invalid admin credentials');
          }

          // ✅ Set admin auth flag for App.js to detect
          localStorage.setItem('isAdminAuthenticated', 'true');

          // Optional: Save full admin session if needed later
          const adminSession = {
            isAuthenticated: true,
            email: matchedAdmin.email,
            username: matchedAdmin.username 
          };
          localStorage.setItem('adminSession', JSON.stringify(adminSession));

          navigate('/admin-dashboard');
        } else {
          if (isLogin) {
            await login(values.email, values.password);
          } else {
            await register(values.email, values.password, values.username);
          }
          navigate('/dashboard');
        }
      } catch (err) {
        setErrors({ general: err.message });
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <div className="auth-wrapper">
      {/* Header with dropdown in top-right */}
      <div className="auth-header-row">
        <h1 className="logo-title">Live Location Tracker</h1>
        <Form.Select
          value={userType}
          onChange={(e) => {
            setUserType(e.target.value);
            setIsLogin(true);
          }}
          className="role-dropdown"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Form.Select>
      </div>

      <div className={`auth-box ${isLogin ? 'login-mode' : 'register-mode'}`}>
        {isLogin && userType === 'user' && (
          <div className="side-panel left-panel">
            <h3>Don't have an account?</h3>
            <p>Register to get started!</p>
            <Button variant="light" onClick={() => setIsLogin(false)}>Register</Button>
          </div>
        )}

        <div className={`form-panel ${userType === 'admin' ? 'admin-centered' : ''}`}>
          <Form onSubmit={formik.handleSubmit} className="form-content">
            <h2 className="text-center mb-4">
              {userType === 'admin' ? 'Admin Login' : isLogin ? 'Login' : 'Register'}
            </h2>

            {!isLogin && userType === 'user' && (
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  isInvalid={formik.touched.username && !!formik.errors.username}
                />
                <Form.Control.Feedback type="invalid">
                  {formik.errors.username}
                </Form.Control.Feedback>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Control
                type="email"
                name="email"
                placeholder="Email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                isInvalid={formik.touched.email && !!formik.errors.email}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.email}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Control
                type="password"
                name="password"
                placeholder="Password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                isInvalid={formik.touched.password && !!formik.errors.password}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.password}
              </Form.Control.Feedback>
            </Form.Group>

            {formik.errors.general && (
              <div className="text-danger text-center mb-2">
                {formik.errors.general}
              </div>
            )}

            <Button type="submit" className="custom-auth-button w-100">
              {isLogin ? 'Login' : 'Register'}
            </Button>
          </Form>
        </div>

        {!isLogin && userType === 'user' && (
          <div className="side-panel right-panel">
            <h3>Already have an account?</h3>
            <p>Login to access your account</p>
            <Button variant="light" onClick={() => setIsLogin(true)}>Login</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
