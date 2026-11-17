import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { USER_ROLES } from '../../utils/constants';

const roleColors = { admin: '#6C63FF', site_manager: '#45B7D1', accountant: '#6BCB77', client: '#00D4AA' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'site_manager', phone: '' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const res = await api.get('/users'); setUsers(res.data.users || []); }
    catch { toast.error('Failed to load users'); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.role) { toast.error('Fill required fields'); return; }
    if (!editUser && !form.password) { toast.error('Password is required for new users'); return; }
    try {
      if (editUser) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editUser._id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', form);
        toast.success('User created');
      }
      setDialogOpen(false); setEditUser(null);
      setForm({ name: '', email: '', password: '', role: 'site_manager', phone: '' });
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/users/${deleteDialog.id}`); toast.success('User deactivated'); setDeleteDialog({ open: false, id: '' }); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'role', headerName: 'Role', width: 150, renderCell: (p) => <Chip label={p.value?.replace('_', ' ')} size="small" sx={{ bgcolor: `${roleColors[p.value] || '#666'}20`, color: roleColors[p.value] || '#666', fontWeight: 600, textTransform: 'capitalize' }} /> },
    { field: 'phone', headerName: 'Phone', width: 140 },
    { field: 'is_active', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value !== false ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: p.value !== false ? 'rgba(107,203,119,0.15)' : 'rgba(255,107,107,0.15)', color: p.value !== false ? '#6BCB77' : '#FF6B6B' }} /> },
    { field: 'actions', headerName: 'Actions', width: 100, sortable: false, renderCell: (p) => (
      <Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditUser(p.row); setForm({ name: p.row.name, email: p.row.email, password: '', role: p.row.role, phone: p.row.phone || '' }); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, id: p.row._id }); }}><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton>
      </Box>
    )}
  ];

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>User Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'site_manager', phone: '' }); setDialogOpen(true); }}
          sx={{ bgcolor: 'primary.main' }}>Add User</Button>
      </Box>

      <DataTable rows={users} columns={columns} loading={loading} getRowId={r => r._id} />

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditUser(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>{editUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label={editUser ? 'Password (leave empty to keep)' : 'Password *'} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField select fullWidth label="Role *" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{USER_ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => { setDialogOpen(false); setEditUser(null); }}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>{editUser ? 'Update' : 'Create'}</Button></DialogActions>
      </Dialog>

      <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '' })} onConfirm={handleDelete} title="Deactivate User" message="This will deactivate the user account." confirmText="Deactivate" />
    </Box>
  );
}
