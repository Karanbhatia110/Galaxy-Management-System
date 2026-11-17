import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Card, CardContent, Chip, Tabs, Tab,
  LinearProgress, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Skeleton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  ArrowBack as BackIcon, Edit as EditIcon, Download as DownloadIcon,
  Delete as DeleteIcon, Add as AddIcon, Visibility as PreviewIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import ProjectForm from './ProjectForm';
import FileUpload from '../../components/common/FileUpload';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, DOCUMENT_TYPES } from '../../utils/constants';

const statusColors = { planning: '#6C63FF', active: '#22C55E', on_hold: '#F59E0B', completed: '#6C63FF', cancelled: '#EF4444' };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [docDialog, setDocDialog] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: '', payment_method: 'bank_transfer', transaction_reference: '', remarks: '' });
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: 'cement', date: '', vendor: '', notes: '' });
  const [reportForm, setReportForm] = useState({ date: '', work_completed: '', labour_count: '', issues_faced: '', remarks: '' });
  const [docType, setDocType] = useState('bills');

  useEffect(() => { fetchProject(); }, [id]);
  useEffect(() => { if (project) fetchTabData(); }, [tabIndex, project]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project || res.data);
    } catch (err) { toast.error('Failed to load project'); navigate('/projects'); }
    finally { setLoading(false); }
  };

  const fetchTabData = async () => {
    try {
      if (tabIndex === 1) { const res = await api.get(`/payments/project/${id}`); setPayments(res.data.payments || []); }
      if (tabIndex === 2) { const res = await api.get(`/expenses/project/${id}`); setExpenses(res.data.expenses || []); }
      if (tabIndex === 3) { const res = await api.get(`/documents/project/${id}`); setDocuments(res.data.documents || []); }
      if (tabIndex === 4) { const res = await api.get(`/daily-reports/project/${id}`); setDailyReports(res.data.reports || []); }
    } catch (err) { console.error(err); }
  };

  const handleAddPayment = async () => {
    try {
      await api.post(`/payments/project/${id}`, { ...paymentForm, amount: parseFloat(paymentForm.amount) });
      toast.success('Payment recorded');
      setPaymentDialog(false);
      setPaymentForm({ amount: '', payment_date: '', payment_method: 'bank_transfer', transaction_reference: '', remarks: '' });
      fetchProject(); fetchTabData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add payment'); }
  };

  const handleAddExpense = async () => {
    try {
      await api.post(`/expenses/project/${id}`, { ...expenseForm, amount: parseFloat(expenseForm.amount) });
      toast.success('Expense added');
      setExpenseDialog(false);
      setExpenseForm({ amount: '', category: 'cement', date: '', vendor: '', notes: '' });
      fetchProject(); fetchTabData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add expense'); }
  };

  const handleUploadDoc = async (files) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_type', docType);
      try {
        await api.post(`/documents/project/${id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (err) { toast.error(`Failed to upload ${file.name}`); }
    }
    toast.success('Documents uploaded');
    setDocDialog(false);
    fetchTabData();
  };

  const handleAddReport = async () => {
    try {
      await api.post(`/daily-reports/project/${id}`, { ...reportForm, labour_count: parseInt(reportForm.labour_count) || 0 });
      toast.success('Report created');
      setReportDialog(false);
      setReportForm({ date: '', work_completed: '', labour_count: '', issues_faced: '', remarks: '' });
      fetchTabData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create report'); }
  };

  const handleDelete = async () => {
    try {
      if (deleteDialog.type === 'payment') await api.delete(`/payments/${deleteDialog.id}`);
      else if (deleteDialog.type === 'expense') await api.delete(`/expenses/${deleteDialog.id}`);
      else if (deleteDialog.type === 'document') await api.delete(`/documents/${deleteDialog.id}`);
      toast.success('Deleted successfully');
      setDeleteDialog({ open: false, type: '', id: '' });
      fetchProject(); fetchTabData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  if (loading) return <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 2 }} /><Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} /></Box>;

  const totalReceived = project?.total_received || 0;
  const totalExpenses = project?.total_expenses || 0;
  const remaining = (project?.contract_value || 0) - totalReceived;

  return (
    <Box className="animate-fade-in-up">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/projects')}><BackIcon /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" fontWeight={700}>{project?.project_name}</Typography>
            <Chip label={project?.status?.replace('_', ' ')} sx={{ bgcolor: `${statusColors[project?.status]}20`, color: statusColors[project?.status], fontWeight: 600, textTransform: 'capitalize' }} />
          </Box>
          <Typography variant="body2" color="text.secondary">{project?.project_code} • {project?.location}</Typography>
        </Box>
        {user?.role === 'admin' && (
          <Button startIcon={<EditIcon />} variant="outlined" onClick={() => setEditOpen(true)} sx={{ borderColor: 'divider' }}>Edit</Button>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Contract Value', value: formatCurrency(project?.contract_value), color: '#6C63FF' },
          { label: 'Amount Received', value: formatCurrency(totalReceived), color: 'primary.main' },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: 'primary.main' },
          { label: 'Remaining', value: formatCurrency(remaining), color: 'primary.main' },
          { label: 'Profit', value: formatCurrency(totalReceived - totalExpenses), color: 'primary.main' },
          { label: 'Completion', value: `${project?.completion_percentage || 0}%`, color: 'primary.main' },
        ].map((item, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, borderTop: '3px solid #6C63FF' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.main' }}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <LinearProgress variant="determinate" value={project?.completion_percentage || 0}
        sx={{ height: 8, borderRadius: 4, mb: 3, bgcolor: 'action.disabledBackground',
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 } }} />

      <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
          <Tab label="Overview" />
          <Tab label="Payments" />
          <Tab label="Expenses" />
          <Tab label="Documents" />
          <Tab label="Daily Reports" />
        </Tabs>
        <CardContent>
          {tabIndex === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {[['Client', project?.client_name], ['Location', project?.location],
                  ['Start Date', formatDate(project?.start_date)], ['Expected Completion', formatDate(project?.expected_completion_date)],
                ].map(([l, v], i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">{l}</Typography>
                    <Typography variant="body2" fontWeight={500}>{v || 'N/A'}</Typography>
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Description</Typography>
                <Typography variant="body2" color="text.secondary">{project?.description || 'No description provided'}</Typography>
              </Grid>
            </Grid>
          )}

          {tabIndex === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                {['admin', 'accountant'].includes(user?.role) && (
                  <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setPaymentDialog(true)}
                    sx={{ bgcolor: 'primary.main' }}>Add Payment</Button>
                )}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>Date</TableCell><TableCell>Amount</TableCell><TableCell>Method</TableCell>
                    <TableCell>Reference</TableCell><TableCell>Remarks</TableCell><TableCell>Actions</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p._id} hover>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>{formatCurrency(p.amount)}</TableCell>
                        <TableCell><Chip label={p.payment_method} size="small" sx={{ fontSize: '11px' }} /></TableCell>
                        <TableCell>{p.transaction_reference || '-'}</TableCell>
                        <TableCell>{p.remarks || '-'}</TableCell>
                        <TableCell>
                          {user?.role === 'admin' && (
                            <IconButton size="small" onClick={() => setDeleteDialog({ open: true, type: 'payment', id: p._id })}><DeleteIcon fontSize="small" /></IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>No payments recorded</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabIndex === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                {['admin', 'accountant', 'site_manager'].includes(user?.role) && (
                  <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setExpenseDialog(true)}
                    sx={{ bgcolor: 'primary.main' }}>Add Expense</Button>
                )}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>Date</TableCell><TableCell>Category</TableCell><TableCell>Amount</TableCell>
                    <TableCell>Vendor</TableCell><TableCell>Notes</TableCell><TableCell>Actions</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {expenses.map(e => (
                      <TableRow key={e._id} hover>
                        <TableCell>{formatDate(e.date)}</TableCell>
                        <TableCell><Chip label={e.category} size="small" sx={{ textTransform: 'capitalize', fontSize: '11px' }} /></TableCell>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>{formatCurrency(e.amount)}</TableCell>
                        <TableCell>{e.vendor || '-'}</TableCell>
                        <TableCell>{e.notes || '-'}</TableCell>
                        <TableCell>
                          {user?.role === 'admin' && (
                            <IconButton size="small" onClick={() => setDeleteDialog({ open: true, type: 'expense', id: e._id })}><DeleteIcon fontSize="small" /></IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenses.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>No expenses recorded</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabIndex === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setDocDialog(true)}
                  sx={{ bgcolor: 'primary.main' }}>Upload Document</Button>
              </Box>
              <Grid container spacing={2}>
                {documents.map(doc => (
                  <Grid item xs={12} sm={6} md={4} key={doc._id}>
                    <Card sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{doc.filename}</Typography>
                        <Chip label={doc.metadata?.doc_type || 'other'} size="small" sx={{ mt: 0.5, mb: 1, fontSize: '10px', textTransform: 'capitalize' }} />
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => window.open(`http://localhost:5000/api/documents/${doc._id}/preview`, '_blank')}><PreviewIcon fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => window.open(`http://localhost:5000/api/documents/${doc._id}/download`)}><DownloadIcon fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => setDeleteDialog({ open: true, type: 'document', id: doc._id })}><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {documents.length === 0 && (
                  <Grid item xs={12}><Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No documents uploaded</Typography></Grid>
                )}
              </Grid>
            </Box>
          )}

          {tabIndex === 4 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                {['admin', 'site_manager'].includes(user?.role) && (
                  <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setReportDialog(true)}
                    sx={{ bgcolor: 'primary.main' }}>New Report</Button>
                )}
              </Box>
              {dailyReports.map(r => (
                <Card key={r._id} sx={{ mb: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>{formatDate(r.date)}</Typography>
                      <Chip label={`${r.labour_count || 0} workers`} size="small" sx={{ fontSize: '11px' }} />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>{r.work_completed}</Typography>
                    {r.issues_faced && <Typography variant="body2" color="error.main" sx={{ fontSize: '12px' }}>Issues: {r.issues_faced}</Typography>}
                  </CardContent>
                </Card>
              ))}
              {dailyReports.length === 0 && <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No reports yet</Typography>}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Amount (₹)" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Date" type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth label="Method" value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
              {PAYMENT_METHODS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Reference" value={paymentForm.transaction_reference} onChange={e => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Remarks" value={paymentForm.remarks} onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setPaymentDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddPayment}>Record</Button></DialogActions>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialog} onClose={() => setExpenseDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Amount (₹)" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField select fullWidth label="Category" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Date" type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Vendor" value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" value={expenseForm.notes} onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setExpenseDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddExpense}>Add</Button></DialogActions>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={docDialog} onClose={() => setDocDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Document Type" value={docType} onChange={e => setDocType(e.target.value)} sx={{ mb: 2, mt: 1 }}>
            {DOCUMENT_TYPES.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
          </TextField>
          <FileUpload onUpload={handleUploadDoc} accept=".pdf,.jpg,.jpeg,.png,.docx" multiple />
        </DialogContent>
      </Dialog>

      {/* Daily Report Dialog */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>New Daily Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Date" type="date" value={reportForm.date} onChange={e => setReportForm({ ...reportForm, date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Labour Count" type="number" value={reportForm.labour_count} onChange={e => setReportForm({ ...reportForm, labour_count: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Work Completed" value={reportForm.work_completed} onChange={e => setReportForm({ ...reportForm, work_completed: e.target.value })} multiline rows={3} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Issues Faced" value={reportForm.issues_faced} onChange={e => setReportForm({ ...reportForm, issues_faced: e.target.value })} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Remarks" value={reportForm.remarks} onChange={e => setReportForm({ ...reportForm, remarks: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setReportDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddReport}>Create</Button></DialogActions>
      </Dialog>

      <ProjectForm open={editOpen} onClose={() => setEditOpen(false)} project={project} onSave={() => { setEditOpen(false); fetchProject(); }} />
      <ConfirmDialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: '', id: '' })} onConfirm={handleDelete} title="Confirm Delete" message="Are you sure you want to delete this item?" />
    </Box>
  );
}
