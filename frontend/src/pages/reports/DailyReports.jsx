import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Grid, Collapse, IconButton } from '@mui/material';
import { Add as AddIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/helpers';

export default function DailyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ project_id: '', date: '', work_completed: '', labour_count: '', materials_used: [], issues_faced: '', remarks: '' });

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { if (projects.length) fetchReports(); }, [projectFilter, projects]);

  const fetchProjects = async () => { try { const r = await api.get('/projects'); setProjects(r.data.projects || []); } catch {} };

  const fetchReports = async () => {
    try {
      const allReports = [];
      const targetProjects = projectFilter ? [{ _id: projectFilter }] : projects.slice(0, 20);
      for (const p of targetProjects) {
        try {
          const res = await api.get(`/daily-reports/project/${p._id}`);
          const rpts = (res.data.reports || []).map(r => ({ ...r, project_name: projects.find(pr => pr._id === p._id)?.project_name || '' }));
          allReports.push(...rpts);
        } catch {}
      }
      allReports.sort((a, b) => new Date(b.date) - new Date(a.date));
      setReports(allReports);
    } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.project_id || !form.date || !form.work_completed) { toast.error('Fill required fields'); return; }
    try {
      await api.post(`/daily-reports/project/${form.project_id}`, { ...form, labour_count: parseInt(form.labour_count) || 0 });
      toast.success('Report created');
      setDialogOpen(false);
      setForm({ project_id: '', date: '', work_completed: '', labour_count: '', materials_used: [], issues_faced: '', remarks: '' });
      fetchReports();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Daily Reports</Typography>
        {['admin', 'site_manager'].includes(user?.role) && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: 'primary.main' }}>New Report</Button>
        )}
      </Box>

      <TextField select label="Filter by Project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} size="small" sx={{ mb: 3, minWidth: 250 }}>
        <MenuItem value="">All Projects</MenuItem>
        {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}
      </TextField>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {reports.map((report, i) => (
          <Card key={report._id || i} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, transition: 'all 0.2s' }}>
            <CardContent sx={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === i ? null : i)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption" fontWeight={700} color="primary.main">{new Date(report.date).getDate()}<br />{new Date(report.date).toLocaleString('default', { month: 'short' })}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>{report.project_name || 'Project'}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 400 }}>{report.work_completed}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={`${report.labour_count || 0} workers`} size="small" sx={{ bgcolor: 'rgba(0,212,170,0.15)', color: 'primary.main' }} />
                  {report.issues_faced && <Chip label="Issues" size="small" color="warning" variant="outlined" />}
                  <IconButton size="small">{expanded === i ? <CollapseIcon /> : <ExpandIcon />}</IconButton>
                </Box>
              </Box>
            </CardContent>
            <Collapse in={expanded === i}>
              <CardContent sx={{ pt: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Work Completed</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>{report.work_completed}</Typography>
                    {report.issues_faced && (<>
                      <Typography variant="caption" color="error.main">Issues Faced</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>{report.issues_faced}</Typography>
                    </>)}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {report.remarks && (<>
                      <Typography variant="caption" color="text.secondary">Remarks</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>{report.remarks}</Typography>
                    </>)}
                    <Typography variant="caption" color="text.secondary">Created by</Typography>
                    <Typography variant="body2">{report.created_by_name || 'Unknown'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Collapse>
          </Card>
        ))}
        {reports.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="text.secondary">No reports found</Typography></Box>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>New Daily Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField select fullWidth label="Project *" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>{projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}</TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="Date *" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Labour Count" type="number" value={form.labour_count} onChange={e => setForm({ ...form, labour_count: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Work Completed *" value={form.work_completed} onChange={e => setForm({ ...form, work_completed: e.target.value })} multiline rows={3} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Issues Faced" value={form.issues_faced} onChange={e => setForm({ ...form, issues_faced: e.target.value })} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Remarks" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSubmit}>Create Report</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
