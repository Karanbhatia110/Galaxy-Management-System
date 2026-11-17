import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import BusinessIcon from '@mui/icons-material/Business';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

/* ───── Category config ───── */
const CATEGORY_META = {
  projects: { label: 'Projects', icon: FolderIcon, path: '/projects' },
  clients: { label: 'Clients', icon: BusinessIcon, path: '/clients' },
  documents: { label: 'Documents', icon: DescriptionIcon, path: '/documents' },
  users: { label: 'Users', icon: PeopleIcon, path: '/users' },
  invoices: { label: 'Invoices', icon: ReceiptIcon, path: '/invoices' },
};

/* ───── SearchBar Component ───── */
const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  /* -- Flatten results for keyboard nav -- */
  const flatItems = Object.entries(results).flatMap(([cat, items]) =>
    items.map((item) => ({ ...item, _category: cat })),
  );

  /* -- Debounced search -- */
  useEffect(() => {
    if (!query.trim()) {
      setResults({});
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/search', {
          params: { q: query },
          signal: controller.signal,
        });
        setResults(data || {});
        setOpen(true);
      } catch (err) {
        if (err.name !== 'CanceledError') setResults({});
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  /* -- Click outside -- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* -- Navigate to result -- */
  const goToResult = useCallback(
    (item) => {
      const meta = CATEGORY_META[item._category];
      const path = meta ? `${meta.path}/${item._id || item.id || ''}` : '/';
      navigate(path);
      setOpen(false);
      setQuery('');
    },
    [navigate],
  );

  /* -- Keyboard -- */
  const handleKeyDown = useCallback(
    (e) => {
      if (!open || flatItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? flatItems.length - 1 : prev - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        goToResult(flatItems[activeIndex]);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [open, flatItems, activeIndex, goToResult],
  );

  return (
    <Box ref={wrapperRef} sx={{ position: 'relative', width: '100%', maxWidth: 480 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search projects, clients, documents…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (Object.keys(results).length) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: loading ? (
            <InputAdornment position="end">
              <CircularProgress size={18} sx={{ color: 'primary.main' }} />
            </InputAdornment>
          ) : null,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.88rem',
            color: 'text.primary',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: '12px',
            '& fieldset': { borderColor: 'divider' },
            '&:hover fieldset': { borderColor: 'primary.light' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />

      {/* Dropdown */}
      {open && flatItems.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 400,
            overflowY: 'auto',
            borderRadius: '14px',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: 1300,
            '&::-webkit-scrollbar': { width: 5 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(108,99,255,0.3)', borderRadius: 3 },
          }}
        >
          {Object.entries(results).map(([category, items], catIdx) => {
            if (!items?.length) return null;
            const meta = CATEGORY_META[category] || { label: category, icon: FolderIcon };
            const CatIcon = meta.icon;

            return (
              <Box key={category}>
                {catIdx > 0 && <Divider sx={{ borderColor: 'divider' }} />}
                <Typography
                  sx={{
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'text.disabled',
                  }}
                >
                  {meta.label}
                </Typography>

                <List dense disablePadding>
                  {items.map((item) => {
                    const globalIdx = flatItems.findIndex(
                      (f) =>
                        f._category === category && (f._id || f.id) === (item._id || item.id),
                    );
                    const isActive = globalIdx === activeIndex;

                    return (
                      <ListItem
                        key={item._id || item.id || item.name}
                        onClick={() =>
                          goToResult({ ...item, _category: category })
                        }
                        sx={{
                          px: 2,
                          py: 0.8,
                          cursor: 'pointer',
                          backgroundColor: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
                          '&:hover': { backgroundColor: 'rgba(108,99,255,0.08)' },
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 34 }}>
                          <CatIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              noWrap
                              sx={{
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: 'text.primary',
                              }}
                            >
                              {item.name || item.title || item.label}
                            </Typography>
                          }
                          secondary={
                            item.subtitle && (
                              <Typography
                                noWrap
                                sx={{
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: '0.72rem',
                                  color: 'text.disabled',
                                }}
                              >
                                {item.subtitle}
                              </Typography>
                            )
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            );
          })}
        </Paper>
      )}

      {/* No results state */}
      {open && !loading && flatItems.length === 0 && query.trim() && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            p: 3,
            borderRadius: '14px',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: 1300,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.85rem',
              color: 'text.secondary',
            }}
          >
            No results found for "{query}"
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SearchBar;
