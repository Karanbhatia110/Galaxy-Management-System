import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);

  // Validate existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user || response.data);
        setToken(storedToken);
      } catch (error) {
        console.error('Auth validation failed:', error);
        // Token is invalid — clear everything
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Log in with email and password.
   */
  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user: userData } = response.data;

      // Store tokens
      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      localStorage.setItem('user', JSON.stringify(userData));

      // Update state
      setToken(access_token);
      setUser(userData);

      toast.success(`Welcome back, ${userData.name || userData.email}!`, {
        icon: '🚀',
      });

      return { success: true, user: userData };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Login failed. Please check your credentials.';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * Log out the current user.
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Silently ignore logout API errors — we clear local state regardless
      console.warn('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);

      toast.info('You have been logged out.');
      navigate('/login');
    }
  }, [navigate]);

  const contextValue = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated,
      loading,
    }),
    [user, token, login, logout, isAuthenticated, loading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to consume the AuthContext.
 * Must be used within an <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
