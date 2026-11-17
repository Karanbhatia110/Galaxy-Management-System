import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { PAYMENT_METHODS } from '../../utils/constants';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ project_id: '', amount: '', payment_date: '', payment_method: 'bank_transfer', transaction_reference: '', remarks: '' });
  const [summary, setSummary] = useState({ total: 0, count: 0 });

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { if (projects.length > 0 || projectFilter) fetchPayments(); }, [projectFilter, projects]);

  const fetchProjects = async () => {
    try { const res = await api.get('/projects'); setProjects(res.data.projects || []); } catch (err) {}
  };

  const fetchPayments = async () => {
    try {
      if (projectFilter) {
        const res = await api.get(`/payments/project/${projectFilter}`);
        setPayments(res.data.payments || []);
        const sum = await api.get(`/payments/project/${projectFilter}/summary`);
        setSummary(sum.data);
      } else {
        const allPayments = [];
        for (const p of projects.slice(0, 20)) {
          try { const res = await api.get(`/payments/project/${p._id}`); allPayments.push(...(res.data.payments || [])); } catch {}
        }
        setPayments(allPayments);
        setSummary({ total_received: allPayments.reduce((s, p) => s + (p.amount || 0), 0), payment_count: allPayments.length });
      }
    } catch (err) { toast.error('Failed to load payments'); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.project_id || !form.amount || !form.payment_date) { toast.error('Fill required fields'); return; }
    try {
      await api.post(`/payments/project/${form.project_id}`, { ...form, amount: parseFloat(form.amount) });
      toast.success('Payment recorded');
      setDialogOpen(false);
      setForm({ project_id: '', amount: '', payment_date: '', payment_method: 'bank_transfer', transaction_reference: '', remarks: '' });
      fetchPayments();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { field: 'payment_date', headerName: 'Date', width: 130, renderCell: (p) => formatDate(p.value) },
    { field: 'amount', headerName: 'Amount', width: 150, renderCell: (p) => <Typography sx={{ color: 'primary.main', fontWeight: 600 }}>{formatCurrency(p.value)}</Typography> },
    { field: 'payment_method', headerName: 'Method', width: 140, renderCell: (p) => <Chip label={p.value?.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize' }} /> },
    { field: 'transaction_reference', headerName: 'Reference', flex: 1 },
    { field: 'remarks', headerName: 'Remarks', flex: 1 },
  ];

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Payments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ bgcolor: 'primary.main' }}>Record Payment</Button>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}><Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: '3px solid #6C63FF' }}><CardContent><Typography variant="caption" color="text.secondary">Total Received</Typography><Typography variant="h5" fontWeight={700} color="#6BCB77">{formatCurrency(summary.total_received || 0)}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} sm={4}><Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: '3px solid #6C63FF' }}><CardContent><Typography variant="caption" color="text.secondary">Total Payments</Typography><Typography variant="h5" fontWeight={700} color="#45B7D1">{summary.payment_count || 0}</Typography></CardContent></Card></Grid>
      </Grid>
      <TextField select label="Filter by Project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} sx={{ mb: 2, minWidth: 250 }} size="small">
        <MenuItem value="">All Projects</MenuItem>
        {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}
      </TextField>
      <DataTable rows={payments} columns={columns} loading={loading} getRowId={r => r._id} />
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField select fullWidth label="Project *" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>{projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}</TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Date *" type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField select fullWidth label="Method" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>{PAYMENT_METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Reference" value={form.transaction_reference} onChange={e => setForm({ ...form, transaction_reference: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Remarks" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>Record</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
