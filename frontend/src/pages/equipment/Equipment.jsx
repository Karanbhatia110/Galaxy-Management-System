import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Build as BuildIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { EQUIPMENT_STATUSES } from '../../utils/constants';

const statusConfig = { available: { color: 'primary.main', bg: 'rgba(107,203,119,0.15)' }, in_use: { color: 'primary.main', bg: 'rgba(69,183,209,0.15)' }, under_maintenance: { color: 'primary.main', bg: 'rgba(255,217,61,0.15)' } };

export default function Equipment() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [form, setForm] = useState({ equipment_name: '', equipment_type: '', assigned_site: '', rental_cost: '', rental_period: 'daily', maintenance_date: '', status: 'available' });

  useEffect(() => { fetchProjects(); fetchEquipment(); }, []);
  useEffect(() => { fetchEquipment(); }, [statusFilter, siteFilter]);

  const fetchProjects = async () => { try { const r = await api.get('/projects'); setProjects(r.data.projects || []); } catch {} };

  const fetchEquipment = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (siteFilter) params.assigned_site = siteFilter;
      const res = await api.get('/equipment', { params });
      setEquipment(res.data.equipment || []);
    } catch { toast.error('Failed to load equipment'); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.equipment_name || !form.equipment_type) { toast.error('Fill required fields'); return; }
    try {
      const payload = { ...form, rental_cost: parseFloat(form.rental_cost) || 0 };
      if (editItem) { await api.put(`/equipment/${editItem._id}`, payload); toast.success('Updated'); }
      else { await api.post('/equipment', payload); toast.success('Equipment added'); }
      setDialogOpen(false); setEditItem(null);
      setForm({ equipment_name: '', equipment_type: '', assigned_site: '', rental_cost: '', rental_period: 'daily', maintenance_date: '', status: 'available' });
      fetchEquipment();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/equipment/${deleteDialog.id}`); toast.success('Deleted'); setDeleteDialog({ open: false, id: '' }); fetchEquipment(); }
    catch { toast.error('Failed'); }
  };

  const columns = [
    { field: 'equipment_name', headerName: 'Equipment', flex: 1, minWidth: 150 },
    { field: 'equipment_type', headerName: 'Type', width: 140 },
    { field: 'assigned_site', headerName: 'Assigned Site', width: 160, renderCell: (p) => projects.find(pr => pr._id === p.value)?.project_name || 'Unassigned' },
    { field: 'rental_cost', headerName: 'Rental Cost', width: 130, renderCell: (p) => formatCurrency(p.value) },
    { field: 'rental_period', headerName: 'Period', width: 90, renderCell: (p) => <Chip label={p.value || 'daily'} size="small" sx={{ textTransform: 'capitalize', fontSize: '11px' }} /> },
    { field: 'maintenance_date', headerName: 'Maintenance', width: 130, renderCell: (p) => formatDate(p.value) || '-' },
    { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => { const cfg = statusConfig[p.value] || statusConfig.available; return <Chip label={p.value?.replace('_', ' ')} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, textTransform: 'capitalize' }} />; } },
    { field: 'actions', headerName: 'Actions', width: 100, sortable: false, renderCell: (p) => (
      <Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditItem(p.row); setForm({ equipment_name: p.row.equipment_name, equipment_type: p.row.equipment_type, assigned_site: p.row.assigned_site || '', rental_cost: p.row.rental_cost || '', rental_period: p.row.rental_period || 'daily', maintenance_date: p.row.maintenance_date?.split('T')[0] || '', status: p.row.status || 'available' }); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
        {user?.role === 'admin' && <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, id: p.row._id }); }}><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton>}
      </Box>
    )}
  ];

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Equipment</Typography>
        {user?.role === 'admin' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditItem(null); setForm({ equipment_name: '', equipment_type: '', assigned_site: '', rental_cost: '', rental_period: 'daily', maintenance_date: '', status: 'available' }); setDialogOpen(true); }}
            sx={{ bgcolor: 'primary.main' }}>Add Equipment</Button>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = equipment.filter(e => e.status === key).length;
          return (
            <Grid item xs={12} sm={4} key={key}>
              <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: `3px solid ${cfg.color}` }}>
                <CardContent><Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</Typography><Typography variant="h5" fontWeight={700} sx={{ color: cfg.color }}>{count}</Typography></CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 160 }}>
          <MenuItem value="">All Statuses</MenuItem>
          {EQUIPMENT_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </TextField>
        <TextField select label="Site" value={siteFilter} onChange={e => setSiteFilter(e.target.value)} size="small" sx={{ minWidth: 200 }}>
          <MenuItem value="">All Sites</MenuItem>
          {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}
        </TextField>
      </Box>

      <DataTable rows={equipment} columns={columns} loading={loading} getRowId={r => r._id} />

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditItem(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>{editItem ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Equipment Name *" value={form.equipment_name} onChange={e => setForm({ ...form, equipment_name: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Type *" value={form.equipment_type} onChange={e => setForm({ ...form, equipment_type: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField select fullWidth label="Assigned Site" value={form.assigned_site} onChange={e => setForm({ ...form, assigned_site: e.target.value })}><MenuItem value="">None</MenuItem>{projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}</TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Rental Cost (₹)" type="number" value={form.rental_cost} onChange={e => setForm({ ...form, rental_cost: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField select fullWidth label="Rental Period" value={form.rental_period} onChange={e => setForm({ ...form, rental_period: e.target.value })}><MenuItem value="daily">Daily</MenuItem><MenuItem value="weekly">Weekly</MenuItem><MenuItem value="monthly">Monthly</MenuItem></TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Maintenance Date" type="date" value={form.maintenance_date} onChange={e => setForm({ ...form, maintenance_date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField select fullWidth label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{EQUIPMENT_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}</TextField></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => { setDialogOpen(false); setEditItem(null); }}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>{editItem ? 'Update' : 'Add'}</Button></DialogActions>
      </Dialog>

      <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '' })} onConfirm={handleDelete} title="Delete Equipment" message="Are you sure?" />
    </Box>
  );
}
