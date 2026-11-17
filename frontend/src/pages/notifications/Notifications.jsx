import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Chip, IconButton } from '@mui/material';
import { MarkEmailRead, DoneAll, Payment, Warning, Receipt, Flag, Notifications as NotifIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime } from '../../utils/helpers';

const typeConfig = {
  payment_due: { icon: <Payment />, color: 'primary.main' },
  low_inventory: { icon: <Warning />, color: 'primary.main' },
  new_expense: { icon: <Receipt />, color: '#FF8C42' },
  new_payment: { icon: <Payment />, color: 'primary.main' },
  milestone: { icon: <Flag />, color: '#6C63FF' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch { toast.error('Failed to load notifications'); } finally { setLoading(false); }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Notifications</Typography>
        <Button variant="outlined" startIcon={<DoneAll />} onClick={markAllAsRead}
          sx={{ borderColor: 'divider' }}>Mark All Read</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {['all', 'unread'].map(f => (
          <Chip key={f} label={f === 'all' ? 'All' : 'Unread'} onClick={() => setFilter(f)}
            sx={{ bgcolor: filter === f ? 'rgba(108,99,255,0.2)' : 'transparent', color: filter === f ? 'primary.main' : 'text.secondary', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }} />
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filtered.map(notif => {
          const cfg = typeConfig[notif.type] || { icon: <NotifIcon />, color: '#94A3B8' };
          return (
            <Card key={notif._id} onClick={() => !notif.is_read && markAsRead(notif._id)}
              sx={{
                bgcolor: notif.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(108,99,255,0.05)',
                border: `1px solid ${notif.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(108,99,255,0.15)'}`,
                borderRadius: 2, cursor: notif.is_read ? 'default' : 'pointer',
                transition: 'all 0.2s', '&:hover': { bgcolor: 'action.hover' }
              }}>
              <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0 }}>
                  {cfg.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle2" fontWeight={notif.is_read ? 400 : 600}>{notif.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDateTime(notif.created_at)}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">{notif.message}</Typography>
                </Box>
                {!notif.is_read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 1, flexShrink: 0 }} />}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <NotifIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">No notifications</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
