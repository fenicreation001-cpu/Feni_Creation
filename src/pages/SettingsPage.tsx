import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import UploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { CompanySettings } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';

export const SettingsPage: React.FC = () => {
  const { mode, toggleTheme, language, toggleLanguage } = useThemeContext();
  const { showNotification } = useNotification();
  const { settings: globalSettings, updateSettings } = useCompany();

  const [settings, setSettings] = useState<CompanySettings>(globalSettings);
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (globalSettings) {
      setSettings(globalSettings);
    }
  }, [globalSettings]);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification(
        language === 'gu' ? 'કૃપા કરીને માન્ય છબી ફાઇલ પ પસંદ કરો' : 'Please select a valid image file (PNG, JPG, SVG, WebP)',
        'error'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification(
        language === 'gu' ? 'લોગો ફાઇલ 5MB થી નાની હોવી જોઇએ' : 'Logo file size should be less than 5MB',
        'error'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSettings((prev) => ({ ...prev, logoUrl: dataUrl }));
        showNotification(
          language === 'gu' ? 'લોગો અપલોડ થયો! ફેરફારો સાચવવા માટે "સેટિંગ્સ સેવ કરો" પર ક્લિક કરો.' : 'Logo selected! Click "Save Settings Changes" to apply.',
          'info'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSettings((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    showNotification(
      language === 'gu' ? 'લોગો દૂર કર્યો' : 'Logo removed',
      'info'
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSettings(settings);
      showNotification(
        language === 'gu' ? 'કંપની સેટિંગ્સ અને લોગો સફળતાપૂર્વક અપડેટ થયા!' : 'Company Settings and Logo updated successfully!',
        'success'
      );
    } catch {
      showNotification(
        language === 'gu' ? 'સેટિંગ્સ સેવ થયા' : 'Settings saved',
        'success'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPassword = localStorage.getItem('feni_admin_password') || 'admin123';
    if (currentPassword !== storedPassword) {
      showNotification(
        language === 'gu' ? 'હાલનો પાસવર્ડ ખોટો છે!' : 'Current password is incorrect!',
        'error'
      );
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      showNotification(
        language === 'gu' ? 'નવો પાસવર્ડ ઓછામાં ઓછો 4 અક્ષરનો હોવો જોઈએ!' : 'New password must be at least 4 characters long!',
        'error'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification(
        language === 'gu' ? 'નવો પાસવર્ડ અને કન્ફર્મ પાસવર્ડ મેચ થતા નથી!' : 'New password and confirm password do not match!',
        'error'
      );
      return;
    }

    localStorage.setItem('feni_admin_password', newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showNotification(
      language === 'gu' ? 'પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે!' : 'Password changed successfully!',
      'success'
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
          {language === 'gu' ? 'સેટિંગ્સ (System Settings)' : 'Company & System Settings'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {language === 'gu' ? 'ફેની ક્રિએશન કંપની વિગતો, જીએસટી નંબર, બેંક ખાતું અને થીમ સેટિંગ્સ' : 'Manage company details, GSTIN, Bank info for invoice printing & system theme'}
        </Typography>
      </Box>

      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 3 }}>
          {/* Company Profile */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Company Logo Upload Section */}
            <Card sx={{ border: '2px dashed', borderColor: 'primary.light', bgcolor: mode === 'dark' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImageIcon color="primary" /> {language === 'gu' ? 'કંપની લોગો અપલોડ (Upload Company Logo)' : 'Upload Company Logo'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  {language === 'gu'
                    ? 'આ લોગો નેવિગેશન બાર, લૉગિન પેજ અને પ્રિન્ટેડ ટેક્સ ઇનવોઇસ પર દેખાશે.'
                    : 'This logo will appear on the sidebar navigation, top header, login page, and printed Tax Invoices.'}
                </Typography>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleLogoFileUpload}
                  style={{ display: 'none' }}
                />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
                  {/* Current Logo Preview */}
                  <Box
                    sx={{
                      width: 90,
                      height: 90,
                      borderRadius: '16px',
                      border: '2px solid',
                      borderColor: 'divider',
                      bgcolor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      p: 1,
                    }}
                  >
                    {settings.logoUrl ? (
                      <Box
                        component="img"
                        src={settings.logoUrl}
                        alt="Company Logo Preview"
                        sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                        <ImageIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', fontWeight: 600 }}>
                          No Logo
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Upload Actions & Controls */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, minWidth: 220 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                      >
                        {language === 'gu' ? 'લોગો પસંદ કરો (Upload Image)' : 'Upload Logo Image'}
                      </Button>

                      {settings.logoUrl && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={handleRemoveLogo}
                          sx={{ fontWeight: 700, borderRadius: 2 }}
                        >
                          {language === 'gu' ? 'દૂર કરો' : 'Remove Logo'}
                        </Button>
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      {language === 'gu'
                        ? 'સપોર્ટેડ ફોર્મેટ: PNG, JPG, WebP, SVG (મહત્તમ 5MB)'
                        : 'Supported formats: PNG, JPG, WebP, SVG (Recommended square or high-res, max 5MB)'}
                    </Typography>

                    {/* Quick Preset Sample Logos */}
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                        {language === 'gu' ? 'અથવા સેમ્પલ ટેક્સટાઇલ લોગો પસંદ કરો:' : 'Or choose a sample textile company logo:'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        {[
                          {
                            name: 'Gold Zari Loom',
                            url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%234f46e5"/><path d="M50 15 L80 35 L80 75 L50 95 L20 75 L20 35 Z" stroke="%23fbbf24" stroke-width="5" fill="none"/><circle cx="50" cy="55" r="14" fill="%23fbbf24"/><text x="50" y="60" font-size="16" font-weight="bold" text-anchor="middle" fill="%231e1b4b">FC</text></svg>',
                          },
                          {
                            name: 'Royal Diamond Silk',
                            url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%230f172a"/><path d="M50 20 L80 50 L50 80 L20 50 Z" fill="%230284c7" stroke="%2338bdf8" stroke-width="4"/><circle cx="50" cy="50" r="10" fill="%23ffffff"/><text x="50" y="55" font-size="12" font-weight="bold" text-anchor="middle" fill="%230f172a">FENI</text></svg>',
                          },
                          {
                            name: 'Crimson Thread Wheel',
                            url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23991b1b"/><circle cx="50" cy="50" r="30" stroke="%23fef08a" stroke-width="6" fill="none"/><path d="M50 20 L50 80 M20 50 L80 50" stroke="%23fef08a" stroke-width="4"/><circle cx="50" cy="50" r="12" fill="%23ffffff"/></svg>',
                          },
                        ].map((preset, idx) => (
                          <Box
                            key={idx}
                            onClick={() => {
                              setSettings((prev) => ({ ...prev, logoUrl: preset.url }));
                              showNotification(`Selected ${preset.name} logo!`, 'info');
                            }}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: '10px',
                              cursor: 'pointer',
                              border: settings.logoUrl === preset.url ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                              overflow: 'hidden',
                              transition: 'all 0.2s ease',
                              boxShadow: settings.logoUrl === preset.url ? '0 0 0 3px rgba(79, 70, 229, 0.3)' : 'none',
                              '&:hover': { transform: 'scale(1.08)' },
                            }}
                          >
                            <Box component="img" src={preset.url} alt={preset.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>
                  🏢 Company Profile Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField fullWidth label="Company Name" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} required />
                  <TextField fullWidth label="Business Tagline" value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} />
                  <TextField fullWidth label="GSTIN Number" value={settings.gstin} onChange={(e) => setSettings({ ...settings, gstin: e.target.value })} required />
                  <TextField fullWidth label="Phone / Mobile" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} required />
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                    <TextField fullWidth label="Email Address" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} required />
                  </Box>
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                    <TextField fullWidth multiline rows={2} label="Company Address" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} required />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>
                  🏦 Bank Account Info (For Invoice Printing)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <TextField fullWidth label="Bank Name" value={settings.bankName} onChange={(e) => setSettings({ ...settings, bankName: e.target.value })} />
                  <TextField fullWidth label="Account Number" value={settings.accountNo} onChange={(e) => setSettings({ ...settings, accountNo: e.target.value })} />
                  <TextField fullWidth label="IFSC Code" value={settings.ifscCode} onChange={(e) => setSettings({ ...settings, ifscCode: e.target.value })} />
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>
                  📄 Tax Invoice Details (HSN Code & Terms)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Default HSN Code"
                    value={settings.hsnCode || ''}
                    onChange={(e) => setSettings({ ...settings, hsnCode: e.target.value })}
                    placeholder="9988"
                    helperText="Used as default HSN Code on invoice items if not explicitly specified"
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Terms and Conditions (For Invoice Print)"
                    value={settings.termsAndConditions || ''}
                    onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                    placeholder={"1. Any complaint regarding and should brought to our notice in written within 2 days.\n2. We are not responsible for Payment to unauthorized."}
                    helperText="Enter each term on a new line. These appear at the bottom left of printed Tax Invoices."
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Preferences */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockResetIcon color="primary" /> {language === 'gu' ? 'પાસવર્ડ બદલો (Change Password)' : 'Change Admin Password'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {language === 'gu' 
                    ? 'તમારો એડમિન લૉગિન પાસવર્ડ બદલો. નવો પાસવર્ડ સુરક્ષિત રાખો.' 
                    : 'Update your admin login password securely.'}
                </Typography>

                <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={language === 'gu' ? 'હાલનો પાસવર્ડ (Current Password)' : 'Current Password'}
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowCurrentPw(!showCurrentPw)} edge="end" size="small">
                            {showCurrentPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label={language === 'gu' ? 'નવો પાસવર્ડ (New Password)' : 'New Password'}
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowNewPw(!showNewPw)} edge="end" size="small">
                            {showNewPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label={language === 'gu' ? 'નવો પાસવર્ડ ફરીથી લખો (Confirm New Password)' : 'Confirm New Password'}
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirmPw(!showConfirmPw)} edge="end" size="small">
                            {showConfirmPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="outlined"
                    color="primary"
                    startIcon={<LockResetIcon />}
                    sx={{ alignSelf: 'flex-start', mt: 0.5, fontWeight: 700 }}
                  >
                    {language === 'gu' ? 'પાસવર્ડ અપડેટ કરો' : 'Update Password'}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>
                  🎨 Application Preferences
                </Typography>

                <FormControlLabel
                  control={<Switch checked={mode === 'dark'} onChange={toggleTheme} />}
                  label="Dark Theme Mode"
                  sx={{ display: 'block', mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={<Switch checked={language === 'gu'} onChange={toggleLanguage} />}
                  label="Enable Gujarati Interface (ગુજરાતી ભાષા સપોર્ટ)"
                  sx={{ display: 'block' }}
                />
              </CardContent>
            </Card>

            <Button
              type="button"
              onClick={handleSaveSettings}
              fullWidth
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              disabled={loading}
              sx={{ py: 1.5, fontWeight: 800, fontSize: '1rem', borderRadius: 2 }}
            >
              {loading ? 'Saving...' : 'Save Settings Changes'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
