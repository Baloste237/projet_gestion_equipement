import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UnauthorizedPage } from '../../pages/errors/UnauthorizedPage';
import { checkRouteAccess } from '../../utils/routeGuards';

export interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();

  const token = localStorage.getItem('token');

  let currentRole = 'EMPLOYE';
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      currentRole = JSON.parse(stored)?.role || 'EMPLOYE';
    }
  } catch {
    currentRole = 'EMPLOYE';
  }

  const access = checkRouteAccess(token, currentRole, allowedRoles);

  if (!access.allowed) {
    if (access.reason === 'UNAUTHENTICATED') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <UnauthorizedPage requiredRoles={allowedRoles} />;
  }

  return children;
};
