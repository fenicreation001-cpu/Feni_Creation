import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in React Component Tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocalData = () => {
    if (window.confirm('Are you sure you want to reset app cache? Your saved offline data will remain in MongoDB if connected.')) {
      try {
        localStorage.clear();
      } catch (e) {}
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: 'center',
              bgcolor: '#fff',
              border: '1px solid #fecdd3',
            }}
          >
            <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '50%', bgcolor: '#ffe4e6', color: '#e11d48', mb: 2 }}>
              <BugReportIcon sx={{ fontSize: 48 }} />
            </Box>
            
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
              કંઈક ખોટું થયું છે (An Unexpected UI Error Occurred)
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The application encountered a temporary rendering error. Don't worry, your data is safe.
            </Typography>

            {this.state.error && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: '#f8fafc',
                  borderColor: '#cbd5e1',
                  textAlign: 'left',
                  maxHeight: 180,
                  overflowY: 'auto',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#e11d48', display: 'block', mb: 0.5 }}>
                  Error Message: {this.state.error.toString()}
                </Typography>
                {this.state.errorInfo && (
                  <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'pre-wrap' }}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Paper>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                sx={{ bgcolor: '#4f46e5', px: 3, py: 1, fontWeight: 700, '&:hover': { bgcolor: '#4338ca' } }}
              >
                એપ રિફ્રેશ કરો (Reload App)
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={this.handleResetLocalData}
                sx={{ px: 3, py: 1, fontWeight: 700 }}
              >
                કેશ સાફ કરો (Clear Cache)
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}
