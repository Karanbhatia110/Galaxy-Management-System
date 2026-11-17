import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

/* ───── Helpers ───── */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/* ───── FileUpload Component ───── */
const FileUpload = ({
  onUpload,
  accept = '*',
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10 MB default
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]); // { file, progress, status }
  const inputRef = useRef(null);

  /* ---- Drag handlers ---- */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    },
    [isDragging],
  );

  /* ---- Process selected / dropped files ---- */
  const processFiles = useCallback(
    (incoming) => {
      const accepted = Array.from(incoming).map((file) => {
        if (file.size > maxSize) {
          return { file, progress: 0, status: 'error', error: `Exceeds ${formatFileSize(maxSize)}` };
        }
        return { file, progress: 0, status: 'ready' };
      });

      setFiles((prev) => (multiple ? [...prev, ...accepted] : accepted.slice(0, 1)));

      /* Forward valid files to parent */
      const validFiles = accepted.filter((f) => f.status !== 'error').map((f) => f.file);
      if (validFiles.length > 0 && onUpload) {
        onUpload(validFiles);

        /* Simulate upload progress for UI feedback */
        accepted
          .filter((f) => f.status !== 'error')
          .forEach((entry) => {
            let progress = 0;
            const interval = setInterval(() => {
              progress += Math.random() * 30 + 10;
              if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setFiles((prev) =>
                  prev.map((f) =>
                    f.file.name === entry.file.name && f.file.size === entry.file.size
                      ? { ...f, progress: 100, status: 'done' }
                      : f,
                  ),
                );
              } else {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.file.name === entry.file.name && f.file.size === entry.file.size
                      ? { ...f, progress: Math.min(progress, 95), status: 'uploading' }
                      : f,
                  ),
                );
              }
            }, 400);
          });
      }
    },
    [maxSize, multiple, onUpload],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const handleFileSelect = useCallback(
    (e) => {
      if (e.target.files?.length) processFiles(e.target.files);
      e.target.value = ''; // reset input
    },
    [processFiles],
  );

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ---- Status icon ---- */
  const statusIcon = (entry) => {
    if (entry.status === 'done') return <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />;
    if (entry.status === 'error') return <ErrorIcon sx={{ color: 'primary.main', fontSize: 20 }} />;
    return null;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Drop zone */}
      <Box
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          p: 5,
          borderRadius: '16px',
          border: `2px dashed ${isDragging ? '#6C63FF' : 'rgba(108,99,255,0.25)'}`,
          backgroundColor: isDragging ? 'rgba(108,99,255,0.08)' : 'rgba(17,24,39,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: '#6C63FF',
            backgroundColor: 'rgba(108,99,255,0.05)',
          },
        }}
      >
        <CloudUploadIcon
          sx={{
            fontSize: 52,
            color: isDragging ? '#6C63FF' : 'rgba(108,99,255,0.45)',
            mb: 2,
            transition: 'color 0.3s ease',
          }}
        />
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '1rem',
            color: isDragging ? '#6C63FF' : 'rgba(255,255,255,0.7)',
            mb: 0.5,
          }}
        >
          {isDragging ? 'Drop files here' : 'Drop files here or click to browse'}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          Max file size: {formatFileSize(maxSize)} {accept !== '*' ? `• ${accept}` : ''}
        </Typography>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </Box>

      {/* File list */}
      {files.length > 0 && (
        <List sx={{ mt: 2 }}>
          {files.map((entry, idx) => (
            <ListItem
              key={`${entry.file.name}-${idx}`}
              sx={{
                mb: 1,
                px: 2,
                py: 1.5,
                borderRadius: '12px',
                backgroundColor: 'rgba(17,24,39,0.7)',
                border: '1px solid rgba(108,99,255,0.08)',
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <InsertDriveFileIcon sx={{ color: '#6C63FF', fontSize: 24 }} />
              </ListItemIcon>

              <ListItemText
                primary={
                  <Typography
                    noWrap
                    sx={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: '#E0E0E0',
                    }}
                  >
                    {entry.file.name}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '0.72rem',
                        color: entry.status === 'error' ? '#FF6B6B' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      {entry.status === 'error' ? entry.error : formatFileSize(entry.file.size)}
                    </Typography>
                    {(entry.status === 'uploading' || entry.status === 'ready') && (
                      <LinearProgress
                        variant="determinate"
                        value={entry.progress}
                        sx={{
                          mt: 0.5,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: 'rgba(108,99,255,0.12)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            background: 'linear-gradient(90deg, #6C63FF, #00D4AA)',
                          },
                        }}
                      />
                    )}
                  </Box>
                }
              />

              <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {statusIcon(entry)}
                <IconButton size="small" onClick={() => removeFile(idx)}>
                  <CloseIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.35)' }} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FileUpload;
