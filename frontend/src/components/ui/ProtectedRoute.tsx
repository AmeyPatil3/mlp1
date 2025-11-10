import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: Array<'user' | 'therapist'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { auth, loading } = useAuth();

  if (loading) {
    // You can add a spinner here
    return <div>Loading...</div>;
  }

  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }
  
  if (!auth.user.role || !allowedRoles.includes(auth.user.role)) {
    // Redirect to a different dashboard or an unauthorized page if roles don't match
     return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
