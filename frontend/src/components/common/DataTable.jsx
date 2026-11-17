import React, { useState, useCallback } from 'react';
import { Box, TextField, InputAdornment, Typography, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, GridToolbarContainer, GridToolbarExport, GridToolbarFilterButton } from '@mui/x-data-grid';

/* ───── Custom Toolbar ───── */
const CustomToolbar = ({ searchText, onSearchChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <GridToolbarContainer
      sx={{
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1 }}>
        <GridToolbarFilterButton
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        />
        <GridToolbarExport
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        />
      </Box>

      <TextField
        size="small"
        placeholder="Search…"
        value={searchText}
        onChange={onSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
        sx={{
          width: 260,
          '& .MuiOutlinedInput-root': {
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.85rem',
            color: 'text.primary',
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderRadius: '10px',
            '& fieldset': { borderColor: 'divider' },
            '&:hover fieldset': { borderColor: 'primary.light' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />
    </GridToolbarContainer>
  );
};

/* ───── DataTable Component ───── */
const DataTable = ({
  rows = [],
  columns = [],
  loading = false,
  onRowClick,
  pageSize = 10,
  checkboxSelection = false,
  toolbar = true,
  getRowId,
  sx: sxOverride,
  ...rest
}) => {
  const [searchText, setSearchText] = useState('');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleSearch = useCallback((e) => {
    setSearchText(e.target.value);
  }, []);

  /* Client-side quick filter */
  const filteredRows = searchText
    ? rows.filter((row) =>
        Object.values(row).some(
          (val) =>
            val !== null &&
            val !== undefined &&
            String(val).toLowerCase().includes(searchText.toLowerCase()),
        ),
      )
    : rows;

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        ...sxOverride,
      }}
    >
      <DataGrid
        rows={filteredRows}
        columns={columns}
        loading={loading}
        getRowId={getRowId}
        onRowClick={onRowClick}
        checkboxSelection={checkboxSelection}
        initialState={{
          pagination: { paginationModel: { pageSize } },
        }}
        pageSizeOptions={[5, 10, 25, 50]}
        disableRowSelectionOnClick
        slots={{
          toolbar: toolbar ? () => <CustomToolbar searchText={searchText} onSearchChange={handleSearch} /> : undefined,
          noRowsOverlay: () => (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography sx={{ color: 'text.disabled', fontFamily: 'Inter, sans-serif' }}>
                No data available
              </Typography>
            </Box>
          ),
        }}
        sx={{
          border: 'none',
          fontFamily: 'Inter, sans-serif',
          color: 'text.primary',
          minHeight: 400,

          /* Header */
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: isDark ? 'rgba(108,99,255,0.06)' : 'rgba(108,99,255,0.04)',
            borderBottom: 1,
            borderColor: 'divider',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'text.secondary',
          },
          '& .MuiDataGrid-columnSeparator': {
            display: 'none',
          },

          /* Rows */
          '& .MuiDataGrid-row': {
            borderBottom: 1, borderColor: 'divider',
            transition: 'background 0.2s ease',
            '&:nth-of-type(even)': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            },
            '&:hover': {
              backgroundColor: 'rgba(108,99,255,0.08) !important',
              cursor: onRowClick ? 'pointer' : 'default',
            },
          },
          '& .MuiDataGrid-cell': {
            borderBottom: 'none',
            fontSize: '0.875rem',
            color: 'text.primary',
          },

          /* Footer */
          '& .MuiDataGrid-footerContainer': {
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: isDark ? 'rgba(10,14,26,0.5)' : 'rgba(0,0,0,0.02)',
          },
          '& .MuiTablePagination-root': {
            color: 'text.secondary',
          },
          '& .MuiTablePagination-selectIcon': {
            color: 'text.secondary',
          },

          /* Checkbox */
          '& .MuiCheckbox-root': {
            color: 'rgba(108,99,255,0.4)',
            '&.Mui-checked': { color: 'primary.main' },
          },

          /* Loading overlay */
          '& .MuiDataGrid-overlay': {
            backgroundColor: isDark ? 'rgba(10,14,26,0.7)' : 'rgba(255,255,255,0.7)',
          },

          /* Scroll */
          '& .MuiDataGrid-virtualScroller::-webkit-scrollbar': {
            width: 6,
            height: 6,
          },
          '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(108,99,255,0.3)',
            borderRadius: 3,
          },
        }}
        {...rest}
      />
    </Box>
  );
};

export default DataTable;
