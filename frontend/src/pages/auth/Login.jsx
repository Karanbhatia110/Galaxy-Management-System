import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, InputAdornment, IconButton, useTheme } from '@mui/material';
import { Email as EmailIcon, Lock as LockIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const stars = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: `${2 + Math.random() * 4}s`,
    delay: `${Math.random() * 3}s`,
    size: `${1 + Math.random() * 3}px`,
  })), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Welcome to Galaxy Construction!');
        if (result.user?.role === 'client') {
          navigate('/client/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error(result.message || 'Invalid credentials');
      }
    } catch (err) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: isDark ? '#0A0E1A' : '#F1F5F9',
      position: 'relative', overflow: 'hidden',
    }}>
      {isDark && stars.map(star => (
        <Box key={star.id} sx={{
          position: 'absolute', left: star.left, top: star.top,
          width: star.size, height: star.size,
          background: 'white', borderRadius: '50%',
          animation: `twinkle ${star.duration} ease-in-out infinite`,
          animationDelay: star.delay, opacity: 0.3,
        }} />
      ))}

      <Box component="form" onSubmit={handleSubmit} sx={{
        width: '100%', maxWidth: 420, mx: 2, p: 4,
        bgcolor: isDark ? 'rgba(17,24,39,0.95)' : 'background.paper',
        borderRadius: '20px',
        border: 1, borderColor: 'divider',
        boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.08)',
        position: 'relative', zIndex: 1,
        animation: 'fadeInUp 0.6s ease-out',
      }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 60, height: 60, borderRadius: '16px', mx: 'auto', mb: 2,
            bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800, color: '#fff',
            boxShadow: '0 8px 30px rgba(108,99,255,0.4)',
          }}>G</Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Galaxy Construction</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Sign in to your account
          </Typography>
        </Box>

        <TextField fullWidth label="Email Address" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2.5 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
          }}
        />

        <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'}
          value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Box component="button" type="submit" disabled={loading} sx={{
          width: '100%', py: 1.5, border: 'none', borderRadius: '12px', cursor: 'pointer',
          bgcolor: loading ? 'rgba(108,99,255,0.5)' : 'primary.main',
          color: '#fff', fontSize: '16px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
          '&:hover:not(:disabled)': {
            transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(108,99,255,0.4)',
          },
          '&:disabled': { cursor: 'not-allowed' },
        }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Box>
      </Box>
    </Box>
  );
}
