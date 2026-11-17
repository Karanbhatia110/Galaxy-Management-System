import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, TextField, MenuItem, Dialog, DialogTitle, DialogContent, Chip, IconButton } from '@mui/material';
import { Add as AddIcon, Download as DownloadIcon, Delete as DeleteIcon, Visibility as PreviewIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import FileUpload from '../../components/common/FileUpload';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/helpers';
import { DOCUMENT_TYPES } from '../../utils/constants';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState('bills');
  const [uploadProject, setUploadProject] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { if (projects.length) fetchDocuments(); }, [projectFilter, typeFilter, projects]);

  const fetchProjects = async () => { try { const r = await api.get('/projects'); setProjects(r.data.projects || []); } catch {} };

  const fetchDocuments = async () => {
    try {
      const allDocs = [];
      const targetProjects = projectFilter ? [{ _id: projectFilter }] : projects.slice(0, 20);
      for (const p of targetProjects) {
        try {
          const params = {};
          if (typeFilter) params.doc_type = typeFilter;
          const res = await api.get(`/documents/project/${p._id}`, { params });
          allDocs.push(...(res.data.documents || []));
        } catch {}
      }
      setDocuments(allDocs);
    } catch {} finally { setLoading(false); }
  };

  const handleUpload = async (files) => {
    if (!uploadProject) { toast.error('Select a project'); return; }
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_type', docType);
      try { await api.post(`/documents/project/${uploadProject}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      catch (err) { toast.error(`Failed to upload ${file.name}`); }
    }
    toast.success('Uploaded successfully');
    setUploadOpen(false);
    fetchDocuments();
  };

  const handleDelete = async () => {
    try { await api.delete(`/documents/${deleteDialog.id}`); toast.success('Deleted'); setDeleteDialog({ open: false, id: '' }); fetchDocuments(); }
    catch { toast.error('Failed to delete'); }
  };

  const typeColors = { bills: '#FF6B6B', invoices: '#FFD93D', contracts: '#6C63FF', drawings: '#00D4AA', site_photos: '#45B7D1', certificates: '#6BCB77', quotations: '#8B85FF' };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Documents</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setUploadOpen(true)} sx={{ bgcolor: 'primary.main' }}>Upload</Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField select label="Project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} size="small" sx={{ minWidth: 200 }}>
          <MenuItem value="">All Projects</MenuItem>
          {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}
        </TextField>
        <TextField select label="Type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} size="small" sx={{ minWidth: 160 }}>
          <MenuItem value="">All Types</MenuItem>
          {DOCUMENT_TYPES.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
        </TextField>
      </Box>
      <Grid container spacing={2}>
        {documents.map(doc => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={doc._id}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, transition: 'all 0.3s', '&:hover': { borderColor: 'rgba(108,99,255,0.3)', transform: 'translateY(-2px)' } }}>
              <CardContent>
                <Typography variant="body2" fontWeight={600} noWrap sx={{ mb: 0.5 }}>{doc.filename || doc.metadata?.original_filename || 'Document'}</Typography>
                <Chip label={doc.metadata?.doc_type || 'other'} size="small" sx={{ bgcolor: `${typeColors[doc.metadata?.doc_type] || '#666'}20`, color: typeColors[doc.metadata?.doc_type] || '#666', textTransform: 'capitalize', fontSize: '10px', mb: 1 }} />
                <Typography variant="caption" display="block" color="text.secondary">{formatDate(doc.uploadDate || doc.metadata?.upload_date)}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <IconButton size="small" onClick={() => window.open(`http://localhost:5000/api/documents/${doc._id}/preview`, '_blank')} title="Preview"><PreviewIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => window.open(`http://localhost:5000/api/documents/${doc._id}/download`)} title="Download"><DownloadIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => setDeleteDialog({ open: true, id: doc._id })} title="Delete"><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {documents.length === 0 && <Grid item xs={12}><Box sx={{ textAlign: 'center', py: 8 }}><Typography color="text.secondary">No documents found</Typography></Box></Grid>}
      </Grid>
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Project *" value={uploadProject} onChange={e => setUploadProject(e.target.value)} sx={{ mt: 1, mb: 2 }}>
            {projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Document Type" value={docType} onChange={e => setDocType(e.target.value)} sx={{ mb: 2 }}>
            {DOCUMENT_TYPES.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
          </TextField>
          <FileUpload onUpload={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.docx" multiple />
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '' })} onConfirm={handleDelete} title="Delete Document" message="This will permanently remove the document." />
    </Box>
  );
}
