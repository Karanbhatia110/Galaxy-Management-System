import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
  useTheme,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Delete',
  confirmColor = 'error',
  cancelText = 'Cancel',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const colorMap = {
    error: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444', hover: 'rgba(239,68,68,0.2)' },
    warning: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', hover: 'rgba(245,158,11,0.2)' },
    primary: { bg: 'rgba(108,99,255,0.12)', text: '#6C63FF', hover: 'rgba(108,99,255,0.2)' },
    success: { bg: 'rgba(34,197,94,0.12)', text: '#22C55E', hover: 'rgba(34,197,94,0.2)' },
  };
  const scheme = colorMap[confirmColor] || colorMap.error;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '18px',
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.6)' : '0 24px 80px rgba(0,0,0,0.15)',
          overflow: 'visible',
        },
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          color: 'text.disabled',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogTitle sx={{ pb: 0, pt: 4, textAlign: 'center' }}>
        {/* Warning icon badge */}
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            mx: 'auto',
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: scheme.bg,
            border: `1px solid ${scheme.text}33`,
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 30, color: scheme.text }} />
        </Box>

        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '1.2rem',
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', pt: 1.5, px: 4 }}>
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            color: 'text.secondary',
            lineHeight: 1.65,
          }}
        >
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 3.5, pt: 1, justifyContent: 'center', gap: 1.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '0.85rem',
            textTransform: 'none',
            borderRadius: '10px',
            px: 3.5,
            py: 1,
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'text.disabled',
              backgroundColor: 'action.hover',
            },
          }}
        >
          {cancelText}
        </Button>

        <Button
          onClick={() => {
            onConfirm?.();
            onClose?.();
          }}
          variant="contained"
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '0.85rem',
            textTransform: 'none',
            borderRadius: '10px',
            px: 3.5,
            py: 1,
            backgroundColor: scheme.text,
            color: '#fff',
            boxShadow: `0 4px 16px ${scheme.text}44`,
            '&:hover': {
              backgroundColor: scheme.text,
              filter: 'brightness(1.15)',
              boxShadow: `0 6px 24px ${scheme.text}55`,
            },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
