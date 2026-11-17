import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

/* ───── Color palette ───── */
const COLORS = [
  '#6C63FF',
  '#00D4AA',
  '#FF6B6B',
  '#FFB74D',
  '#4FC3F7',
  '#AB47BC',
  '#66BB6A',
  '#EF5350',
  '#26C6DA',
  '#FFA726',
];

/* ───── Custom Tooltip ───── */
const CustomTooltip = ({ active, payload, isDark }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
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
        sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', mb: 0.3 }}
      >
        {name}
      </Typography>
      <Typography
        sx={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}
      >
        ₹{Number(value).toLocaleString('en-IN')}
      </Typography>
    </Box>
  );
};

/* ───── Custom Legend ───── */
const CustomLegend = ({ payload, isDark }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 1 }}>
    {payload?.map((entry, idx) => (
      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '3px',
            backgroundColor: entry.color,
          }}
        />
        <Typography
          sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}
        >
          {entry.value}
        </Typography>
      </Box>
    ))}
  </Box>
);

/* ───── Expense Chart ───── */
const ExpenseChart = ({ data = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const total = data.reduce((sum, d) => sum + (d.amount || 0), 0);

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
          mb: 1,
          px: 1,
        }}
      >
        Expenses by Category
      </Typography>

      <ResponsiveContainer width="100%" height="88%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="45%"
            innerRadius="55%"
            outerRadius="78%"
            paddingAngle={3}
            cornerRadius={4}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip isDark={isDark} />} />
          <Legend content={<CustomLegend isDark={isDark} />} />

          {/* Center label */}
          <text
            x="50%"
            y="42%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 18, fill: isDark ? '#FFFFFF' : '#0F172A' }}
          >
            ₹{(total / 100000).toFixed(1)}L
          </text>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: 'Inter', fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
          >
            Total
          </text>
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ExpenseChart;
