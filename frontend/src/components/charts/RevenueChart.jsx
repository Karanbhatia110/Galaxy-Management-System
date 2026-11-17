import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

/* ───── Custom Tooltip ───── */
const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        backgroundColor: isDark ? '#1A1F2E' : '#FFFFFF',
        border: isDark ? '1px solid rgba(108,99,255,0.25)' : '1px solid rgba(0,0,0,0.12)',
        borderRadius: '10px',
        px: 2,
        py: 1.5,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.1)',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.75rem',
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '1rem',
          fontWeight: 700,
          color: '#6C63FF',
        }}
      >
        ₹{Number(payload[0].value).toLocaleString('en-IN')}
      </Typography>
    </Box>
  );
};

/* ───── Revenue Chart ───── */
const RevenueChart = ({ data = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const textSecondary = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';

  return (
    <Box
      sx={{
        width: '100%',
        height: 350,
        p: 2,
        borderRadius: '16px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'text.primary',
          mb: 2,
          px: 1,
        }}
      >
        Monthly Revenue
      </Typography>

      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} barSize={28} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6C63FF" stopOpacity={1} />
              <stop offset="100%" stopColor="#6C63FF" stopOpacity={0.4} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: textSecondary, fontFamily: 'Inter', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: textSecondary, fontFamily: 'Inter', fontSize: 11 }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ fill: 'rgba(108,99,255,0.06)' }} />

          <Bar
            dataKey="revenue"
            fill="url(#revenueGradient)"
            radius={[6, 6, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default RevenueChart;
