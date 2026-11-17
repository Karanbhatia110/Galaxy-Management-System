import React, { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Assessment, TrendingUp, TrendingDown, Summarize, People, Inventory2, Schedule, Download as DownloadIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { generatePDF, generateExcel } from '../../utils/reportGenerator';

const reportTypes = [
  { key: 'revenue', title: 'Revenue Report', desc: 'Payment receipts and revenue analysis', icon: <TrendingUp />, color: 'primary.main' },
  { key: 'expenses', title: 'Expense Report', desc: 'Detailed expense breakdown by category', icon: <TrendingDown />, color: 'primary.main' },
  { key: 'profit', title: 'Profit Report', desc: 'Revenue vs expenses with net profit', icon: <Assessment />, color: 'primary.main' },
  { key: 'project-summary', title: 'Project Summary', desc: 'Overview of all projects with financials', icon: <Summarize />, color: '#6C63FF' },
  { key: 'labour-cost', title: 'Labour Cost Report', desc: 'Worker costs and attendance summary', icon: <People />, color: 'primary.main' },
  { key: 'material-usage', title: 'Material Usage', desc: 'Inventory usage and stock levels', icon: <Inventory2 />, color: 'primary.main' },
  { key: 'payment-due', title: 'Payment Due Report', desc: 'Outstanding balances and dues', icon: <Schedule />, color: '#FF8C42' },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', project_id: '' });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);

  const handleGenerate = async (reportKey) => {
    setSelectedReport(reportKey);
    setFilterOpen(true);
    try { const r = await api.get('/projects'); setProjects(r.data.projects || []); } catch {}
  };

  const fetchReport = async () => {
    setFilterOpen(false);
    setLoading(true);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.project_id) params.project_id = filters.project_id;
      const res = await api.get(`/reports/${selectedReport}`, { params });
      setData(res.data.data || res.data.report || res.data || []);
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const handleDownloadPDF = () => {
    const report = reportTypes.find(r => r.key === selectedReport);
    const headers = getHeaders();
    const rows = data.map(d => headers.map(h => h.format ? h.format(d[h.field]) : d[h.field] || ''));
    generatePDF(report?.title || 'Report', headers.map(h => h.label), rows, `${selectedReport}_report.pdf`);
    toast.success('PDF downloaded');
  };

  const handleDownloadExcel = () => {
    const report = reportTypes.find(r => r.key === selectedReport);
    const headers = getHeaders();
    const rows = data.map(d => {
      const obj = {};
      headers.forEach(h => { obj[h.label] = h.format ? h.format(d[h.field]) : d[h.field] || ''; });
      return obj;
    });
    generateExcel(report?.title || 'Report', headers.map(h => h.label), rows, `${selectedReport}_report.xlsx`);
    toast.success('Excel downloaded');
  };

  const getHeaders = () => {
    switch (selectedReport) {
      case 'revenue': return [{ field: 'payment_date', label: 'Date', format: formatDate }, { field: 'amount', label: 'Amount', format: formatCurrency }, { field: 'payment_method', label: 'Method' }, { field: 'transaction_reference', label: 'Reference' }];
      case 'expenses': return [{ field: 'date', label: 'Date', format: formatDate }, { field: 'category', label: 'Category' }, { field: 'amount', label: 'Amount', format: formatCurrency }, { field: 'vendor', label: 'Vendor' }];
      case 'profit': return [{ field: 'project_name', label: 'Project' }, { field: 'revenue', label: 'Revenue', format: formatCurrency }, { field: 'expenses', label: 'Expenses', format: formatCurrency }, { field: 'profit', label: 'Profit', format: formatCurrency }];
      case 'project-summary': return [{ field: 'project_name', label: 'Project' }, { field: 'status', label: 'Status' }, { field: 'contract_value', label: 'Contract Value', format: formatCurrency }, { field: 'completion_percentage', label: 'Progress' }];
      case 'labour-cost': return [{ field: 'worker_name', label: 'Worker' }, { field: 'daily_wage', label: 'Daily Wage', format: formatCurrency }, { field: 'total_cost', label: 'Total Cost', format: formatCurrency }];
      case 'material-usage': return [{ field: 'material_name', label: 'Material' }, { field: 'quantity_purchased', label: 'Purchased' }, { field: 'quantity_used', label: 'Used' }, { field: 'quantity_remaining', label: 'Remaining' }];
      case 'payment-due': return [{ field: 'project_name', label: 'Project' }, { field: 'contract_value', label: 'Contract', format: formatCurrency }, { field: 'total_received', label: 'Received', format: formatCurrency }, { field: 'remaining', label: 'Due', format: formatCurrency }];
      default: return [];
    }
  };

  return (
    <Box className="animate-fade-in-up">
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>Reports</Typography>

      {!selectedReport || !data.length ? (
        <Grid container spacing={2.5}>
          {reportTypes.map((report) => (
            <Grid item xs={12} sm={6} md={4} key={report.key}>
              <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, cursor: 'pointer', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', borderColor: `${report.color}40`, boxShadow: `0 8px 30px ${report.color}20` } }}
                onClick={() => handleGenerate(report.key)}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 3, mx: 'auto', mb: 2, bgcolor: `${report.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: report.color }}>{report.icon}</Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>{report.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{report.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Button onClick={() => { setSelectedReport(null); setData([]); }} sx={{ color: 'text.secondary' }}>← Back to Reports</Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadPDF} sx={{ borderColor: 'divider' }}>PDF</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadExcel} sx={{ borderColor: 'divider' }}>Excel</Button>
            </Box>
          </Box>
          {loading ? <LoadingSpinner /> : (
            <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <Table>
                <TableHead><TableRow>{getHeaders().map(h => <TableCell key={h.field} sx={{ fontWeight: 600 }}>{h.label}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {(Array.isArray(data) ? data : []).map((row, i) => (
                    <TableRow key={i} hover>{getHeaders().map(h => <TableCell key={h.field}>{h.format ? h.format(row[h.field]) : row[h.field] || '-'}</TableCell>)}</TableRow>
                  ))}
                  {(!Array.isArray(data) || data.length === 0) && <TableRow><TableCell colSpan={getHeaders().length} align="center" sx={{ py: 4 }}>No data found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 3 } }}>
        <DialogTitle>Report Filters</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField fullWidth label="From" type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="To" type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField select fullWidth label="Project" value={filters.project_id} onChange={e => setFilters({ ...filters, project_id: e.target.value })}><MenuItem value="">All Projects</MenuItem>{projects.map(p => <MenuItem key={p._id} value={p._id}>{p.project_name}</MenuItem>)}</TextField></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setFilterOpen(false)}>Cancel</Button><Button variant="contained" onClick={fetchReport}>Generate</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
