import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Skeleton, Chip } from '@mui/material';
import {
  Business as ProjectIcon, CheckCircle as CompletedIcon,
  AccountBalance as RevenueIcon, TrendingDown as ExpenseIcon,
  TrendingUp as ProfitIcon, Schedule as PendingIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import StatCard from '../../components/common/StatCard';
import RevenueChart from '../../components/charts/RevenueChart';
import ExpenseChart from '../../components/charts/ExpenseChart';
import ProfitTrendChart from '../../components/charts/ProfitTrendChart';
import ProjectStatusChart from '../../components/charts/ProjectStatusChart';
import { formatCurrency, formatDateTime } from '../../utils/helpers';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartsRes] = await Promise.all([
        api.get('/dashboard/'),
        api.get('/dashboard/charts'),
      ]);
      setStats(statsRes.data);
      setCharts(chartsRes.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const showAdminFinancials = stats?.show_admin_financials ?? false;
  const showAccountantRevenue = stats?.show_accountant_revenue ?? false;

  // Build stat cards based on role
  const statCards = stats ? [
    { title: 'Active Projects', value: stats.total_active_projects || 0, icon: <ProjectIcon /> },
    { title: 'Completed Projects', value: stats.total_completed_projects || 0, icon: <CompletedIcon /> },
    // Admin sees all financial cards
    ...(showAdminFinancials ? [
      { title: 'Total Revenue', value: formatCurrency(stats.total_revenue || 0), icon: <RevenueIcon /> },
      { title: 'Total Expenses', value: formatCurrency(stats.total_expenses || 0), icon: <ExpenseIcon /> },
      { title: 'Total Profit', value: formatCurrency(stats.total_profit || 0), icon: <ProfitIcon /> },
      { title: 'Pending Payments', value: formatCurrency(stats.pending_payments || 0), icon: <PendingIcon /> },
    ] : []),
    // Accountant sees only revenue
    ...(showAccountantRevenue ? [
      { title: 'Total Revenue', value: formatCurrency(stats.total_revenue || 0), icon: <RevenueIcon /> },
    ] : []),
  ] : [];

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your projects today
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {loading ? (
          Array.from({ length: showAdminFinancials ? 6 : (showAccountantRevenue ? 3 : 2) }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <Skeleton variant="rounded" height={130} sx={{ borderRadius: 3, bgcolor: 'action.hover' }} />
            </Grid>
          ))
        ) : (
          statCards.map((card, i) => (
            <Grid item xs={12} sm={6} md={4} lg={showAdminFinancials ? 2 : 4} key={i}>
              <StatCard {...card} />
            </Grid>
          ))
        )}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Admin: all financial charts */}
        {showAdminFinancials && (
          <>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>Monthly Revenue</Typography>
                  {loading ? (
                    <Skeleton variant="rounded" height={300} sx={{ bgcolor: 'action.hover' }} />
                  ) : (
                    <RevenueChart data={charts?.monthly_revenue || []} />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>Expenses by Category</Typography>
                  {loading ? (
                    <Skeleton variant="rounded" height={300} sx={{ bgcolor: 'action.hover' }} />
                  ) : (
                    <ExpenseChart data={charts?.category_expenses || []} />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>Profit Trend</Typography>
                  {loading ? (
                    <Skeleton variant="rounded" height={300} sx={{ bgcolor: 'action.hover' }} />
                  ) : (
                    <ProfitTrendChart data={charts?.profit_trend || []} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
        {/* Accountant: only revenue chart */}
        {showAccountantRevenue && (
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Monthly Revenue</Typography>
                {loading ? (
                  <Skeleton variant="rounded" height={300} sx={{ bgcolor: 'action.hover' }} />
                ) : (
                  <RevenueChart data={charts?.monthly_revenue || []} />
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} md={(showAdminFinancials || showAccountantRevenue) ? 6 : 12}>
          <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Project Status</Typography>
              {loading ? (
                <Skeleton variant="rounded" height={300} sx={{ bgcolor: 'action.hover' }} />
              ) : (
                <ProjectStatusChart data={charts?.project_status_distribution || []} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activities & Upcoming Due Dates */}
      <Grid container spacing={3}>
        {user?.role === 'admin' && (
          <Grid item xs={12} md={7}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Recent Activities</Typography>
                {stats?.recent_activities?.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {stats.recent_activities.map((activity, i) => (
                      <Box key={i} sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        p: 1.5, borderRadius: 2, bgcolor: 'action.hover',
                        border: 1, borderColor: 'divider'
                      }}>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{activity.action}</Typography>
                          <Typography variant="caption" color="text.secondary">by {activity.user_name}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(activity.timestamp)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No recent activities</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} md={user?.role === 'admin' ? 5 : 12}>
          <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Upcoming Due Dates</Typography>
              {stats?.upcoming_due_dates?.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {stats.upcoming_due_dates.map((project, i) => (
                    <Box key={i} sx={{
                      p: 1.5, borderRadius: 2, bgcolor: 'action.hover',
                      border: 1, borderColor: 'divider'
                    }}>
                      <Typography variant="body2" fontWeight={500}>{project.project_name}</Typography>
                      <Chip label={project.expected_completion_date?.split('T')[0]} size="small"
                        sx={{ mt: 0.5, bgcolor: 'rgba(108,99,255,0.12)', color: 'primary.main', fontSize: '11px' }} />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No upcoming due dates</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

