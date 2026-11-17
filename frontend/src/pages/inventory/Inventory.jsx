import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatCurrency } from '../../utils/helpers';

export default function Inventory() {
  const [materials, setMaterials] = useState([]);
  const [projects, setProjects] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usageDialog, setUsageDialog] = useState({ open: false, itemId: '', name: '', remaining: 0 });
  const [usageQty, setUsageQty] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });
  const [form, setForm] = useState({ material_name: '', quantity_purchased: '', unit: 'bags', purchase_cost: '', supplier_name: '', supplier_contact: '', project_id: '', low_stock_threshold: 10 });

  useEffect(() => { fetchProjects(); fetchMaterials(); fetchAlerts(); }, []);
  useEffect(() => { fetchMaterials(); }, [projectFilter]);

  const fetchProjects = async () => { try { const r = await api.get('/projects'); setProjects(r.data.projects || []); } catch {} };
  const fetchAlerts = async () => { try { const r = await api.get('/inventory/alerts'); setAlerts(r.data.alerts || []); } catch {} };

  const fetchMaterials = async () => {
    try {
      const params = {};
      if (projectFilter) params.project_id = projectFilter;
      const res = await api.get('/inventory', { params });
      setMaterials(res.data.materials || []);
    } catch { toast.error('Failed to load inventory'); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.material_name) { toast.error('Material name is required'); return; }
    try {
      const payload = { ...form, quantity_purchased: parseFloat(form.quantity_purchased) || 0, purchase_cost: parseFloat(form.purchase_cost) || 0, low_stock_threshold: parseFloat(form.low_stock_threshold) || 10 };
      if (editItem) { await api.put(`/inventory/${editItem._id}`, payload); toast.success('Updated'); }
      else { await api.post('/inventory', payload); toast.success('Material added'); }
      setDialogOpen(false); setEditItem(null);
      setForm({ material_name: '', quantity_purchased: '', unit: 'bags', purchase_cost: '', supplier_name: '', supplier_contact: '', project_id: '', low_stock_threshold: 10 });
      fetchMaterials(); fetchAlerts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleUsage = async () => {
    if (!usageQty || parseFloat(usageQty) <= 0) { toast.error('Enter valid quantity'); return; }
    try {
      await api.put(`/inventory/${usageDialog.itemId}/usage`, { quantity_used_increment: parseFloat(usageQty) });
      toast.success('Usage recorded');
      setUsageDialog({ open: false, itemId: '', name: '', remaining: 0 });
      setUsageQty('');
      fetchMaterials(); fetchAlerts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/inventory/${deleteDialog.id}`); toast.success('Deleted'); setDeleteDialog({ open: false, id: '' }); fetchMaterials(); }
    catch { toast.error('Failed'); }
  };

  const getStockColor = (remaining, threshold) => {
    if (remaining <= threshold) return '#FF6B6B';
    if (remaining <= threshold * 2) return '#FFD93D';
    return '#6BCB77';
  };

  const columns = [
    { field: 'material_name', headerName: 'Material', flex: 1, minWidth: 150 },
    { field: 'quantity_purchased', headerName: 'Purchased', width: 110 },
    { field: 'quantity_used', headerName: 'Used', width: 90 },
    { field: 'quantity_remaining', headerName: 'Remaining', width: 120, renderCell: (p) => <Typography sx={{ color: getStockColor(p.value || 0, p.row.low_stock_threshold || 10), fontWeight: 600 }}>{p.value || 0} {p.row.unit || ''}</Typography> },
    { field: 'purchase_cost', headerName: 'Cost', width: 120, renderCell: (p) => formatCurrency(p.value) },
    { field: 'supplier_name', headerName: 'Supplier', width: 140 },
    { field: 'actions', headerName: 'Actions', width: 160, sortable: false, renderCell: (p) => (
      <Box>
        <Button size="small" onClick={(e) => { e.stopPropagation(); setUsageDialog({ open: true, itemId: p.row._id, name: p.row.material_name, remaining: p.row.quantity_remaining || 0 }); }} sx={{ fontSize: '11px', minWidth: 'auto' }}>Use</Button>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditItem(p.row); setForm({ material_name: p.row.material_name, quantity_purchased: p.row.quantity_purchased || '', unit: p.row.unit || 'bags', purchase_cost: p.row.purchase_cost || '', supplier_name: p.row.supplier_name || '', supplier_contact: p.row.supplier_contact || '', project_id: p.row.project_id || '', low_stock_threshold: p.row.low_stock_threshold || 10 }); setDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, id: p.row._id }); }}><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton>
      </Box>
    )}
  ];

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Material Inventory</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditItem(null); setForm({ material_name: '', quantity_purchased: '', unit: 'bags', purchase_cost: '', supplier_name: '', supplier_contact: '', project_id: '', low_stock_threshold: 10 }); setDialogOpen(true); }}
          sx={{ bgcolor: 'primary.main' }}>Add Material</Button>
      </Box>

      {alerts.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3, bgcolor: 'rgba(255,217,61,0.1)', border: '1px solid rgba(255,217,61,0.3)' }}>
          <Typography variant="subtitle2">Low Stock Alerts</Typography>
          {alerts.map((a, i) => <Chip key={i} label={`${a.material_name}: ${a.quantity_remaining || 0} ${a.unit || ''} remaining`} size="small" sx={{ mr: 1, mt: 0.5, bgcolor: 'rgba(255,107,107,0.15)', color: 'primary.main' }} />)}
        </Alert>
      )}

      <TextField select label="Filter by Project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} size="small" sx={{ mb: 2, minWidth: 200 }}>
        <MenuItem value="">All Projects</MenuItem>
        {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}
      </TextField>

      <DataTable rows={materials} columns={columns} loading={loading} getRowId={r => r._id} />

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditItem(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>{editItem ? 'Edit Material' : 'Add Material'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Material Name *" value={form.material_name} onChange={e => setForm({ ...form, material_name: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}><TextField fullWidth label="Quantity" type="number" value={form.quantity_purchased} onChange={e => setForm({ ...form, quantity_purchased: e.target.value })} /></Grid>
            <Grid item xs={6} sm={3}><TextField select fullWidth label="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
              {['bags', 'kg', 'tonnes', 'pieces', 'liters', 'meters', 'sq.ft', 'cu.ft', 'loads'].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Purchase Cost (₹)" type="number" value={form.purchase_cost} onChange={e => setForm({ ...form, purchase_cost: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Low Stock Threshold" type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Supplier Name" value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Supplier Contact" value={form.supplier_contact} onChange={e => setForm({ ...form, supplier_contact: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField select fullWidth label="Project" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}><MenuItem value="">None</MenuItem>{projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}</TextField></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => { setDialogOpen(false); setEditItem(null); }}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>{editItem ? 'Update' : 'Add'}</Button></DialogActions>
      </Dialog>

      <Dialog open={usageDialog.open} onClose={() => setUsageDialog({ open: false, itemId: '', name: '', remaining: 0 })} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Record Usage — {usageDialog.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Available: {usageDialog.remaining}</Typography>
          <TextField fullWidth label="Quantity to Use" type="number" value={usageQty} onChange={e => setUsageQty(e.target.value)} inputProps={{ max: usageDialog.remaining }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setUsageDialog({ open: false, itemId: '', name: '', remaining: 0 })}>Cancel</Button><Button variant="contained" onClick={handleUsage}>Record</Button></DialogActions>
      </Dialog>

      <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '' })} onConfirm={handleDelete} title="Delete Material" message="Are you sure?" />
    </Box>
  );
}
