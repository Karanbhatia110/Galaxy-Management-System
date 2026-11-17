import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

/* ───── Colors ───── */
const LINE_COLORS = {
  revenue: '#6C63FF',
  expenses: '#FF6B6B',
  profit: '#00D4AA',
};

/* ───── Custom Tooltip ───── */
const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        backgroundColor: isDark ? '#1A1F2E' : '#FFFFFF',
        border: isDark ? '1px solid rgba(108,99,255,0.25)' : '1px solid rgba(0,0,0,0.12)',
        borderRadius: '10px',
        px: 2.5,
        py: 2,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.1)',
        minWidth: 160,
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.75rem',
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          mb: 1,
        }}
      >
        {label}
      </Typography>
      {payload.map((entry) => (
        <Box key={entry.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, mb: 0.3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
            <Typography
              sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', textTransform: 'capitalize' }}
            >
              {entry.dataKey}
            </Typography>
          </Box>
          <Typography
            sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#fff' : '#0F172A' }}
          >
            ₹{Number(entry.value).toLocaleString('en-IN')}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/* ───── Custom Legend ───── */
const CustomLegend = ({ payload, isDark }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
    {payload?.map((entry, idx) => (
      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
        <Box sx={{ width: 10, height: 3, borderRadius: 2, backgroundColor: entry.color }} />
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.75rem',
            color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
            textTransform: 'capitalize',
          }}
        >
          {entry.value}
        </Typography>
      </Box>
    ))}
  </Box>
);

/* ───── ProfitTrendChart Component ───── */
const ProfitTrendChart = ({ data = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const textSecondary = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
  const dotFill = isDark ? '#0A0E1A' : '#FFFFFF';

  return (
    <Box
      sx={{
        width: '100%',
        height: 380,
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
        Profit Trend
      </Typography>

      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
          <defs>
            {Object.entries(LINE_COLORS).map(([key, color]) => (
              <linearGradient key={key} id={`line-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
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

          <Tooltip content={<CustomTooltip isDark={isDark} />} />
          <Legend content={<CustomLegend isDark={isDark} />} />

          <Line
            type="monotone"
            dataKey="revenue"
            stroke={LINE_COLORS.revenue}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: dotFill, stroke: LINE_COLORS.revenue }}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke={LINE_COLORS.expenses}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: dotFill, stroke: LINE_COLORS.expenses }}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke={LINE_COLORS.profit}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: dotFill, stroke: LINE_COLORS.profit }}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ProfitTrendChart;
