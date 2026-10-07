import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BillingIcon from '@mui/icons-material/ReceiptLong';
import PurchaseIcon from '@mui/icons-material/ShoppingCart';
import WorkerIcon from '@mui/icons-material/Badge';
import PartyIcon from '@mui/icons-material/People';
import PaymentIcon from '@mui/icons-material/AccountBalanceWallet';
import ReportIcon from '@mui/icons-material/Assessment';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import SettingIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AppManageIcon from '@mui/icons-material/AdminPanelSettings';
import UsersIcon from '@mui/icons-material/Group';
import { useThemeContext } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import peacockBgImage from '../assets/images/peacock_textile_bg_1787302488685.jpg';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  drawerWidth: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile, drawerWidth }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const { language } = useThemeContext();
  const { settings } = useCompany();

  const isAppManageActive = location.pathname === '/app-users' || location.pathname === '/api-docs';
  const [appManageOpen, setAppManageOpen] = useState<boolean>(isAppManageActive);

  useEffect(() => {
    if (isAppManageActive) {
      setAppManageOpen(true);
    }
  }, [location.pathname, isAppManageActive]);

  const navItems = [
    { text: 'Dashboard', guText: 'ડેશબોર્ડ', icon: <DashboardIcon sx={{ fontSize: 20 }} />, path: '/' },
    { text: 'Billing Management', guText: 'બિલિંગ મેનેજમેન્ટ', icon: <BillingIcon sx={{ fontSize: 20 }} />, path: '/billing' },
    { text: 'Material Purchase', guText: 'ખરીદી મેનેજમેન્ટ', icon: <PurchaseIcon sx={{ fontSize: 20 }} />, path: '/purchases' },
    { text: 'Worker Salary', guText: 'કારીગર પગાર (ઉપાડ)', icon: <WorkerIcon sx={{ fontSize: 20 }} />, path: '/workers' },
    { text: 'Party Management', guText: 'પાર્ટી મેનેજમેન્ટ', icon: <PartyIcon sx={{ fontSize: 20 }} />, path: '/parties' },
    { text: 'Payment Management', guText: 'ચુકવણી મેનેજમેન્ટ', icon: <PaymentIcon sx={{ fontSize: 20 }} />, path: '/payments' },
    { text: 'Month-Wise Report', guText: 'મહિનાવાર સમરી રિપોર્ટ', icon: <CalendarIcon sx={{ fontSize: 20 }} />, path: '/monthly-summary' },
    { text: 'Reports & Export', guText: 'રિપોર્ટ્સ અને એક્સપોર્ટ', icon: <ReportIcon sx={{ fontSize: 20 }} />, path: '/reports' },
    { text: 'Settings', guText: 'સેટિંગ્સ', icon: <SettingIcon sx={{ fontSize: 20 }} />, path: '/settings' },
  ];

  const appManageItems = [
    { text: 'App Users', guText: 'એપ યુઝર્સ (મોબાઇલ)', icon: <UsersIcon sx={{ fontSize: 19 }} />, path: '/app-users' },
    { text: 'Android API Docs', guText: 'એન્ડ્રોઇડ એપીઆઈ ડોક્સ', icon: <CodeIcon sx={{ fontSize: 19 }} />, path: '/api-docs' },
  ];

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#0e1726',
        color: '#f8fafc',
        py: 2.2,
        px: 1.5,
      }}
    >
      {/* Brand Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, mb: 2.5 }}>
        <Box
          component="img"
          src={settings.logoUrl || peacockBgImage}
          alt="Logo"
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            objectFit: 'cover',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            bgcolor: '#ffffff',
          }}
        />
        <Box sx={{ overflow: 'hidden' }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#ffffff',
              letterSpacing: '0.04em',
              fontSize: '0.88rem',
            }}
            noWrap
          >
            {settings.companyName || 'FENI CREATION'}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#94a3b8',
              fontSize: '0.72rem',
              fontWeight: 400,
              display: 'block',
            }}
            noWrap
          >
            {settings.tagline || (language === 'gu' ? 'એમ્બ્રોઇડરી ક્રિએશન' : 'Embroidery Creation')}
          </Typography>
        </Box>
      </Box>

      {/* Navigation List */}
      <List disablePadding sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={NavLink}
                to={item.path}
                onClick={isMobile ? onCloseMobile : undefined}
                sx={{
                  borderRadius: '8px',
                  py: 0.85,
                  px: 1.5,
                  mx: 0.5,
                  bgcolor: isActive ? 'rgba(99, 102, 241, 0.22)' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  '&:hover': {
                    bgcolor: isActive ? 'rgba(99, 102, 241, 0.28)' : 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    '& .MuiListItemIcon-root': {
                      color: '#ffffff',
                    },
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? '#818cf8' : '#94a3b8',
                    minWidth: 34,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={language === 'gu' ? item.guText : item.text}
                  primaryTypographyProps={{
                    sx: {
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 600 : 500,
                      fontFamily: '"Plus Jakarta Sans", "Noto Sans Gujarati", sans-serif',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}

        {/* App Manage Expandable Menu */}
        <ListItem disablePadding sx={{ mt: 0.5 }}>
          <ListItemButton
            onClick={() => setAppManageOpen(!appManageOpen)}
            sx={{
              borderRadius: '8px',
              py: 0.85,
              px: 1.5,
              mx: 0.5,
              bgcolor: isAppManageActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: isAppManageActive ? '#818cf8' : '#94a3b8',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                '& .MuiListItemIcon-root': {
                  color: '#ffffff',
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: isAppManageActive ? '#818cf8' : '#94a3b8', minWidth: 34 }}>
              <AppManageIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary={language === 'gu' ? 'એપ મેનેજ' : 'App Manage'}
              primaryTypographyProps={{
                sx: {
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  fontFamily: '"Plus Jakarta Sans", "Noto Sans Gujarati", sans-serif',
                },
              }}
            />
            {appManageOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
          </ListItemButton>
        </ListItem>

        <Collapse in={appManageOpen} timeout="auto" unmountOnExit>
          <List disablePadding sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
            {appManageItems.map((subItem) => {
              const isSubActive = location.pathname === subItem.path;
              return (
                <ListItem key={subItem.path} disablePadding>
                  <ListItemButton
                    component={NavLink}
                    to={subItem.path}
                    onClick={isMobile ? onCloseMobile : undefined}
                    sx={{
                      borderRadius: '8px',
                      py: 0.7,
                      px: 1.5,
                      mx: 0.5,
                      bgcolor: isSubActive ? 'rgba(99, 102, 241, 0.22)' : 'transparent',
                      color: isSubActive ? '#ffffff' : '#94a3b8',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isSubActive ? '#818cf8' : '#94a3b8',
                        minWidth: 30,
                      }}
                    >
                      {subItem.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={language === 'gu' ? subItem.guText : subItem.text}
                      primaryTypographyProps={{
                        sx: {
                          fontSize: '0.8rem',
                          fontWeight: isSubActive ? 600 : 500,
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Collapse>
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', my: 1.5 }} />

      {/* Footer / User Profile Badge */}
      <Box
        sx={{
          p: 1.2,
          bgcolor: '#141f36',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          mx: 0.5,
        }}
      >
        <Box
          component="img"
          src={settings.logoUrl || peacockBgImage}
          alt="Admin"
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        />
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff', fontSize: '0.8rem', lineHeight: 1.2 }} noWrap>
            Feni Admin
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block', letterSpacing: '0.02em' }} noWrap>
            GSTIN: {settings.gstin || '24BAMPV2618G2ZI'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, bgcolor: '#0e1726', borderRight: '1px solid rgba(255, 255, 255, 0.05)' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, bgcolor: '#0e1726', borderRight: '1px solid rgba(255, 255, 255, 0.05)' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
