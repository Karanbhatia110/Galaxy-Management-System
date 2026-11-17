import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Label,
} from 'recharts';

/* ───── Default status colours ───── */
const DEFAULT_STATUS_COLORS = {
  'Not Started': '#64748B',
  Planning: '#FFB74D',
  'In Progress': '#6C63FF',
  'On Hold': '#FF6B6B',
  Completed: '#00D4AA',
  Cancelled: '#EF5350',
};

/* ───── Custom Tooltip ───── */
const CustomTooltip = ({ active, payload, isDark }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const color = payload[0].payload?.color || payload[0].payload?.fill;
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
        <Typography
          sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}
        >
          {name}
        </Typography>
      </Box>
      <Typography
        sx={{ fontFamily: 'Inter, sans-serif', fontSize: '1.05rem', fontWeight: 700, color: isDark ? '#fff' : '#0F172A', pl: 2.2 }}
      >
        {value} {value === 1 ? 'project' : 'projects'}
      </Typography>
    </Box>
  );
};

/* ───── Custom Legend ───── */
const CustomLegend = ({ payload, isDark }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 1 }}>
    {payload?.map((entry, idx) => (
      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: entry.color }} />
        <Typography
          sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}
        >
          {entry.value}
        </Typography>
      </Box>
    ))}
  </Box>
);

/* ───── Center Label ───── */
const CenterLabel = ({ viewBox, total, isDark }) => {
  if (!viewBox || typeof viewBox.cx !== 'number' || typeof viewBox.cy !== 'number') {
    return null;
  }
  const { cx, cy } = viewBox;
  return (
    <>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, fill: isDark ? '#FFFFFF' : '#0F172A' }}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontFamily: 'Inter', fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
      >
        Total
      </text>
    </>
  );
};

/* ───── ProjectStatusChart Component ───── */
const ProjectStatusChart = ({ data = [] }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);

  /* Ensure every entry has a colour */
  const coloured = data.map((d) => ({
    ...d,
    color: d.color || DEFAULT_STATUS_COLORS[d.status] || '#6C63FF',
  }));

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
        Project Status
      </Typography>

      <ResponsiveContainer width="100%" height="88%">
        <PieChart>
          <Pie
            data={coloured}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="45%"
            innerRadius="55%"
            outerRadius="78%"
            paddingAngle={3}
            cornerRadius={4}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {coloured.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} stroke="transparent" />
            ))}
            <Label
              content={({ viewBox }) => <CenterLabel viewBox={viewBox} total={total} isDark={isDark} />}
              position="center"
            />
          </Pie>

          <Tooltip content={<CustomTooltip isDark={isDark} />} />
          <Legend content={<CustomLegend isDark={isDark} />} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ProjectStatusChart;
