import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Card, CardContent, Chip, LinearProgress,
  TextField, MenuItem, IconButton, ToggleButtonGroup, ToggleButton, Skeleton
} from '@mui/material';
import {
  Add as AddIcon, ViewModule as GridViewIcon, ViewList as ListViewIcon,
  LocationOn as LocationIcon, Person as PersonIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import ProjectForm from './ProjectForm';
import { formatCurrency } from '../../utils/helpers';
import { PROJECT_STATUSES } from '../../utils/constants';

const statusColors = { planning: '#6C63FF', active: '#22C55E', on_hold: '#F59E0B', completed: '#6C63FF', cancelled: '#EF4444' };

export default function ProjectList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('card');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);

  useEffect(() => { fetchProjects(); }, [statusFilter, search]);

  const fetchProjects = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/projects', { params });
      setProjects(res.data.projects || []);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setFormOpen(false);
    setEditProject(null);
    fetchProjects();
  };

  const columns = [
    { field: 'project_name', headerName: 'Project Name', flex: 1, minWidth: 200 },
    { field: 'project_code', headerName: 'Code', width: 120 },
    {
      field: 'status', headerName: 'Status', width: 130,
      renderCell: (params) => (
        <Chip label={params.value?.replace('_', ' ')} size="small"
          sx={{ bgcolor: `${statusColors[params.value]}20`, color: statusColors[params.value], fontWeight: 600, textTransform: 'capitalize' }} />
      )
    },
    { field: 'client_name', headerName: 'Client', width: 150 },
    {
      field: 'contract_value', headerName: 'Contract Value', width: 150,
      renderCell: (params) => formatCurrency(params.value)
    },
    {
      field: 'completion_percentage', headerName: 'Progress', width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <LinearProgress variant="determinate" value={params.value || 0}
            sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.disabledBackground',
              '& .MuiLinearProgress-bar': { bgcolor: '#6C63FF', borderRadius: 3 } }} />
          <Typography variant="caption">{params.value || 0}%</Typography>
        </Box>
      )
    },
  ];

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={700}>Projects</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)} size="small">
            <ToggleButton value="card"><GridViewIcon /></ToggleButton>
            <ToggleButton value="table"><ListViewIcon /></ToggleButton>
          </ToggleButtonGroup>
          {user?.role === 'admin' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}
              sx={{ bgcolor: 'primary.main', fontWeight: 600 }}>
              New Project
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 160 }} size="small">
          <MenuItem value="">All Statuses</MenuItem>
          {PROJECT_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </TextField>
        <TextField placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)}
          size="small" sx={{ minWidth: 250 }} />
      </Box>

      {loading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3, bgcolor: 'action.hover' }} />
            </Grid>
          ))}
        </Grid>
      ) : viewMode === 'card' ? (
        <Grid container spacing={2.5}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project._id}>
              <Card onClick={() => navigate(`/projects/${project._id}`)}
                sx={{
                  cursor: 'pointer', bgcolor: 'background.paper', borderRadius: 3,
                  border: 1, borderColor: 'divider', transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 30px rgba(108,99,255,0.15)', borderColor: 'rgba(108,99,255,0.3)' }
                }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>{project.project_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{project.project_code}</Typography>
                    </Box>
                    <Chip label={project.status?.replace('_', ' ')} size="small"
                      sx={{ bgcolor: `${statusColors[project.status]}20`, color: statusColors[project.status], fontWeight: 600, textTransform: 'capitalize' }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, color: 'text.secondary' }}>
                    <LocationIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption">{project.location || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, color: 'text.secondary' }}>
                    <PersonIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption">{project.client_name || 'N/A'}</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.main', mb: 1.5 }}>
                    {formatCurrency(project.contract_value)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={project.completion_percentage || 0}
                      sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.disabledBackground',
                        '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 3 } }} />
                    <Typography variant="caption" fontWeight={600}>{project.completion_percentage || 0}%</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {projects.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">No projects found</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      ) : (
        <DataTable rows={projects} columns={columns} loading={loading} getRowId={(row) => row._id}
          onRowClick={(params) => navigate(`/projects/${params.row._id}`)} />
      )}

      <ProjectForm open={formOpen} onClose={() => { setFormOpen(false); setEditProject(null); }}
        project={editProject} onSave={handleSave} />
    </Box>
  );
}
