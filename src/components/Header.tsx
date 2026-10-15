import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Translate as TranslateIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
  LightModeOutlined as LightModeOutlinedIcon,
  NotificationsNoneOutlined as NotificationsNoneOutlinedIcon,
  LogoutOutlined as LogoutOutlinedIcon,
} from '@mui/icons-material';
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  InputBase,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Button,
} from '@mui/material';
import { useThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { MonthYearPickerPopover } from './MonthYearPickerPopover';








interface HeaderProps {
  onToggleMobileDrawer: () => void;
  drawerWidth: number;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileDrawer, drawerWidth }) => {
  const { mode, toggleTheme, language, toggleLanguage } = useThemeContext();
  const { user, logout } = useAuth();
  const { settings } = useCompany();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 62, px: { xs: 1.5, sm: 3 } }}>
        {/* Left Side: Mobile Hamburger & Search Input */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onToggleMobileDrawer}
            sx={{ display: { md: 'none' }, color: 'text.secondary' }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc',
              border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
              px: 1.6,
              py: 0.5,
              borderRadius: '10px',
              width: { sm: 240, md: 290 },
            }}
          >
            <SearchIcon sx={{ color: '#64748b', mr: 1, fontSize: 18 }} />
            <InputBase
              placeholder={language === 'gu' ? 'શોધો (બિલ, પાર્ટી...)' : 'Search Bill, Party...'}
              sx={{ fontSize: '0.84rem', width: '100%', color: mode === 'dark' ? '#f8fafc' : '#0f172a' }}
            />
            <Box
              component="span"
              sx={{
                fontSize: '0.7rem',
                color: '#64748b',
                bgcolor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
                px: 0.6,
                py: 0.2,
                borderRadius: '4px',
                fontWeight: 600,
                ml: 0.5,
              }}
            >
              ⌘ K
            </Box>
          </Box>
        </Box>

        {/* Right Side Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.2 } }}>
          {/* Month Filter Dropdown */}
          <MonthYearPickerPopover />

          {/* Gujarati / English Switcher - Focus Gujarati then English */}
          <Tooltip title={language === 'gu' ? 'અંગ્રેજી ભાષા કરો (Switch to English)' : 'ગુજરાતી ભાષા કરો (Switch to Gujarati)'}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<TranslateIcon sx={{ fontSize: 16, color: '#2563eb' }} />}
              onClick={toggleLanguage}
              sx={{
                borderRadius: '20px',
                fontWeight: 700,
                px: { xs: 1.2, sm: 1.6 },
                py: 0.45,
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                borderColor: mode === 'dark' ? '#334155' : '#cbd5e1',
                color: mode === 'dark' ? '#f1f5f9' : '#0f172a',
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#2563eb',
                  bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)',
                },
              }}
            >
              {language === 'gu' ? 'English' : 'ગુજરાતી (મુખ્ય)'}
            </Button>
          </Tooltip>

          {/* Light / Dark Mode Toggle */}
          <Tooltip title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
            <IconButton onClick={toggleTheme} size="small" sx={{ color: mode === 'dark' ? '#ecc94b' : '#64748b' }}>
              {mode === 'light' ? (
                <DarkModeOutlinedIcon sx={{ fontSize: 19 }} />
              ) : (
                <LightModeOutlinedIcon sx={{ fontSize: 19 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Notifications Icon with Blue Badge */}
          <Tooltip title="Notifications">
            <IconButton size="small" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
              <Badge
                badgeContent={2}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.625rem',
                    height: 16,
                    minWidth: 16,
                    fontWeight: 700,
                  },
                }}
              >
                <NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Profile */}
          <Box
            onClick={handleMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              px: 1,
              py: 0.5,
              borderRadius: '20px',
              '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' },
            }}
          >
            <Typography
              sx={{
                display: { xs: 'none', sm: 'block' },
                fontSize: '0.82rem',
                fontWeight: 600,
                color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              }}
            >
              Feni Admin
            </Typography>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              FC
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                borderRadius: '12px',
                mt: 1,
                minWidth: 180,
                bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
                border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              },
            }}
          >
            <MenuItem onClick={logout} sx={{ gap: 1, color: '#ef4444', fontSize: '0.84rem' }}>
              <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
              {language === 'gu' ? 'લૉગ આઉટ' : 'Sign Out'}
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
