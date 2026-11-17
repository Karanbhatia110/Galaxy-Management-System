import { createTheme } from '@mui/material/styles';

const PRIMARY = '#6C63FF';
const PRIMARY_LIGHT = '#8B85FF';
const PRIMARY_DARK = '#4A42CC';

const darkPalette = {
  mode: 'dark',
  primary: { main: PRIMARY, light: PRIMARY_LIGHT, dark: PRIMARY_DARK },
  secondary: { main: '#94A3B8', light: '#CBD5E1', dark: '#64748B' },
  background: { default: '#0A0E1A', paper: '#111827' },
  error: { main: '#EF4444' },
  warning: { main: '#F59E0B' },
  success: { main: '#22C55E' },
  info: { main: '#6C63FF' },
  text: { primary: '#F1F5F9', secondary: '#94A3B8' },
  divider: 'rgba(255, 255, 255, 0.08)',
};

const lightPalette = {
  mode: 'light',
  primary: { main: PRIMARY, light: PRIMARY_LIGHT, dark: PRIMARY_DARK },
  secondary: { main: '#64748B', light: '#94A3B8', dark: '#475569' },
  background: { default: '#F8FAFC', paper: '#FFFFFF' },
  error: { main: '#EF4444' },
  warning: { main: '#F59E0B' },
  success: { main: '#22C55E' },
  info: { main: '#6C63FF' },
  text: { primary: '#0F172A', secondary: '#64748B' },
  divider: 'rgba(0, 0, 0, 0.08)',
};

export default function getTheme(mode = 'dark') {
  const isDark = mode === 'dark';
  const palette = isDark ? darkPalette : lightPalette;

  return createTheme({
    palette,
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.01em' },
      h3: { fontWeight: 600, fontSize: '1.75rem' },
      h4: { fontWeight: 600, fontSize: '1.5rem' },
      h5: { fontWeight: 600, fontSize: '1.25rem' },
      h6: { fontWeight: 600, fontSize: '1rem' },
      subtitle1: { fontWeight: 500, fontSize: '1rem' },
      subtitle2: { fontWeight: 500, fontSize: '0.875rem' },
      body1: { fontSize: '1rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
      caption: { fontSize: '0.75rem' },
    },
    shape: { borderRadius: 12 },
    shadows: [
      'none',
      isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
      isDark ? '0 2px 6px rgba(0,0,0,0.35)' : '0 2px 6px rgba(0,0,0,0.1)',
      isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)',
      isDark ? '0 6px 16px rgba(0,0,0,0.45)' : '0 6px 16px rgba(0,0,0,0.1)',
      isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
      ...Array(19).fill(isDark ? '0 12px 32px rgba(0,0,0,0.55)' : '0 12px 32px rgba(0,0,0,0.1)'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#2D3748 #0A0E1A' : '#CBD5E1 #F8FAFC',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: palette.background.paper,
            border: `1px solid ${palette.divider}`,
            borderRadius: 16,
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? `0 8px 30px rgba(108,99,255,0.12)`
                : `0 4px 16px rgba(108,99,255,0.1)`,
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: '20px', '&:last-child': { paddingBottom: '20px' } },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, padding: '8px 20px', fontWeight: 600 },
          containedPrimary: {
            backgroundColor: PRIMARY,
            boxShadow: `0 4px 14px rgba(108,99,255,0.3)`,
            '&:hover': {
              backgroundColor: PRIMARY_DARK,
              boxShadow: `0 6px 20px rgba(108,99,255,0.4)`,
            },
          },
          outlined: {
            borderColor: palette.divider,
            '&:hover': {
              borderColor: PRIMARY,
              backgroundColor: `rgba(108,99,255,0.08)`,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: isDark ? 'rgba(10,14,26,0.95)' : 'rgba(255,255,255,0.95)',
            borderBottom: `1px solid ${palette.divider}`,
            boxShadow: isDark ? '0 2px 20px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isDark ? '#0D1117' : '#FFFFFF',
            borderRight: `1px solid ${palette.divider}`,
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'medium' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              '& fieldset': { borderColor: palette.divider },
              '&:hover fieldset': { borderColor: `rgba(108,99,255,0.4)` },
              '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: '2px' },
            },
            '& .MuiInputLabel-root': {
              '&.Mui-focused': { color: PRIMARY },
            },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isDark ? 'rgba(108,99,255,0.1)' : 'rgba(108,99,255,0.05)',
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: `1px solid ${isDark ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.1)'}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: 'rgba(108,99,255,0.04)' } },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${palette.divider}`, padding: '14px 16px' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: palette.background.paper,
            border: `1px solid ${palette.divider}`,
            borderRadius: 16,
            boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(0,0,0,0.15)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#1E293B' : '#334155',
            color: '#F1F5F9',
            fontSize: '0.75rem',
            borderRadius: 8,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            background: palette.background.paper,
            border: `1px solid ${palette.divider}`,
            borderRadius: 12,
            boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.4)' : '0 12px 40px rgba(0,0,0,0.12)',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            margin: '2px 6px',
            padding: '8px 12px',
            '&:hover': { backgroundColor: 'rgba(108,99,255,0.1)' },
            '&.Mui-selected': {
              backgroundColor: 'rgba(108,99,255,0.15)',
              '&:hover': { backgroundColor: 'rgba(108,99,255,0.2)' },
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4, height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
          bar: { borderRadius: 4, backgroundColor: PRIMARY },
        },
      },
      MuiAvatar: {
        styleOverrides: { root: { backgroundColor: PRIMARY, fontWeight: 600 } },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: 'rgba(108,99,255,0.1)' } },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none', fontWeight: 500, fontSize: '0.9rem', minHeight: 48,
            '&.Mui-selected': { fontWeight: 600 },
          },
        },
      },
      MuiTabs: {
        styleOverrides: { indicator: { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: PRIMARY } },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': {
              color: PRIMARY,
              '& + .MuiSwitch-track': { backgroundColor: PRIMARY, opacity: 0.5 },
            },
          },
        },
      },
      MuiBadge: {
        styleOverrides: { badge: { fontWeight: 600, fontSize: '0.7rem' } },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            '& .MuiPaginationItem-root': {
              borderRadius: 8,
              '&.Mui-selected': { backgroundColor: PRIMARY, color: '#fff' },
            },
          },
        },
      },
    },
  });
}
