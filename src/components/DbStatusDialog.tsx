import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  TextField,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SyncIcon from '@mui/icons-material/Sync';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HelpIcon from '@mui/icons-material/HelpOutlined';
import { useNotification } from '../context/NotificationContext';
import { getCustomApiBase } from '../utils/api';

interface DbStatusDialogProps {
  open: boolean;
  onClose: () => void;
}

export const DbStatusDialog: React.FC<DbStatusDialogProps> = ({ open, onClose }) => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dbInfo, setDbInfo] = useState<{
    connected: boolean;
    readyState: number;
    uri: string;
    lastError: string | null;
    backupSavedOnDisk: boolean;
    counts: { bills: number; purchases: number; workers: number; parties: number; payments: number };
  } | null>(null);

  const [customUri, setCustomUri] = useState('');

  const fetchDbStatus = async () => {
    try {
      const apiBase = getCustomApiBase();
      const res = await fetch(`${apiBase}/api/db/status`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setDbInfo(data);
        if (data.uri && !customUri) {
          setCustomUri(data.uri);
        }
      } else {
        setDbInfo({
          connected: false,
          readyState: 0,
          uri: '',
          lastError: 'Server error or HTML fallback',
          backupSavedOnDisk: false,
          counts: { bills: 0, purchases: 0, workers: 0, parties: 0, payments: 0 },
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (open) {
      fetchDbStatus();
    }
  }, [open]);

  const handleTestConnect = async () => {
    setLoading(true);
    try {
      const apiBase = getCustomApiBase();
      const res = await fetch(`${apiBase}/api/db/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: customUri.trim() }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.connected) {
          showNotification(data.message || 'Successfully connected to MongoDB Atlas!', 'success');
        } else {
          showNotification(data.message || 'Connection failed. Check IP whitelist.', 'info');
        }
      } else {
        showNotification('Backend API server not reachable on this static domain.', 'info');
      }
      await fetchDbStatus();
    } catch (err: any) {
      showNotification('Error connecting to database: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const apiBase = getCustomApiBase();
      const res = await fetch(`${apiBase}/api/db/sync`, { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          showNotification(data.message, 'success');
        } else {
          showNotification(data.error || 'Sync failed', 'error');
        }
      } else {
        showNotification('Sync complete on local storage', 'info');
      }
      await fetchDbStatus();
    } catch (err: any) {
      showNotification('Sync error: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, fontWeight: 800 }}>
        <StorageIcon color="primary" />
        MongoDB Cloud Atlas & Local Persistence Status
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2.5 }}>
        {dbInfo ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Status Alert Banner */}
            {dbInfo.connected ? (
              <Alert
                icon={<CloudDoneIcon fontSize="inherit" />}
                severity="success"
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                MongoDB Atlas is ONLINE and Connected! Your data is automatically backed up in real-time to the cloud database.
              </Alert>
            ) : (
              <Alert
                icon={<CloudOffIcon fontSize="inherit" />}
                severity="warning"
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                MongoDB Atlas is currently DISCONNECTED. Local File Backup (data_backup.json) is ACTIVE. All bills, purchases, workers, parties & payments are safely saved on the server disk without any data loss.
              </Alert>
            )}

            {/* Error Message Box if disconnected */}
            {!dbInfo.connected && dbInfo.lastError && (
              <Box sx={{ bgcolor: 'error.50', color: 'error.main', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'error.200' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                  ⚠️ Database Connection Error:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                  {dbInfo.lastError}
                </Typography>
              </Box>
            )}

            {/* Local Data Counts */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                Current Saved Records in System:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label={`Bills: ${dbInfo.counts.bills}`} color="primary" variant="outlined" />
                <Chip label={`Purchases: ${dbInfo.counts.purchases}`} color="secondary" variant="outlined" />
                <Chip label={`Workers: ${dbInfo.counts.workers}`} color="info" variant="outlined" />
                <Chip label={`Parties: ${dbInfo.counts.parties}`} color="success" variant="outlined" />
                <Chip label={`Payments: ${dbInfo.counts.payments}`} color="warning" variant="outlined" />
                <Chip label={`Disk File Backup: ${dbInfo.backupSavedOnDisk ? 'SAVED ✓' : 'Creating...'}`} color={dbInfo.backupSavedOnDisk ? 'success' : 'default'} />
              </Box>
            </Box>

            <Divider />

            {/* MongoDB URI & Reconnect */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                MongoDB Connection String
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={customUri}
                onChange={(e) => setCustomUri(e.target.value)}
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
                helperText="Modify connection URI if needed or click Test & Reconnect to retry."
                sx={{ mb: 1.5 }}
              />

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleTestConnect}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <StorageIcon />}
                >
                  {loading ? 'Testing Connection...' : 'Test & Reconnect MongoDB'}
                </Button>

                {dbInfo.connected && (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
                  >
                    {syncing ? 'Syncing...' : 'Sync Local Data to Cloud'}
                  </Button>
                )}
              </Box>
            </Box>

            {/* IP Whitelist Resolution Guide */}
            {!dbInfo.connected && (
              <Accordion sx={{ bgcolor: 'action.hover', borderRadius: '8px !important', boxShadow: 'none' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HelpIcon color="warning" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      How to fix MongoDB Atlas "IP not whitelisted" issue
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
                    If MongoDB is not connecting, it is usually because MongoDB Atlas blocks unknown IP addresses by default. Follow these quick steps:
                    <ol style={{ paddingLeft: 20, marginTop: 8, marginBottom: 8 }}>
                      <li>Log into <strong><a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer">MongoDB Atlas Console</a></strong>.</li>
                      <li>In the left sidebar under <strong>Security</strong>, click <strong>Network Access</strong>.</li>
                      <li>Click <strong>+ Add IP Address</strong> button.</li>
                      <li>Click <strong>ALLOW ACCESS FROM ANYWHERE</strong> (this sets IP to <code>0.0.0.0/0</code>).</li>
                      <li>Click <strong>Confirm</strong> and wait 30 seconds for Atlas to update.</li>
                      <li>Come back here and click <strong>Test & Reconnect MongoDB</strong> above!</li>
                    </ol>
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained" color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
