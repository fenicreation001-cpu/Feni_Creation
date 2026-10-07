import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material';
import LogoIcon from '@mui/icons-material/Storefront';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TranslateIcon from '@mui/icons-material/Translate';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import { useNavigate } from 'react-router-dom';
import peacockBgImage from '../assets/images/peacock_textile_bg_1787302488685.jpg';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { mode, toggleTheme, language, toggleLanguage } = useThemeContext();
  const { settings } = useCompany();
  const navigate = useNavigate();
  const [email, setEmail] = useState('fenicreation001@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigate('/');
    } else {
      setError(language === 'gu' ? 'અમાન્ય ઇમેઇલ અથવા પાસવર્ડ.' : 'Invalid email or password.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
        backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 27, 75, 0.78) 50%, rgba(15, 23, 42, 0.9) 100%), url(${peacockBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Decorative Golden Zari & Embroidery Pattern Overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: mode === 'dark' ? 0.12 : 0.18,
          backgroundImage: `radial-gradient(rgba(251, 191, 36, 0.6) 1px, transparent 1px), radial-gradient(rgba(99, 102, 241, 0.6) 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0, 18px 18px',
          pointerEvents: 'none',
        }}
      />

      {/* Soft Ambient Peacock Blue Glows */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          left: '10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, rgba(6, 182, 212, 0) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-10%',
          right: '10%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(139, 92, 246, 0) 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      {/* Top right language & theme quick actions */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TranslateIcon fontSize="small" />}
          onClick={toggleLanguage}
          sx={{
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.4)',
            borderRadius: '20px',
            fontWeight: 700,
            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          {language === 'en' ? 'ગુજરાતી' : 'English'}
        </Button>
        <Tooltip title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
          <IconButton onClick={toggleTheme} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon sx={{ color: '#ecc94b' }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Card 
        sx={{ 
          maxWidth: 450, 
          width: '100%', 
          borderRadius: 4, 
          boxShadow: mode === 'dark' 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.15)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 30px rgba(99, 102, 241, 0.2)',
          bgcolor: mode === 'dark' ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)'}`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Brand Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {settings.logoUrl ? (
              <Box
                component="img"
                src={settings.logoUrl}
                alt="Logo"
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '18px',
                  objectFit: 'contain',
                  bgcolor: '#ffffff',
                  p: 1,
                  mb: 1.5,
                  boxShadow: '0 10px 20px rgba(79, 70, 229, 0.35)',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '18px',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.5,
                  boxShadow: '0 10px 20px rgba(79, 70, 229, 0.35)',
                }}
              >
                <LogoIcon sx={{ fontSize: 36 }} />
              </Box>
            )}
            <Typography variant="h5" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#1e1b4b', letterSpacing: '0.5px' }}>
              {settings.companyName || 'FENI CREATION'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
              {settings.tagline || (language === 'gu' ? 'ટેક્સટાઇલ બિલિંગ અને ઇઆરપી સિસ્ટમ' : 'Textile Billing & ERP Management System')}
            </Typography>
            <Chip
              label={language === 'gu' ? 'એડમિન લૉગિન' : 'Admin Login'}
              size="small"
              color="primary"
              sx={{ mt: 1.5, fontWeight: 700 }}
            />
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={language === 'gu' ? 'એડમિન ઇમેઇલ' : 'Admin Email'}
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label={language === 'gu' ? 'પાસવર્ડ' : 'Password'}
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 1, py: 1.4, fontSize: '1rem', fontWeight: 700, borderRadius: 2 }}
            >
              {loading 
                ? (language === 'gu' ? 'લૉગિન થઈ રહ્યું છે...' : 'Signing in...') 
                : (language === 'gu' ? 'લૉગિન' : 'Login')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
