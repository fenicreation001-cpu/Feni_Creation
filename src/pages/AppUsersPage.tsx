import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Avatar,
  TablePagination,
  Paper,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/PhoneAndroid';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyIcon from '@mui/icons-material/Key';
import { AppUser } from '../types';
import { formatDate } from '../utils/formatters';
import { apiClient } from '../utils/api';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useNotification } from '../context/NotificationContext';

export const AppUsersPage: React.FC = () => {
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('1234');

  const { showNotification } = useNotification();
  const showSuccess = (msg: string) => showNotification(msg, 'success');
  const showError = (msg: string) => showNotification(msg, 'error');

  useEffect(() => {
    loadData();

    // Auto refresh data every 5 seconds so new app users appear live
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);

    const onFocus = () => loadData(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const usersData = (await apiClient.get('/api/app-users').catch(() => [])) as AppUser[];
      setAppUsers(usersData || []);
    } catch (err: any) {
      if (!silent) {
        showError('ડેટા લોડ કરવામાં ભૂલ આવી: ' + (err.message || 'માહિતી પ્રાપ્ત થઈ નથી'));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFullName('');
    setMobileNumber('');
    setPassword('1234');
    setOpenModal(true);
  };

  const handleOpenEditModal = (user: AppUser) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setMobileNumber(user.mobileNumber);
    setPassword(user.password || '1234');
    setOpenModal(true);
  };

  const handleSaveUser = async () => {
    if (!fullName.trim()) {
      showError('કૃપા કરીને યુઝરનું પૂરું નામ દાખલ કરો');
      return;
    }
    if (!mobileNumber.trim()) {
      showError('કૃપા કરીને મોબાઇલ નંબર દાખલ કરો');
      return;
    }

    try {
      if (editingUser) {
        // Update User
        const payload = {
          fullName,
          mobileNumber,
          password,
          status: 'Approved',
        };
        await apiClient.put(`/app-users/${editingUser.id}`, payload);
        showSuccess('એપ યુઝરની વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ!');
      } else {
        // Add User directly
        const payload = {
          fullName,
          mobileNumber,
          password,
          status: 'Approved',
        };
        await apiClient.post('/app-users', payload);
        showSuccess('નવો એપ યુઝર સફળતાપૂર્વક ઉમેરાયો!');
      }
      setOpenModal(false);
      loadData();
    } catch (err: any) {
      showError(err.message || 'સેવ કરવામાં ભૂલ આવી');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await apiClient.delete(`/app-users/${deletingId}`);
      showSuccess('એપ યુઝર સફળતાપૂર્વક ડિલીટ થઈ ગયો!');
      setDeletingId(null);
      setDeleteConfirmOpen(false);
      loadData();
    } catch (err: any) {
      showError('ડિલીટ કરવામાં ભૂલ આવી');
    }
  };

  // Filtered List
  const filteredUsers = appUsers.filter((u) => {
    const matchesSearch =
      (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.mobileNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.linkedPartyName && u.linkedPartyName.toLowerCase().includes(search.toLowerCase()));

    return matchesSearch;
  });

  const totalUsers = appUsers.length;

  return (
    <Box sx={{ maxWidth: '1400px', mx: 'auto', pb: 6 }}>
      {/* Top Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.4)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justify: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  display: 'inline-flex',
                }}
              >
                <PhoneIcon fontSize="medium" />
              </Box>
              <Chip
                label="મોબાઈલ એપ્લિકેશન યુઝર્સ"
                size="small"
                sx={{ bgcolor: '#a5b4fc', color: '#1e1b4b', fontWeight: 800, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.8, fontSize: { xs: '1.4rem', sm: '1.9rem' } }}>
              App User Management (એપ યુઝર મેનેજમેન્ટ)
            </Typography>
            <Typography variant="body2" sx={{ color: '#e0e7ff', maxWidth: '750px', lineHeight: 1.6 }}>
              એપ યુઝર્સનું સંચાલન કરો. નવો યુઝર ઉમેરો અથવા જરૂરિયાત મુજબ યુઝર એકાઉન્ટ ડિલીટ કરો.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', ml: { md: 'auto' } }}>
            <Button
              variant="outlined"
              onClick={() => loadData()}
              startIcon={<RefreshIcon />}
              sx={{ color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              રીફ્રેશ
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenAddModal}
              startIcon={<AddIcon />}
              sx={{ bgcolor: '#22c55e', color: '#ffffff', fontWeight: 800, '&:hover': { bgcolor: '#16a34a' } }}
            >
              નવો યુઝર ઉમેરો
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Metric Cards & Search Bar */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', minWidth: { xs: '100%', sm: '260px' } }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                  કુલ એપ યુઝર્સ (Total)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.2 }}>
                  {totalUsers} યુઝર્સ
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0284c7', width: 40, height: 40 }}>
                <PersonIcon fontSize="medium" />
              </Avatar>
            </Box>
          </CardContent>
        </Card>

        <TextField
          size="small"
          placeholder="નામ કે મોબાઇલ નંબર શોધો..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: '320px' }, bgcolor: '#ffffff', borderRadius: 2 }}
        />
      </Box>

      {/* App Users Table */}
      <Card sx={{ borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>યુઝરનું નામ (Full Name)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>મોબાઇલ નંબર (Mobile)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>પાસવર્ડ (Password)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>ઉમેર્યા તારીખ (Created Date)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: '#334155' }}>એક્શન (Actions)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      કોઈ એપ યુઝર મળ્યા નથી
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      ઉપર "નવો યુઝર ઉમેરો" બટન પર ક્લિક કરીને નવો એપ યુઝર ઉમેરી શકો છો.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => {
                    return (
                      <TableRow
                        key={user.id}
                        hover
                        sx={{ transition: 'background-color 0.2s' }}
                      >
                        {/* Name */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              sx={{
                                bgcolor: '#e0e7ff',
                                color: '#4338ca',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                              }}
                            >
                              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                {user.fullName}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Mobile Number */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <PhoneIcon fontSize="small" sx={{ color: '#64748b' }} />
                            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#0369a1' }}>
                              <a href={`tel:${user.mobileNumber}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                {user.mobileNumber}
                              </a>
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Password */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <KeyIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                              {user.password || '1234'}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#475569' }}>
                            {formatDate(user.requestedAt || user.approvedAt || new Date().toISOString())}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <Tooltip title="એડિટ કરો (Edit User)">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(user)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="ડિલીટ કરો (Delete User)">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setDeletingId(user.id);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      {/* Add / Edit App User Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {editingUser ? 'એપ યુઝર માહિતી સુધારો (Edit App User)' : 'નવો એપ યુઝર ઉમેરો (Add New App User)'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="યુઝરનું પૂરું નામ (Full Name)"
              fullWidth
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="દા.ત. શિવમ ફેશન / રમેશભાઈ"
            />

            <TextField
              label="મોબાઇલ નંબર (Mobile Number)"
              fullWidth
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="9876543210"
              InputProps={{
                startAdornment: <InputAdornment position="start">+91</InputAdornment>,
              }}
            />

            <TextField
              label="પાસવર્ડ (Password)"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="1234"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setOpenModal(false)} color="inherit" sx={{ fontWeight: 700 }}>
            કેન્સલ
          </Button>
          <Button onClick={handleSaveUser} variant="contained" color="primary" sx={{ fontWeight: 800, borderRadius: 1.5 }}>
            સેવ કરો
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        title="એપ યુઝર ડિલીટ કરો"
        message="શું તમે ખરેખર આ એપ યુઝર ડિલીટ કરવા માગો છો?"
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </Box>
  );
};
