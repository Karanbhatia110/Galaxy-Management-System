import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Grid, IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { PROJECT_STATUSES } from '../../utils/constants';

export default function ProjectForm({ open, onClose, project, onSave }) {
  const [form, setForm] = useState({
    project_name: '', project_code: '', client_id: '', location: '',
    start_date: '', expected_completion_date: '', status: 'planning',
    contract_value: '', completion_percentage: 0, description: ''
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchClients();
      if (project) {
        setForm({
          project_name: project.project_name || '',
          project_code: project.project_code || '',
          client_id: project.client_id || '',
          location: project.location || '',
          start_date: project.start_date?.split('T')[0] || '',
          expected_completion_date: project.expected_completion_date?.split('T')[0] || '',
          status: project.status || 'planning',
          contract_value: project.contract_value || '',
          completion_percentage: project.completion_percentage || 0,
          description: project.description || ''
        });
      } else {
        setForm({
          project_name: '', project_code: '', client_id: '', location: '',
          start_date: '', expected_completion_date: '', status: 'planning',
          contract_value: '', completion_percentage: 0, description: ''
        });
      }
    }
  }, [open, project]);

  const fetchClients = async () => {
    try {
      const res = await api.get('/users', { params: { role: 'client' } });
      setClients(res.data.users || []);
    } catch (err) { /* ignore */ }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.project_name || !form.location || !form.start_date || !form.contract_value) {
      toast.error('Please fill required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, contract_value: parseFloat(form.contract_value), completion_percentage: parseFloat(form.completion_percentage) };
      if (project) {
        await api.put(`/projects/${project._id}`, payload);
        toast.success('Project updated successfully');
      } else {
        await api.post('/projects', payload);
        toast.success('Project created successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {project ? 'Edit Project' : 'New Project'}
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'divider' }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Project Name *" name="project_name" value={form.project_name} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Project Code" name="project_code" value={form.project_code} onChange={handleChange} helperText="Leave empty to auto-generate" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Client" name="client_id" value={form.client_id} onChange={handleChange}>
              <MenuItem value="">None</MenuItem>
              {clients.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Location *" name="location" value={form.location} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Start Date *" name="start_date" type="date" value={form.start_date} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Expected Completion" name="expected_completion_date" type="date" value={form.expected_completion_date} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth label="Status" name="status" value={form.status} onChange={handleChange}>
              {PROJECT_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Contract Value (₹) *" name="contract_value" type="number" value={form.contract_value} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Completion %" name="completion_percentage" type="number" value={form.completion_percentage} onChange={handleChange} inputProps={{ min: 0, max: 100 }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Description" name="description" value={form.description} onChange={handleChange} multiline rows={3} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}
          sx={{ bgcolor: 'primary.main' }}>
          {loading ? 'Saving...' : project ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
