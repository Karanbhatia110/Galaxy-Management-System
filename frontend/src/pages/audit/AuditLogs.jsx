import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, MenuItem } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import { formatDateTime } from '../../utils/helpers';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchLogs(); }, [actionFilter, dateFrom, dateTo]);

  const fetchLogs = async () => {
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.audit_logs || []);
    } catch { toast.error('Failed to load audit logs'); } finally { setLoading(false); }
  };

  const columns = [
    { field: 'timestamp', headerName: 'Timestamp', width: 180, renderCell: (p) => formatDateTime(p.value) },
    { field: 'user_name', headerName: 'User', width: 150 },
    { field: 'action', headerName: 'Action', flex: 1, minWidth: 200 },
    { field: 'details', headerName: 'Details', flex: 1 },
    { field: 'ip_address', headerName: 'IP Address', width: 140 },
    { field: 'project_ref', headerName: 'Project Ref', width: 130 },
  ];

  return (
    <Box className="animate-fade-in-up">
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>Audit Logs</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Action" value={actionFilter} onChange={e => setActionFilter(e.target.value)} size="small" placeholder="Filter by action..." sx={{ minWidth: 200 }} />
        <TextField label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
        <TextField label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
      </Box>
      <DataTable rows={logs} columns={columns} loading={loading} getRowId={r => r._id} pageSize={20} />
    </Box>
  );
}
