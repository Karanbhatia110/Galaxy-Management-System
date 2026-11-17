import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatCurrency } from '../../utils/helpers';

export default function Labour() {
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [attendanceDialog, setAttendanceDialog] = useState({ open: false, workerId: '' });
  const [attendanceForm, setAttendanceForm] = useState({ date: '', present: true, hours: 8 });
  const [form, setForm] = useState({ worker_name: '', contact_number: '', daily_wage: '', assigned_site: '' });

  useEffect(() => { fetchProjects(); fetchWorkers(); }, []);
  useEffect(() => { fetchWorkers(); }, [siteFilter]);

  const fetchProjects = async () => { try { const r = await api.get('/projects'); setProjects(r.data.projects || []); } catch {} };

  const fetchWorkers = async () => {
    try {
      const params = {};
      if (siteFilter) params.assigned_site = siteFilter;
      const res = await api.get('/labour', { params });
      setWorkers(res.data.workers || []);
    } catch (err) { toast.error('Failed to load workers'); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.worker_name || !form.daily_wage) { toast.error('Fill required fields'); return; }
    try {
      const payload = { ...form, daily_wage: parseFloat(form.daily_wage) };
      if (editWorker) {
        await api.put(`/labour/${editWorker._id}`, payload);
        toast.success('Worker updated');
      } else {
        await api.post('/labour', payload);
        toast.success('Worker added');
      }
      setDialogOpen(false); setEditWorker(null);
      setForm({ worker_name: '', contact_number: '', daily_wage: '', assigned_site: '' });
      fetchWorkers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/labour/${deleteDialog.id}`); toast.success('Worker removed'); setDeleteDialog({ open: false, id: '' }); fetchWorkers(); }
    catch { toast.error('Failed'); }
  };

  const handleAttendance = async () => {
    try {
      await api.post(`/labour/${attendanceDialog.workerId}/attendance`, attendanceForm);
      toast.success('Attendance marked');
      setAttendanceDialog({ open: false, workerId: '' });
      setAttendanceForm({ date: '', present: true, hours: 8 });
    } catch (err) { toast.error('Failed'); }
  };

  const totalDailyCost = workers.reduce((s, w) => s + (w.daily_wage || 0), 0);

  const columns = [
    { field: 'worker_name', headerName: 'Worker Name', flex: 1, minWidth: 150 },
    { field: 'contact_number', headerName: 'Contact', width: 140 },
    { field: 'daily_wage', headerName: 'Daily Wage', width: 130, renderCell: (p) => <Typography sx={{ color: '#6C63FF', fontWeight: 600 }}>{formatCurrency(p.value)}</Typography> },
    { field: 'assigned_site', headerName: 'Assigned Site', width: 160, renderCell: (p) => { const proj = projects.find(pr => pr._id === p.value); return proj?.project_name || p.value || 'Unassigned'; } },
    { field: 'is_active', headerName: 'Status', width: 100, renderCell: (p) => <Chip label={p.value !== false ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: p.value !== false ? 'rgba(107,203,119,0.15)' : 'rgba(255,107,107,0.15)', color: p.value !== false ? '#6BCB77' : '#FF6B6B' }} /> },
    { field: 'actions', headerName: 'Actions', width: 160, sortable: false, renderCell: (p) => (
      <Box>
        <Button size="small" onClick={(e) => { e.stopPropagation(); setAttendanceDialog({ open: true, workerId: p.row._id }); }} sx={{ fontSize: '11px', minWidth: 'auto' }}>Attend.</Button>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditWorker(p.row); setForm({ worker_name: p.row.worker_name, contact_number: p.row.contact_number || '', daily_wage: p.row.daily_wage, assigned_site: p.row.assigned_site || '' }); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, id: p.row._id }); }}><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton>
      </Box>
    )}
  ];

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Labour Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditWorker(null); setForm({ worker_name: '', contact_number: '', daily_wage: '', assigned_site: '' }); setDialogOpen(true); }}
          sx={{ bgcolor: 'primary.main' }}>Add Worker</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}><Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: '3px solid #6C63FF' }}><CardContent><Typography variant="caption" color="text.secondary">Total Workers</Typography><Typography variant="h5" fontWeight={700} color="#6C63FF">{workers.length}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: '3px solid #6C63FF' }}><CardContent><Typography variant="caption" color="text.secondary">Est. Daily Cost</Typography><Typography variant="h5" fontWeight={700} color="#FFD93D">{formatCurrency(totalDailyCost)}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: '3px solid #6C63FF' }}><CardContent><Typography variant="caption" color="text.secondary">Est. Monthly Cost</Typography><Typography variant="h5" fontWeight={700} color="#00D4AA">{formatCurrency(totalDailyCost * 26)}</Typography></CardContent></Card></Grid>
      </Grid>

      <TextField select label="Filter by Site" value={siteFilter} onChange={e => setSiteFilter(e.target.value)} size="small" sx={{ mb: 2, minWidth: 200 }}>
        <MenuItem value="">All Sites</MenuItem>
        {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}
      </TextField>

      <DataTable rows={workers} columns={columns} loading={loading} getRowId={r => r._id} />

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditWorker(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>{editWorker ? 'Edit Worker' : 'Add Worker'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="Worker Name *" value={form.worker_name} onChange={e => setForm({ ...form, worker_name: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Contact Number" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Daily Wage (₹) *" type="number" value={form.daily_wage} onChange={e => setForm({ ...form, daily_wage: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField select fullWidth label="Assigned Site" value={form.assigned_site} onChange={e => setForm({ ...form, assigned_site: e.target.value })}><MenuItem value="">Unassigned</MenuItem>{projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}</TextField></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => { setDialogOpen(false); setEditWorker(null); }}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>{editWorker ? 'Update' : 'Add'}</Button></DialogActions>
      </Dialog>

      <Dialog open={attendanceDialog.open} onClose={() => setAttendanceDialog({ open: false, workerId: '' })} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Mark Attendance</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="Date" type="date" value={attendanceForm.date} onChange={e => setAttendanceForm({ ...attendanceForm, date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField select fullWidth label="Present" value={attendanceForm.present} onChange={e => setAttendanceForm({ ...attendanceForm, present: e.target.value === 'true' })}><MenuItem value="true">Present</MenuItem><MenuItem value="false">Absent</MenuItem></TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Hours" type="number" value={attendanceForm.hours} onChange={e => setAttendanceForm({ ...attendanceForm, hours: parseFloat(e.target.value) })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setAttendanceDialog({ open: false, workerId: '' })}>Cancel</Button><Button variant="contained" onClick={handleAttendance}>Save</Button></DialogActions>
      </Dialog>

      <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '' })} onConfirm={handleDelete} title="Remove Worker" message="Are you sure?" />
    </Box>
  );
}
