import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress } from '@mui/material';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirm Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const handleDismiss = () => {
    if (loading) return;
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const handleConfirmClick = async () => {
    try {
      setLoading(true);
      await Promise.resolve(onConfirm());
    } finally {
      setLoading(false);
      // Ensure dialog closes if caller didn't already close it
      if (onClose) onClose();
      else if (onCancel) onCancel();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 0.5,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>{title}</DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        <Button
          onClick={handleDismiss}
          disabled={loading}
          variant="outlined"
          size="small"
          sx={{ textTransform: 'none', borderRadius: 2, px: 2, fontWeight: 600 }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirmClick}
          disabled={loading}
          color="error"
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: 'none', borderRadius: 2, px: 2.5, fontWeight: 700, boxShadow: 'none' }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

