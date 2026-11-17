import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Box, Avatar, Menu, MenuItem,
  Divider, Badge, useMediaQuery, useTheme, Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard as DashboardIcon, Business as BusinessIcon,
  Payment as PaymentIcon, Receipt as ReceiptIcon, Description as DescriptionIcon,
  Assignment as AssignmentIcon, People as PeopleIcon, Inventory as InventoryIcon,
  Build as BuildIcon, Assessment as AssessmentIcon, AdminPanelSettings as AdminIcon,
  History as HistoryIcon, Notifications as NotificationsIcon, Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon, DarkMode as DarkModeIcon, LightMode as LightModeIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import SearchBar from '../common/SearchBar';

const DRAWER_WIDTH = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'site_manager', 'accountant'] },
  { text: 'Projects', icon: <BusinessIcon />, path: '/projects', roles: ['admin', 'site_manager', 'accountant'] },
  { divider: true, label: 'Finance' },
  { text: 'Payments', icon: <PaymentIcon />, path: '/payments', roles: ['admin', 'accountant'] },
  { text: 'Expenses', icon: <ReceiptIcon />, path: '/expenses', roles: ['admin', 'accountant', 'site_manager'] },
  { divider: true, label: 'Operations' },
  { text: 'Documents', icon: <DescriptionIcon />, path: '/documents', roles: ['admin', 'site_manager', 'accountant'] },
  { text: 'Daily Reports', icon: <AssignmentIcon />, path: '/daily-reports', roles: ['admin', 'site_manager'] },
  { text: 'Labour', icon: <PeopleIcon />, path: '/labour', roles: ['admin', 'site_manager'] },
  { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory', roles: ['admin', 'site_manager'] },
  { text: 'Equipment', icon: <BuildIcon />, path: '/equipment', roles: ['admin', 'site_manager'] },
  { divider: true, label: 'Analytics' },
  { text: 'Reports', icon: <AssessmentIcon />, path: '/reports', roles: ['admin', 'accountant'] },
  { divider: true, label: 'Admin' },
  { text: 'Users', icon: <AdminIcon />, path: '/users', roles: ['admin'] },
  { text: 'Audit Logs', icon: <HistoryIcon />, path: '/audit-logs', roles: ['admin'] },
];

export default function MainLayout() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { toggleTheme } = useThemeMode();

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (item.divider) {
      const sectionItems = menuItems.filter(
        mi => !mi.divider && mi.roles && mi.roles.includes(user?.role)
      );
      return sectionItems.length > 0;
    }
    return !item.roles || item.roles.includes(user?.role);
  });

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        p: 2, borderBottom: 1, borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '14px', color: '#fff'
          }}>G</Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Galaxy</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '10px' }}>Construction</Typography>
          </Box>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)} size="small">
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {filteredMenuItems.map((item, index) => {
          if (item.divider) {
            return (
              <Typography key={index} variant="overline" sx={{
                px: 2, pt: 2, pb: 0.5, display: 'block',
                color: 'text.secondary', fontSize: '10px', letterSpacing: '1.5px'
              }}>
                {item.label}
              </Typography>
            );
          }
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.3 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); isMobile && setDrawerOpen(false); }}
                sx={{
                  borderRadius: '10px', py: 1, px: 1.5,
                  bgcolor: isActive ? 'rgba(108,99,255,0.15)' : 'transparent',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  '&:hover': { bgcolor: isActive ? 'rgba(108,99,255,0.2)' : 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'text.secondary', minWidth: 38 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text}
                  primaryTypographyProps={{ fontSize: '13px', fontWeight: isActive ? 600 : 400 }} />
                {isActive && <Box sx={{ width: 4, height: 20, borderRadius: 2, bgcolor: 'primary.main' }} />}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '14px' }}>
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '12px' }} noWrap>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '10px', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ') || 'User'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isMobile ? (
        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer variant="permanent"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH }
          }}>
          {drawer}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ gap: 2 }}>
            {isMobile && (
              <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: 'text.primary' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1, maxWidth: 500 }}>
              <SearchBar />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
                <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
                  {isDark ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Notifications">
                <IconButton onClick={() => navigate('/notifications')} sx={{ color: 'text.secondary' }}>
                  <Badge badgeContent={unreadCount} color="error" max={99}>
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '14px' }}>
                  {user?.name?.charAt(0) || 'U'}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem disabled>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{user?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
