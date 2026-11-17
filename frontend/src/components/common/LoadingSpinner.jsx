import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';

const LoadingSpinner = ({ fullPage = false, message = '' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
      }}
    >
      {/* Outer glow ring */}
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          animation: 'pulseGlow 2s ease-in-out infinite',
          '@keyframes pulseGlow': {
            '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(108,99,255,0.3))' },
            '50%': { filter: 'drop-shadow(0 0 18px rgba(108,99,255,0.55))' },
          },
        }}
      >
        <CircularProgress
          size={52}
          thickness={3.5}
          sx={{
            color: 'primary.main',
            animationDuration: '1.2s',
          }}
        />
        {/* Inner static ring */}
        <CircularProgress
          variant="determinate"
          value={100}
          size={52}
          thickness={3.5}
          sx={{
            color: 'rgba(108,99,255,0.1)',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </Box>

      {message && (
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: 'text.secondary',
            letterSpacing: '0.02em',
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullPage) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? 'rgba(10,14,26,0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        width: '100%',
      }}
    >
      {content}
    </Box>
  );
};

export default LoadingSpinner;
