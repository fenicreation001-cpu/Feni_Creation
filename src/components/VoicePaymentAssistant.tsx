import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as SparklesIcon,
  Clear as ClearIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  InfoOutlined as InfoIcon,
  KeyboardVoice as KeyboardVoiceIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Fade,
  TextField,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Party, Bill, Purchase } from '../types';
import { parseVoicePaymentEntry, ParsedVoicePayment } from '../utils/voicePaymentParser';
import { formatRupees } from '../utils/formatters';

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface VoicePaymentAssistantProps {
  parties: Party[];
  bills?: Bill[];
  purchases?: Purchase[];
  onApplyParsedData: (data: Partial<{
    type: 'Received' | 'Paid';
    partyId: string;
    partyName: string;
    details: string;
    category: 'Textile Customer' | 'Material Supplier' | 'Expense / Kharch' | 'Worker' | 'Other' | string;
    amount: number;
    paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    date: string;
    notes: string;
  }>) => void;
  isGu?: boolean;
  autoStart?: boolean;
}

export const VoicePaymentAssistant: React.FC<VoicePaymentAssistantProps> = ({
  parties,
  bills = [],
  purchases = [],
  onApplyParsedData,
  isGu = true,
  autoStart = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [lang, setLang] = useState<'gu-IN' | 'en-IN'>(isGu ? 'gu-IN' : 'en-IN');
  const [lastParsed, setLastParsed] = useState<ParsedVoicePayment | null>(null);
  const [hasMicPermissionError, setHasMicPermissionError] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [customVoiceText, setCustomVoiceText] = useState('');

  const recognitionRef = useRef<any>(null);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setHasMicPermissionError(false);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            finalTranscript += text + ' ';
          } else {
            currentInterim += text;
          }
        }

        const fullText = (finalTranscript || currentInterim).trim();
        if (fullText) {
          setInterimText(currentInterim);
          if (finalTranscript) {
            setTranscript((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript).trim());
            handleParseAndApply(fullText);
          } else {
            handleParseAndApply(fullText, false);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setHasMicPermissionError(true);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Error initializing speech recognition:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [lang]);

  // Request explicit mic permission on user gesture
  const startListening = async () => {
    setHasMicPermissionError(false);

    // Try requesting getUserMedia to trigger browser permission dialog
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setHasMicPermissionError(false);
      } catch (err: any) {
        console.warn('getUserMedia audio error:', err);
        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.name === 'SecurityError'
        ) {
          setHasMicPermissionError(true);
          setIsListening(false);
          return;
        }
      }
    }

    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.lang = lang;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e: any) {
      console.warn('Speech recognition start failed:', e);
      if (e?.name === 'NotAllowedError') {
        setHasMicPermissionError(true);
      }
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleParseAndApply = (spokenText: string, applyToForm: boolean = true) => {
    const parsed = parseVoicePaymentEntry(spokenText, parties, bills, purchases);
    setLastParsed(parsed);

    if (applyToForm) {
      const updatePayload: any = {};
      if (parsed.type) updatePayload.type = parsed.type;
      if (parsed.partyId) updatePayload.partyId = parsed.partyId;
      if (parsed.partyName) updatePayload.partyName = parsed.partyName;
      if (parsed.details) updatePayload.details = parsed.details;
      if (parsed.category) updatePayload.category = parsed.category;
      if (parsed.amount) updatePayload.amount = parsed.amount;
      if (parsed.paymentMethod) updatePayload.paymentMethod = parsed.paymentMethod;
      if (parsed.refInvoiceNo) updatePayload.refInvoiceNo = parsed.refInvoiceNo;
      if (parsed.date) updatePayload.date = parsed.date;
      if (parsed.notes) updatePayload.notes = parsed.notes;

      onApplyParsedData(updatePayload);
    }
  };

  const handleApplySamplePhrase = (phrase: string) => {
    setTranscript(phrase);
    setCustomVoiceText(phrase);
    handleParseAndApply(phrase, true);
  };

  const handleApplyCustomText = () => {
    if (!customVoiceText.trim()) return;
    setTranscript(customVoiceText);
    handleParseAndApply(customVoiceText, true);
  };

  const handleClear = () => {
    setTranscript('');
    setInterimText('');
    setCustomVoiceText('');
    setLastParsed(null);
  };

  const samplePhrases = [
    {
      label: isGu ? 'રાધે ક્રિષ્ના ૫૦૦૦ જમા UPI' : 'Radhe Krishna 5000 Received UPI',
      phrase: parties[0] ? `${parties[0].name} 5000 રૂપિયા જમા યુપીઆઈ` : 'રાધે ક્રિષ્ના ફેશન ૫૦૦૦ રૂપિયા જમા UPI',
    },
    {
      label: isGu ? 'શ્રી રામ ૧૫૦૦૦ આવક કેશ' : 'Shree Ram 15000 Received Cash',
      phrase: parties[1] ? `${parties[1].name} 15000 રૂપિયા મળ્યા કેશ રોકડ` : 'શ્રી રામ ફેબ્રિક્સ ૧૫૦૦૦ રોકડ મળ્યા',
    },
    {
      label: isGu ? 'સુપર યાર્ન ૧૨૦૦૦ ચૂકવ્યા ચેક' : 'Super Yarn 12000 Paid Cheque',
      phrase: 'સુપર યાર્ન સપ્લાયર ૧૨૦૦૦ રૂપિયા ચૂકવ્યા ચેક',
    },
    {
      label: isGu ? '૨૫૦૦૦ પેઇડ બેંક ટ્રાન્સફર' : '25000 Paid Bank Transfer',
      phrase: '25000 રૂપિયા ચૂકવ્યા બેંક ટ્રાન્સફર NEFT',
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2.5,
        p: 2,
        borderRadius: '12px',
        border: '1.5px solid',
        borderColor: isListening ? '#2563eb' : hasMicPermissionError ? '#f87171' : '#cbd5e1',
        bgcolor: isListening ? '#f0f9ff' : hasMicPermissionError ? '#fffaf0' : '#f8fafc',
        transition: 'all 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Listening Pulse Indicator Bar */}
      {isListening && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            bgcolor: '#2563eb',
            animation: 'pulse 1.2s infinite ease-in-out',
            '@keyframes pulse': {
              '0%': { opacity: 0.4 },
              '50%': { opacity: 1 },
              '100%': { opacity: 0.4 },
            },
          }}
        />
      )}

      {/* Main Mic Header Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Animated Big Mic Button */}
          <Tooltip title={isListening ? (isGu ? 'માઇક બંધ કરો' : 'Stop Listening') : (isGu ? 'બોલવા માટે માઇક ચાલુ કરો' : 'Start Voice Input')}>
            <Button
              variant="contained"
              onClick={toggleListening}
              sx={{
                minWidth: 'auto',
                width: 48,
                height: 48,
                borderRadius: '50%',
                p: 0,
                bgcolor: isListening ? '#ef4444' : '#2563eb',
                color: '#ffffff',
                boxShadow: isListening ? '0 0 0 6px rgba(239, 68, 68, 0.25)' : '0 2px 8px rgba(37, 99, 235, 0.2)',
                '&:hover': {
                  bgcolor: isListening ? '#dc2626' : '#1d4ed8',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <MicIcon sx={{ fontSize: 26 }} />
            </Button>
          </Tooltip>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SparklesIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                {isGu ? 'બોલીને ક્રેડિટ / ડેબિટ એન્ટ્રી (Voice Mic Entry)' : 'Voice Mic Credit & Debit Entry'}
              </Typography>
              {isListening && (
                <Chip
                  label={isGu ? '● સાંભળી રહ્યા છીએ...' : '● Listening...'}
                  size="small"
                  sx={{
                    bgcolor: '#ef4444',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    height: 20,
                    animation: 'pulse 1s infinite',
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              {isListening
                ? (isGu ? 'હવે બોલો... પાર્ટીનું નામ, રકમ અને જમા/ઉધાર વિગત' : 'Speak clearly: Party Name, Amount & Received/Paid details')
                : (isGu ? 'માઇક દબાવો અથવા નીચે આપેલા બોક્સમાં બોલો/લખો' : 'Tap mic or type/dictate in the box below')}
            </Typography>
          </Box>
        </Box>

        {/* Language selector chips: Focus Gujarati then English (Hindi removed) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Chip
            label="ગુજરાતી (મુખ્ય)"
            size="small"
            clickable
            onClick={() => { setLang('gu-IN'); if (isListening) stopListening(); }}
            color={lang === 'gu-IN' ? 'primary' : 'default'}
            variant={lang === 'gu-IN' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 800, fontSize: '0.72rem', height: 24 }}
          />
          <Chip
            label="English"
            size="small"
            clickable
            onClick={() => { setLang('en-IN'); if (isListening) stopListening(); }}
            color={lang === 'en-IN' ? 'primary' : 'default'}
            variant={lang === 'en-IN' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, fontSize: '0.72rem', height: 24 }}
          />
          {(transcript || lastParsed || customVoiceText) && (
            <Tooltip title={isGu ? 'સાફ કરો' : 'Clear'}>
              <IconButton size="small" onClick={handleClear} sx={{ ml: 0.5 }}>
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Permission Blocked / iFrame Notice with 1-Click Direct Window Launcher */}
      {(hasMicPermissionError || (!isSupported && isInIframe)) && (
        <Fade in timeout={300}>
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: '10px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon sx={{ color: '#b91c1c', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: '#b91c1c', fontWeight: 800 }}>
                {isGu
                  ? 'બ્રાઉઝર સુરક્ષા: iFrame પ્રિવ્યુમાં માઇક્રોફોન મર્યાદિત છે'
                  : 'Browser Policy: Microphone Blocked Inside Preview iFrame'}
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: '#7f1d1d', mt: 0.6, fontSize: '0.82rem', lineHeight: 1.45 }}>
              {isGu
                ? 'ગુગલ ક્રોમ સુરક્ષા નિયમો પ્રમાણે iFrame માં માઇક એક્સેસ બ્લોક થાય છે (તમે aistudio.google.com પર માઇક ચાલુ કર્યું હોવા છતાં). ૧૦૦% માઇક ચલાવવા માટે નીચેના બટનથી એપ્લિકેશન સીધી નવી ટેબમાં ખોલો, અથવા નીચેના બોક્સમાં કીબોર્ડ માઇકથી બોલો.'
                : 'Chrome blocks Web Speech inside preview iframes by default. To use direct hardware mic smoothly, open the app directly in a full window, or use the quick dictation box below.'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                color="error"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(window.location.href, '_blank')}
                sx={{
                  fontWeight: 800,
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  py: 0.8,
                  px: 2,
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                }}
              >
                {isGu ? '🚀 એપ્લિકેશન નવી ટેબમાં ખોલો (Open in Direct Tab)' : '🚀 Open in Direct Tab for Mic'}
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={startListening}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  bgcolor: '#ffffff',
                  color: '#b91c1c',
                  borderColor: '#fca5a5',
                  '&:hover': { bgcolor: '#fee2e2', borderColor: '#b91c1c' },
                }}
              >
                {isGu ? '🔄 ફરી પ્રયાસ કરો' : '🔄 Retry Mic'}
              </Button>
            </Box>
          </Box>
        </Fade>
      )}

      {/* Interactive Quick Dictation & Speech Box (Works with Gboard, Win+H, or typing) */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={
              isGu
                ? '🎙️ અહીં બોલો અથવા લખો: દા.ત. "રાધે ક્રિષ્ના ૫૦૦૦ જમા UPI"'
                : '🎙️ Speak or type: e.g. "Radhe Krishna 5000 received UPI"'
            }
            value={customVoiceText}
            onChange={(e) => setCustomVoiceText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyCustomText();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <KeyboardVoiceIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: customVoiceText ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setCustomVoiceText('')}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              bgcolor: '#ffffff',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '0.85rem',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleApplyCustomText}
            disabled={!customVoiceText.trim()}
            endIcon={<SendIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: '#2563eb',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              px: 2.2,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.82rem',
              height: 40,
              '&:hover': { bgcolor: '#1d4ed8' },
            }}
          >
            {isGu ? 'ઓટો-ભરો' : 'Auto Fill'}
          </Button>
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block', fontWeight: 600 }}>
          {isGu
            ? '💡 ટિપ: મોબાઇલ કીબોર્ડ માઇક (Gboard Mic) અથવા વિન્ડોઝ વોઇસ (Win + H) વડે પણ બોલી શકો છો'
            : '💡 Tip: You can also use Mobile Gboard Mic or Windows Voice Dictation (Win + H)'}
        </Typography>
      </Box>

      {/* Live Spoken Transcript Display */}
      {(transcript || interimText) && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.2,
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <VolumeUpIcon sx={{ fontSize: 18, color: '#2563eb' }} />
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', flexGrow: 1, fontStyle: isListening ? 'italic' : 'normal' }}>
            "{transcript || interimText}"
          </Typography>
        </Box>
      )}

      {/* Recognized & Parsed Data Badges */}
      {lastParsed && (
        <Fade in timeout={300}>
          <Box sx={{ mt: 1.5, pt: 1.2, borderTop: '1px dashed #cbd5e1' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {isGu ? 'ઓટો-ડિટેક્ટ થયેલ વિગતો (તમારા ફોર્મમાં ભરાઈ ગઈ છે):' : 'Auto-Detected & Filled in Form:'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              {/* Type Badge */}
              <Chip
                label={`${isGu ? 'પ્રકાર: ' : 'Type: '} ${lastParsed.type === 'Received' ? (isGu ? 'Credit (જમા)' : 'Credit (Inflow)') : (isGu ? 'Debit (ઉધાર)' : 'Debit (Outflow)')}`}
                size="small"
                sx={{
                  bgcolor: lastParsed.type === 'Received' ? '#dcfce7' : '#fee2e2',
                  color: lastParsed.type === 'Received' ? '#15803d' : '#b91c1c',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  border: '1px solid',
                  borderColor: lastParsed.type === 'Received' ? '#bbf7d0' : '#fca5a5',
                }}
              />

              {/* Date Badge */}
              {lastParsed.date && (
                <Chip
                  label={`${isGu ? 'તારીખ: ' : 'Date: '} ${lastParsed.date}`}
                  size="small"
                  sx={{
                    bgcolor: '#f0fdf4',
                    color: '#166534',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    border: '1px solid #bbf7d0',
                  }}
                />
              )}

              {/* Party / Details Badge */}
              {lastParsed.partyName ? (
                <Chip
                  label={`${isGu ? 'પાર્ટી/વિગત: ' : 'Details: '} ${lastParsed.partyName}`}
                  size="small"
                  sx={{
                    bgcolor: '#e0e7ff',
                    color: '#3730a3',
                    fontWeight: 800,
                    fontSize: '0.74rem',
                    border: '1px solid #c7d2fe',
                  }}
                />
              ) : (
                <Chip
                  label={isGu ? '⚠️ પાર્ટી મળી નથી' : '⚠️ Party not found'}
                  size="small"
                  sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem' }}
                />
              )}

              {/* Category Badge */}
              {lastParsed.category && (
                <Chip
                  label={`${isGu ? 'કેટેગરી: ' : 'Cat: '} ${lastParsed.category}`}
                  size="small"
                  sx={{
                    bgcolor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    border: '1px solid #fde68a',
                  }}
                />
              )}

              {/* Amount Badge */}
              {lastParsed.amount ? (
                <Chip
                  label={`${isGu ? 'રકમ: ' : 'Amount: '} ${formatRupees(lastParsed.amount)}`}
                  size="small"
                  sx={{
                    bgcolor: '#f1f5f9',
                    color: '#0f172a',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    fontSize: '0.76rem',
                    border: '1px solid #cbd5e1',
                  }}
                />
              ) : (
                <Chip
                  label={isGu ? '⚠️ રકમ મળી નથી' : '⚠️ Amount not found'}
                  size="small"
                  sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem' }}
                />
              )}

              {/* Payment Method Badge */}
              {lastParsed.paymentMethod && (
                <Chip
                  label={`${isGu ? 'પદ્ધતિ: ' : 'Method: '} ${lastParsed.paymentMethod}`}
                  size="small"
                  sx={{
                    bgcolor: '#f8fafc',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    border: '1px solid #e2e8f0',
                  }}
                />
              )}
            </Box>
          </Box>
        </Fade>
      )}

      {/* Quick Helper Sample Voice Chips */}
      <Box sx={{ mt: 1.8 }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.6 }}>
          ⚡ {isGu ? 'ઝડપી સેમ્પલ (એક ક્લિકમાં ટેસ્ટ કરો):' : 'Quick Samples (One-click test):'}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
          {samplePhrases.map((s, idx) => (
            <Chip
              key={idx}
              label={s.label}
              size="small"
              clickable
              onClick={() => handleApplySamplePhrase(s.phrase)}
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                bgcolor: '#ffffff',
                border: '1px solid #cbd5e1',
                '&:hover': { bgcolor: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' },
              }}
            />
          ))}
        </Box>
      </Box>
    </Paper>
  );
};
