import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  /* Wait while auth state is being resolved */
  if (loading) {
    return <LoadingSpinner fullPage message="Verifying access…" />;
  }

  /* Not logged in → redirect to login, preserving intended destination */
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  /* Role check (skip if no role restrictions) */
  if (allowedRoles.length > 0) {
    const userRole = user?.role?.toLowerCase?.() || '';
    const permitted = allowedRoles.some((r) => r.toLowerCase() === userRole);

    if (!permitted) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  /* Authorised → render child routes */
  return <Outlet />;
};

export default ProtectedRoute;
