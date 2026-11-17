import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, LinearProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Skeleton, IconButton } from '@mui/material';
import { Download as DownloadIcon, Visibility as PreviewIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { formatCurrency, formatDate } from '../../utils/helpers';

const statusColors = { planning: '#6C63FF', active: '#22C55E', on_hold: '#F59E0B', completed: '#6C63FF', cancelled: '#EF4444' };

export default function ClientDashboard() {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchClientData(); }, []);

  const fetchClientData = async () => {
    try {
      const projRes = await api.get('/projects');
      const projects = projRes.data.projects || [];
      if (projects.length > 0) {
        const proj = projects[0];
        setProject(proj);
        try { const payRes = await api.get(`/payments/project/${proj._id}`); setPayments(payRes.data.payments || []); } catch {}
        try {
          const docRes = await api.get(`/documents/project/${proj._id}`);
          const allDocs = docRes.data.documents || [];
          setDocuments(allDocs.filter(d => d.metadata?.doc_type !== 'site_photos'));
          setPhotos(allDocs.filter(d => d.metadata?.doc_type === 'site_photos'));
        } catch {}
      }
    } catch {} finally { setLoading(false); }
  };

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = (project?.contract_value || 0) - totalPaid;

  if (loading) return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="rounded" height={60} sx={{ mb: 3, borderRadius: 3 }} />
      <Grid container spacing={2}>{Array.from({ length: 4 }).map((_, i) => <Grid item xs={12} sm={6} md={3} key={i}><Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} /></Grid>)}</Grid>
    </Box>
  );

  if (!project) return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography variant="h5" color="text.secondary">No project assigned to your account yet.</Typography>
    </Box>
  );

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>Welcome, {user?.name?.split(' ')[0]} 👋</Typography>
        <Typography variant="body1" color="text.secondary">Your project dashboard</Typography>
      </Box>

      {/* Project Overview */}
      <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, mb: 4, overflow: 'hidden' }}>
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${statusColors[project.status] || '#6C63FF'}, transparent)` }} />
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>{project.project_name}</Typography>
              <Typography variant="body2" color="text.secondary">{project.project_code} • {project.location}</Typography>
            </Box>
            <Chip label={project.status?.replace('_', ' ')} sx={{ bgcolor: `${statusColors[project.status]}20`, color: statusColors[project.status], fontWeight: 600, textTransform: 'capitalize' }} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Project Progress</Typography>
              <Typography variant="body2" fontWeight={600}>{project.completion_percentage || 0}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={project.completion_percentage || 0}
              sx={{ height: 10, borderRadius: 5, bgcolor: 'action.disabledBackground', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 5 } }} />
          </Box>
        </CardContent>
      </Card>

      {/* Financial Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Contract Value', value: formatCurrency(project.contract_value), color: '#6C63FF' },
          { label: 'Amount Paid', value: formatCurrency(totalPaid), color: 'primary.main' },
          { label: 'Remaining Balance', value: formatCurrency(remaining), color: remaining > 0 ? '#FFD93D' : '#6BCB77' },
          { label: 'Total Payments', value: payments.length, color: 'primary.main' },
        ].map((item, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: '3px solid #6C63FF' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: 'primary.main' }}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Site Photos */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Site Photos</Typography>
              {photos.length > 0 ? (
                <Grid container spacing={1}>
                  {photos.slice(0, 6).map(photo => (
                    <Grid item xs={4} key={photo._id}>
                      <Box sx={{ aspectRatio: '1', borderRadius: 2, overflow: 'hidden', cursor: 'pointer', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', '&:hover': { opacity: 0.8 } }}
                        onClick={() => window.open(`http://localhost:5000/api/documents/${photo._id}/preview`, '_blank')}>
                        <img src={`http://localhost:5000/api/documents/${photo._id}/preview`} alt="Site" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        <PreviewIcon sx={{ position: 'absolute', color: 'text.secondary' }} />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : <Typography variant="body2" color="text.secondary">No photos uploaded yet</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Documents */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Documents</Typography>
              {documents.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {documents.slice(0, 8).map(doc => (
                    <Box key={doc._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>{doc.filename || 'Document'}</Typography>
                        <Chip label={doc.metadata?.doc_type} size="small" sx={{ fontSize: '10px', textTransform: 'capitalize' }} />
                      </Box>
                      <IconButton size="small" onClick={() => window.open(`http://localhost:5000/api/documents/${doc._id}/download`)}><DownloadIcon fontSize="small" /></IconButton>
                    </Box>
                  ))}
                </Box>
              ) : <Typography variant="body2" color="text.secondary">No documents available</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Payment History */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Payment History</Typography>
              {remaining > 0 && (
                <Box sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: 'rgba(255,217,61,0.1)', border: '1px solid rgba(255,217,61,0.3)' }}>
                  <Typography variant="body2" sx={{ color: 'primary.main' }}>⚠️ Pending Payment: {formatCurrency(remaining)}</Typography>
                </Box>
              )}
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>Date</TableCell><TableCell>Amount</TableCell><TableCell>Method</TableCell><TableCell>Reference</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p._id} hover>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{p.payment_method?.replace('_', ' ')}</TableCell>
                        <TableCell>{p.transaction_reference || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>No payments recorded</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
