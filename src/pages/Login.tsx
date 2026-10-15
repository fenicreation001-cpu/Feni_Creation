import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined as LockOutlinedIcon,
  MailOutline as MailOutlineIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Translate as TranslateIcon,
  ArrowForward as ArrowForwardIcon,
  VerifiedUserOutlined as VerifiedUserOutlinedIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import peacockBgImage from '../assets/images/peacock_textile_bg_1787302488685.jpg';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { mode, toggleTheme, language, toggleLanguage } = useThemeContext();
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
        width: '100vw',
        display: 'flex',
        bgcolor: mode === 'dark' ? '#090d16' : '#ffffff',
        p: { xs: 2, md: 3 },
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* LEFT EDITORIAL HERO CARD (Matching Image 1) */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flex: '1 1 50%',
          maxWidth: '50%',
          borderRadius: '28px',
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 5, xl: 6 },
          color: '#ffffff',
          backgroundImage: `linear-gradient(160deg, rgba(7, 19, 44, 0.88) 0%, rgba(15, 32, 67, 0.75) 45%, rgba(5, 13, 31, 0.92) 100%), url(${peacockBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 20px 40px -15px rgba(5, 13, 31, 0.5)',
        }}
      >
        {/* Top Branding */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              border: '1px solid rgba(147, 197, 253, 0.35)',
              bgcolor: 'rgba(15, 32, 67, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 400,
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              color: '#93c5fd',
            }}
          >
            f
          </Box>
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '0.92rem',
                letterSpacing: '0.06em',
                color: '#ffffff',
                lineHeight: 1.2,
              }}
            >
              FENI CREATION
            </Typography>
            <Typography
              sx={{
                fontSize: '0.74rem',
                color: '#93c5fd',
                letterSpacing: '0.02em',
              }}
            >
              Embroidery Creation
            </Typography>
          </Box>
        </Box>

        {/* Center Editorial Headline */}
        <Box sx={{ my: 'auto', py: 4, maxWidth: 560 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: '#93c5fd',
              textTransform: 'uppercase',
              mb: 2,
            }}
          >
            Crafted with care. Managed with clarity.
          </Typography>

          <Typography
            className="font-serif-hero"
            sx={{
              fontSize: { lg: '3.2rem', xl: '3.8rem' },
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              mb: 2.5,
              fontFamily: '"Playfair Display", Georgia, serif',
            }}
          >
            Beautiful craft.
            <br />
            Better business.
          </Typography>

          <Typography
            sx={{
              fontSize: '1.05rem',
              lineHeight: 1.6,
              color: '#cbd5e1',
              fontWeight: 400,
              maxWidth: 480,
            }}
          >
            {language === 'gu'
              ? 'તમારા એમ્બ્રોઇડરી વ્યવસાયના દરેક બિલ, દરેક પાર્ટી અને તમામ વિગતો માટેનું એક સુરક્ષિત વર્કસ્પેસ.'
              : 'A focused workspace for every bill, every party and every detail of your embroidery business.'}
          </Typography>
        </Box>

        {/* Bottom 3 Feature Pillars */}
        <Box
          sx={{
            pt: 3,
            borderTop: '1px solid rgba(147, 197, 253, 0.25)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff', mb: 0.3 }}>
              {language === 'gu' ? 'બિલિંગ અને ઉઘરાણી' : 'Billing & collections'}
            </Typography>
            <Typography sx={{ fontSize: '0.74rem', color: '#93c5fd' }}>
              One connected workspace
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff', mb: 0.3 }}>
              {language === 'gu' ? 'મટીરીયલ ખરીદી ટ્રેકિંગ' : 'Purchase tracking'}
            </Typography>
            <Typography sx={{ fontSize: '0.74rem', color: '#93c5fd' }}>
              One connected workspace
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff', mb: 0.3 }}>
              {language === 'gu' ? 'કારીગર પગાર હિસાબ' : 'Worker salaries'}
            </Typography>
            <Typography sx={{ fontSize: '0.74rem', color: '#93c5fd' }}>
              One connected workspace
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* RIGHT LOGIN FORM (Matching Image 1) */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { xs: 2, sm: 4, md: 6 },
          position: 'relative',
        }}
      >
        {/* Top Right Quick Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={language === 'gu' ? 'સુરક્ષિત એડમિન એક્સેસ' : 'Secure admin access'}
            size="small"
            sx={{
              bgcolor: mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#e6f4ea',
              color: mode === 'dark' ? '#34d399' : '#0f766e',
              fontWeight: 600,
              fontSize: '0.74rem',
              borderRadius: '20px',
              border: `1px solid ${mode === 'dark' ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0'}`,
              height: 26,
            }}
          />
          <Button
            size="small"
            onClick={toggleLanguage}
            startIcon={<TranslateIcon sx={{ fontSize: 15 }} />}
            sx={{
              color: mode === 'dark' ? '#cbd5e1' : '#475569',
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'none',
              px: 1,
              borderRadius: '16px',
            }}
          >
            {language === 'en' ? 'ગુજરાતી' : 'English'}
          </Button>
          <Tooltip title={mode === 'light' ? 'Dark Mode' : 'Light Mode'}>
            <IconButton onClick={toggleTheme} size="small" sx={{ color: mode === 'dark' ? '#ecc94b' : '#64748b' }}>
              {mode === 'light' ? <DarkModeIcon sx={{ fontSize: 18 }} /> : <LightModeIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Center Login Box */}
        <Box sx={{ width: '100%', maxWidth: 420, mx: 'auto', my: 'auto', py: 4 }}>
          <Typography
            sx={{
              color: '#2563eb',
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            FENI CREATION
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.9rem', sm: '2.25rem' },
              mb: 0.8,
            }}
          >
            {language === 'gu' ? 'સ્વાગત છે.' : 'Welcome back.'}
          </Typography>

          <Typography
            sx={{
              color: mode === 'dark' ? '#94a3b8' : '#64748b',
              fontSize: '0.92rem',
              mb: 2,
            }}
          >
            {language === 'gu'
              ? 'તમારા એમ્બ્રોઇડરી વ્યવસાયના સંચાલન માટે લૉગ ઇન કરો.'
              : 'Log in to manage your embroidery business.'}
          </Typography>

          <Chip
            label={language === 'gu' ? 'એડમિન લૉગિન' : 'Admin Login'}
            size="small"
            sx={{
              bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.08)',
              color: mode === 'dark' ? '#60a5fa' : '#1d4ed8',
              fontWeight: 600,
              fontSize: '0.74rem',
              borderRadius: '6px',
              border: `1px solid ${mode === 'dark' ? 'rgba(37, 99, 235, 0.35)' : '#cbd5e1'}`,
              height: 24,
              mb: 3,
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2.5 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  color: mode === 'dark' ? '#cbd5e1' : '#334155',
                  mb: 0.8,
                }}
              >
                {language === 'gu' ? 'એડમિન ઇમેઇલ *' : 'Admin Email *'}
              </Typography>
              <TextField
                fullWidth
                size="medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fenicreation001@gmail.com"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: '10px',
                    bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
                    fontSize: '0.9rem',
                    '& fieldset': {
                      borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#2563eb',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2563eb',
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  color: mode === 'dark' ? '#cbd5e1' : '#334155',
                  mb: 0.8,
                }}
              >
                {language === 'gu' ? 'પાસવર્ડ *' : 'Password *'}
              </Typography>
              <TextField
                fullWidth
                size="medium"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#94a3b8' }}
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 19 }} /> : <Visibility sx={{ fontSize: 19 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: '10px',
                    bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
                    fontSize: '0.9rem',
                    '& fieldset': {
                      borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#2563eb',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#2563eb',
                    },
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
              sx={{
                bgcolor: '#2563eb',
                color: '#ffffff',
                py: 1.4,
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.95rem',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                '&:hover': {
                  bgcolor: '#1d4ed8',
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
                },
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (language === 'gu' ? 'લૉગિન થઈ રહ્યું છે...' : 'Logging in...') : (language === 'gu' ? 'લૉગિન' : 'Login')}
            </Button>
          </form>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mt: 3 }}>
            <VerifiedUserOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
            <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>
              {language === 'gu'
                ? 'અધિકૃત સંચાલકો માટે સુરક્ષિત એક્સેસ.'
                : 'Protected access for authorized administrators.'}
            </Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', pt: 2 }}>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            FENI CREATION · Embroidery Creation
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
