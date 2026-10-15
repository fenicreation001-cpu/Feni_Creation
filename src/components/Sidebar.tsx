import {
  Dashboard as DashboardIcon,
  ReceiptLong as ReceiptLongIcon,
  ShoppingBagOutlined as ShoppingBagOutlinedIcon,
  BadgeOutlined as BadgeOutlinedIcon,
  PeopleOutline as PeopleOutlineIcon,
  AccountBalanceWalletOutlined as AccountBalanceWalletOutlinedIcon,
  CalendarMonthOutlined as CalendarMonthOutlinedIcon,
  BarChartOutlined as BarChartOutlinedIcon,
  SettingsOutlined as SettingsOutlinedIcon,
  CodeOutlined as CodeOutlinedIcon,
  ExpandLess,
  ExpandMore,
  GroupOutlined as GroupOutlinedIcon,
  LogoutOutlined as LogoutOutlinedIcon,
} from '@mui/icons-material';
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Collapse,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material';















import { useThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  drawerWidth: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile, drawerWidth }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useThemeContext();
  const { logout } = useAuth();
  const { settings } = useCompany();

  const isAppManageActive = location.pathname === '/app-users' || location.pathname === '/api-docs';
  const [appManageOpen, setAppManageOpen] = useState<boolean>(isAppManageActive);

  useEffect(() => {
    if (isAppManageActive) {
      setAppManageOpen(true);
    }
  }, [location.pathname, isAppManageActive]);

  const navItems = [
    { text: 'Dashboard', guText: 'ડેશબોર્ડ', icon: <DashboardIcon sx={{ fontSize: 19 }} />, path: '/' },
    { text: 'Billing Management', guText: 'બિલિંગ મેનેજમેન્ટ', icon: <ReceiptLongIcon sx={{ fontSize: 19 }} />, path: '/billing' },
    { text: 'Material Purchase', guText: 'ખરીદી મેનેજમેન્ટ', icon: <ShoppingBagOutlinedIcon sx={{ fontSize: 19 }} />, path: '/purchases' },
    { text: 'Worker Salary', guText: 'કારીગર પગાર (ઉપાડ)', icon: <BadgeOutlinedIcon sx={{ fontSize: 19 }} />, path: '/workers' },
    { text: 'Party Management', guText: 'પાર્ટી મેનેજમેન્ટ', icon: <PeopleOutlineIcon sx={{ fontSize: 19 }} />, path: '/parties' },
    { text: 'Payment Management', guText: 'ચુકવણી મેનેજમેન્ટ', icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 19 }} />, path: '/payments' },
    { text: 'Month-Wise Report', guText: 'મહિનાવાર સમરી', icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 19 }} />, path: '/monthly-summary' },
    { text: 'Reports & Export', guText: 'રિપોર્ટ્સ અને એક્સપોર્ટ', icon: <BarChartOutlinedIcon sx={{ fontSize: 19 }} />, path: '/reports' },
  ];

  const appManageItems = [
    { text: 'App Users', guText: 'એપ યુઝર્સ', icon: <GroupOutlinedIcon sx={{ fontSize: 18 }} />, path: '/app-users' },
    { text: 'Android API Docs', guText: 'એપીઆઈ ડોક્સ', icon: <CodeOutlinedIcon sx={{ fontSize: 18 }} />, path: '/api-docs' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#0f172a',
        color: '#f8fafc',
        py: 2.5,
        px: 1.6,
        overflowY: 'auto',
      }}
    >
      {/* Top Logo / Brand (Matching User Screenshot) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, px: 1, mb: 3 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            bgcolor: '#1e293b',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 800,
            color: '#38bdf8',
            flexShrink: 0,
          }}
        >
          FC
        </Box>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.88rem',
              letterSpacing: '0.05em',
              color: '#ffffff',
              lineHeight: 1.15,
            }}
            noWrap
          >
            {settings.companyName || 'FENI CREATION'}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.72rem',
              color: '#94a3b8',
              letterSpacing: '0.02em',
            }}
            noWrap
          >
            {settings.tagline || (language === 'gu' ? 'એમ્બ્રોઇડરી ક્રિએશન' : 'Embroidery Creation')}
          </Typography>
        </Box>
      </Box>

      {/* Section Header: FINANCE & OPERATIONS */}
      <Typography
        sx={{
          fontSize: '0.675rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: '#64748b',
          textTransform: 'uppercase',
          px: 1.2,
          mb: 1,
        }}
      >
        {language === 'gu' ? 'નાણાંકીય અને સંચાલન' : 'FINANCE & OPERATIONS'}
      </Typography>

      {/* Primary Navigation List */}
      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={NavLink}
                to={item.path}
                onClick={isMobile ? onCloseMobile : undefined}
                sx={{
                  borderRadius: '10px',
                  py: 0.85,
                  px: 1.4,
                  bgcolor: isActive ? '#1d4ed8' : 'transparent',
                  border: isActive ? '1px solid #2563eb' : '1px solid transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  boxShadow: isActive ? '0 2px 8px rgba(29, 78, 216, 0.4)' : 'none',
                  '&:hover': {
                    bgcolor: isActive ? '#1e40af' : 'rgba(255, 255, 255, 0.06)',
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
                    color: isActive ? '#ffffff' : '#94a3b8',
                    minWidth: 32,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={language === 'gu' ? item.guText : item.text}
                  primaryTypographyProps={{
                    sx: {
                      fontSize: '0.83rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : '#94a3b8',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Bottom Settings & App Manage items */}
      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
        <ListItem disablePadding>
          <ListItemButton
            component={NavLink}
            to="/settings"
            onClick={isMobile ? onCloseMobile : undefined}
            sx={{
              borderRadius: '10px',
              py: 0.8,
              px: 1.4,
              bgcolor: location.pathname === '/settings' ? '#1d4ed8' : 'transparent',
              border: location.pathname === '/settings' ? '1px solid #2563eb' : '1px solid transparent',
              color: location.pathname === '/settings' ? '#ffffff' : '#94a3b8',
              boxShadow: location.pathname === '/settings' ? '0 2px 8px rgba(29, 78, 216, 0.4)' : 'none',
              '&:hover': {
                bgcolor: location.pathname === '/settings' ? '#1e40af' : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                '& .MuiListItemIcon-root': {
                  color: '#ffffff',
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === '/settings' ? '#ffffff' : '#94a3b8', minWidth: 32 }}>
              <SettingsOutlinedIcon sx={{ fontSize: 19 }} />
            </ListItemIcon>
            <ListItemText
              primary={language === 'gu' ? 'સેટિંગ્સ' : 'Settings'}
              primaryTypographyProps={{ sx: { fontSize: '0.83rem', fontWeight: location.pathname === '/settings' ? 700 : 500 } }}
            />
          </ListItemButton>
        </ListItem>

        {/* App Manage */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => setAppManageOpen(!appManageOpen)}
            sx={{
              borderRadius: '10px',
              py: 0.8,
              px: 1.4,
              bgcolor: isAppManageActive ? '#2563eb' : 'transparent',
              border: isAppManageActive ? '1px solid #3b82f6' : '1px solid transparent',
              color: isAppManageActive ? '#ffffff' : '#94a3b8',
              '&:hover': {
                bgcolor: isAppManageActive ? '#2563eb' : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                '& .MuiListItemIcon-root': {
                  color: '#ffffff',
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: isAppManageActive ? '#ffffff' : '#94a3b8', minWidth: 32 }}>
              <CodeOutlinedIcon sx={{ fontSize: 19 }} />
            </ListItemIcon>
            <ListItemText
              primary={language === 'gu' ? 'એપ મેનેજમેન્ટ' : 'App Manage'}
              primaryTypographyProps={{ sx: { fontSize: '0.83rem', fontWeight: isAppManageActive ? 700 : 500 } }}
            />
            {appManageOpen ? <ExpandLess sx={{ fontSize: 18, color: isAppManageActive ? '#ffffff' : '#94a3b8' }} /> : <ExpandMore sx={{ fontSize: 18, color: isAppManageActive ? '#ffffff' : '#94a3b8' }} />}
          </ListItemButton>
        </ListItem>

        <Collapse in={appManageOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 2, mt: 0.4 }}>
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
                      py: 0.65,
                      px: 1.2,
                      bgcolor: isSubActive ? '#1d4ed8' : 'transparent',
                      border: isSubActive ? '1px solid #2563eb' : '1px solid transparent',
                      color: isSubActive ? '#ffffff' : '#94a3b8',
                      boxShadow: isSubActive ? '0 2px 6px rgba(29, 78, 216, 0.35)' : 'none',
                      '&:hover': {
                        bgcolor: isSubActive ? '#1e40af' : 'rgba(255, 255, 255, 0.06)',
                        color: '#ffffff',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: isSubActive ? '#ffffff' : '#94a3b8', minWidth: 28 }}>
                      {subItem.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={language === 'gu' ? subItem.guText : subItem.text}
                      primaryTypographyProps={{ sx: { fontSize: '0.78rem', fontWeight: isSubActive ? 700 : 400 } }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Collapse>
      </List>

      {/* Bottom Profile Bar (Matching User Screenshot) */}
      <Box
        sx={{
          mt: 'auto',
          pt: 1.5,
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.78rem',
              flexShrink: 0,
            }}
          >
            FC
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#ffffff',
                lineHeight: 1.2,
              }}
              noWrap
            >
              Feni Admin
            </Typography>
            <Typography
              sx={{
                color: '#94a3b8',
                fontSize: '0.65rem',
                lineHeight: 1.2,
              }}
              noWrap
            >
              GSTIN: 24BAMPV2618G2Z1
            </Typography>
          </Box>
        </Box>
        <Tooltip title={language === 'gu' ? 'લૉગ આઉટ' : 'Logout'}>
          <IconButton onClick={handleLogout} size="small" sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
            <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: '1px solid #1e293b',
            bgcolor: '#0f172a',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: '1px solid #1e293b',
            bgcolor: '#0f172a',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
