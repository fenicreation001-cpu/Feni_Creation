import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const handleDismiss = onCancel || onClose || (() => {});
  return (
    <Dialog open={open} onClose={handleDismiss}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDismiss}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Confirm Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};
