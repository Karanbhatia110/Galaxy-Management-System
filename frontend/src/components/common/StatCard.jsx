import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const StatCard = ({ title, value, icon: Icon, trend, trendDirection = 'up' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isUp = trendDirection === 'up';
  const primary = theme.palette.primary.main;

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        p: 3,
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isDark ? `0 12px 30px rgba(108,99,255,0.12)` : `0 8px 24px rgba(108,99,255,0.1)`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          bgcolor: 'primary.main',
          borderRadius: '16px 16px 0 0',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.8rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            sx={{ color: 'text.primary', fontWeight: 700, fontSize: '1.85rem', lineHeight: 1.2 }}
          >
            {value}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 52, height: 52, borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: isDark ? 'rgba(108,99,255,0.12)' : 'rgba(108,99,255,0.08)',
            border: 1,
            borderColor: isDark ? 'rgba(108,99,255,0.25)' : 'rgba(108,99,255,0.15)',
            flexShrink: 0,
          }}
        >
          {Icon && (
            React.isValidElement(Icon) ? (
              React.cloneElement(Icon, { sx: { color: primary, fontSize: 26, ...Icon.props?.sx } })
            ) : (
              <Icon sx={{ color: primary, fontSize: 26 }} />
            )
          )}
        </Box>
      </Box>

      {trend !== undefined && trend !== null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          {isUp ? (
            <TrendingUpIcon sx={{ fontSize: 18, color: 'success.main' }} />
          ) : (
            <TrendingDownIcon sx={{ fontSize: 18, color: 'error.main' }} />
          )}
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', color: isUp ? 'success.main' : 'error.main' }}>
            {Math.abs(trend)}%
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: 'text.secondary', ml: 0.5 }}>
            vs last month
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default StatCard;
