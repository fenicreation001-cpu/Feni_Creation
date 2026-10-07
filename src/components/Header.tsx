import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  InputBase,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Badge,
  Button,
  Chip,
  Select,
  FormControl,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TranslateIcon from '@mui/icons-material/Translate';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import StorageIcon from '@mui/icons-material/Storage';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import { useThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useMonthFilter } from '../context/MonthFilterContext';
import { MonthYearPickerPopover } from './MonthYearPickerPopover';
import { DbStatusDialog } from './DbStatusDialog';
import { apiClient, isStaticHostMode } from '../utils/api';
import peacockBgImage from '../assets/images/peacock_textile_bg_1787302488685.jpg';

interface HeaderProps {
  onToggleMobileDrawer: () => void;
  drawerWidth: number;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileDrawer, drawerWidth }) => {
  const { mode, toggleTheme, language, toggleLanguage } = useThemeContext();
  const { user, logout } = useAuth();
  const { settings } = useCompany();
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonthFilter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dbOpen, setDbOpen] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDb = async () => {
      if (isStaticHostMode()) {
        setDbConnected(false);
        return;
      }
      try {
        const status = await apiClient.checkDbStatus();
        setDbConnected(typeof status === 'boolean' ? status : Boolean((status as any)?.connected));
      } catch {
        setDbConnected(false);
      }
    };
    checkDb();
    const timer = setInterval(() => {
      if (!isStaticHostMode()) {
        checkDb();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64, px: { xs: 1.5, sm: 3 } }}>
          {/* Left Side: Mobile Hamburger & Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={onToggleMobileDrawer}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="subtitle1"
              sx={{
                display: { xs: 'block', sm: 'none' },
                fontWeight: 800,
                color: 'primary.main',
                letterSpacing: '-0.02em',
                fontSize: '0.95rem',
              }}
            >
              {settings.companyName || 'FENI CREATION'}
            </Typography>

            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                bgcolor: mode === 'light' ? '#f1f5f9' : '#0f172a',
                px: 2,
                py: 0.6,
                borderRadius: '20px',
                width: { sm: 200, md: 280 },
              }}
            >
              <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
              <InputBase
                placeholder={language === 'gu' ? 'શોધો (બિલ, પાર્ટી...)' : 'Search Bill, Party...'}
                sx={{ fontSize: '0.88rem', width: '100%' }}
              />
            </Box>
          </Box>

          {/* Right Side Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.5 } }}>
            {/* Month-Wise Filter Popover Box */}
            <MonthYearPickerPopover />

            {/* Gujarati / English Toggle Button */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<TranslateIcon sx={{ fontSize: 17, color: '#4338ca' }} />}
              onClick={toggleLanguage}
              sx={{
                borderRadius: '20px',
                fontWeight: 600,
                px: { xs: 1.2, sm: 1.8 },
                py: 0.4,
                fontSize: { xs: '0.75rem', sm: '0.82rem' },
                borderColor: '#cbd5e1',
                color: '#1e293b',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#94a3b8',
                  bgcolor: 'rgba(0,0,0,0.02)',
                },
              }}
            >
              {language === 'en' ? 'ગુજરાતી' : 'English'}
            </Button>

            {/* Light / Dark Mode Toggle */}
            <Tooltip title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
              <IconButton onClick={toggleTheme} sx={{ color: '#1e293b' }}>
                {mode === 'light' ? <DarkModeIcon sx={{ fontSize: 20 }} /> : <LightModeIcon sx={{ color: '#ecc94b', fontSize: 20 }} />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton sx={{ color: '#475569' }}>
                <Badge
                  badgeContent={2}
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      height: 16,
                      minWidth: 16,
                      fontWeight: 700,
                    },
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Profile Avatar */}
            <Box sx={{ ml: 0.5 }}>
              <Tooltip title="Account Settings">
                <IconButton onClick={handleMenuOpen} size="small" sx={{ p: 0 }}>
                  <Avatar
                    src={settings.logoUrl || peacockBgImage}
                    sx={{
                      width: 34,
                      height: 34,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  />
                </IconButton>
              </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  elevation: 3,
                  sx: { mt: 1, borderRadius: 2, minWidth: 200 },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {user?.name || 'Admin'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {user?.email || 'fenicreation001@gmail.com'}
                </Typography>
              </Box>
              <MenuItem onClick={handleMenuClose}>
                <PersonIcon fontSize="small" sx={{ mr: 1.5 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); logout(); }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} />
                <Typography color="error.main">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
    <DbStatusDialog open={dbOpen} onClose={() => setDbOpen(false)} />
  </>
  );
};
