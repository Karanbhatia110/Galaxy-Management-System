import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { EXPENSE_CATEGORIES } from '../../utils/constants';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [form, setForm] = useState({ project_id: '', amount: '', category: 'cement', date: '', vendor: '', notes: '' });

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { if (projects.length > 0 || projectFilter) fetchExpenses(); }, [projectFilter, categoryFilter, projects]);

  const fetchProjects = async () => { try { const r = await api.get('/projects'); setProjects(r.data.projects || []); } catch {} };

  const fetchExpenses = async () => {
    try {
      if (projectFilter) {
        const params = {};
        if (categoryFilter) params.category = categoryFilter;
        const res = await api.get(`/expenses/project/${projectFilter}`, { params });
        setExpenses(res.data.expenses || []);
        setTotalExpenses((res.data.expenses || []).reduce((s, e) => s + (e.amount || 0), 0));
      } else {
        const allExpenses = [];
        for (const p of projects.slice(0, 20)) {
          try { const res = await api.get(`/expenses/project/${p._id}`); allExpenses.push(...(res.data.expenses || [])); } catch {}
        }
        if (categoryFilter) { setExpenses(allExpenses.filter(e => e.category === categoryFilter)); } else { setExpenses(allExpenses); }
        setTotalExpenses(allExpenses.reduce((s, e) => s + (e.amount || 0), 0));
      }
    } catch (err) { toast.error('Failed to load expenses'); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.project_id || !form.amount || !form.date || !form.category) { toast.error('Fill required fields'); return; }
    try {
      await api.post(`/expenses/project/${form.project_id}`, { ...form, amount: parseFloat(form.amount) });
      toast.success('Expense added');
      setDialogOpen(false);
      setForm({ project_id: '', amount: '', category: 'cement', date: '', vendor: '', notes: '' });
      fetchExpenses();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const categoryColors = { cement: '#6C63FF', steel: '#6C63FF', sand: '#6C63FF', bricks: '#6C63FF', labour: '#6C63FF', electrical: '#6C63FF', plumbing: '#6C63FF', transportation: '#6C63FF', machinery: '#6C63FF', miscellaneous: '#6C63FF' };

  const columns = [
    { field: 'date', headerName: 'Date', width: 120, renderCell: (p) => formatDate(p.value) },
    { field: 'category', headerName: 'Category', width: 140, renderCell: (p) => <Chip label={p.value} size="small" sx={{ bgcolor: `${categoryColors[p.value] || '#666'}20`, color: categoryColors[p.value] || '#666', textTransform: 'capitalize', fontWeight: 600 }} /> },
    { field: 'amount', headerName: 'Amount', width: 140, renderCell: (p) => <Typography sx={{ color: 'primary.main', fontWeight: 600 }}>{formatCurrency(p.value)}</Typography> },
    { field: 'vendor', headerName: 'Vendor', flex: 1 },
    { field: 'notes', headerName: 'Notes', flex: 1 },
  ];

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Expenses</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ bgcolor: 'primary.main' }}>Add Expense</Button>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}><Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: '3px solid #6C63FF' }}><CardContent><Typography variant="caption" color="text.secondary">Total Expenses</Typography><Typography variant="h5" fontWeight={700} color="#FF6B6B">{formatCurrency(totalExpenses)}</Typography></CardContent></Card></Grid>
      </Grid>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField select label="Project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} size="small" sx={{ minWidth: 200 }}>
          <MenuItem value="">All Projects</MenuItem>
          {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}
        </TextField>
        <TextField select label="Category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} size="small" sx={{ minWidth: 160 }}>
          <MenuItem value="">All Categories</MenuItem>
          {EXPENSE_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
        </TextField>
      </Box>
      <DataTable rows={expenses} columns={columns} loading={loading} getRowId={r => r._id} />
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField select fullWidth label="Project *" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>{projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}</TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField select fullWidth label="Category *" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}</TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Date *" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Vendor" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>Add</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
