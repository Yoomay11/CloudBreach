import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  Security as SecurityIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const { themeMode } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError(t('login.usernamePasswordRequired'));
      return;
    }

    const success = await login(username, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError(t('login.invalidCredentials'));
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: themeMode === 'dark' 
          ? 'linear-gradient(135deg, #0c4a6e 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #e0f2fe 0%, #f8fafc 50%, #ffffff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2
      }}
    >
      <Container component="main" maxWidth="sm">
        <Card
          elevation={themeMode === 'dark' ? 8 : 4}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: themeMode === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: themeMode === 'dark' ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(226, 232, 240, 0.3)'
          }}
        >
          <Box
            sx={{
              background: themeMode === 'dark'
                ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
              padding: 4,
              textAlign: 'center',
              color: 'white'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}
            >
              <SecurityIcon sx={{ fontSize: 48, mr: 2 }} />
              <Typography component="h1" variant="h3" sx={{ fontWeight: 'bold' }}>
                CloudBreach
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {t('login.title')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              {t('login.subtitle')}
            </Typography>
          </Box>

          <CardContent sx={{ padding: 4 }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  backgroundColor: themeMode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : undefined
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label={t('login.username')}
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: themeMode === 'dark' ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.8)',
                    '& fieldset': {
                      borderColor: themeMode === 'dark' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(203, 213, 225, 0.5)',
                    },
                    '&:hover fieldset': {
                      borderColor: themeMode === 'dark' ? '#60a5fa' : '#3b82f6',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: themeMode === 'dark' ? '#60a5fa' : '#3b82f6',
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: themeMode === 'dark' ? '#f1f5f9' : '#1e293b',
                  }
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label={t('login.password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: themeMode === 'dark' ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.8)',
                    '& fieldset': {
                      borderColor: themeMode === 'dark' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(203, 213, 225, 0.5)',
                    },
                    '&:hover fieldset': {
                      borderColor: themeMode === 'dark' ? '#60a5fa' : '#3b82f6',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: themeMode === 'dark' ? '#60a5fa' : '#3b82f6',
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: themeMode === 'dark' ? '#f1f5f9' : '#1e293b',
                  }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 4,
                  mb: 2,
                  height: 56,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.6)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: themeMode === 'dark' ? 'rgba(71, 85, 105, 0.5)' : 'rgba(148, 163, 184, 0.5)',
                    boxShadow: 'none'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  t('login.loginButton')
                )}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                {t('login.testAccount')}
              </Typography>
            </Divider>

            <Box
              sx={{
                textAlign: 'center',
                padding: 2,
                backgroundColor: themeMode === 'dark' ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.8)',
                borderRadius: 2,
                border: themeMode === 'dark' ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid rgba(226, 232, 240, 0.3)'
              }}
            >
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#cbd5e1' : '#475569', mb: 1 }}>
                {t('login.adminAccount')}
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', color: themeMode === 'dark' ? '#60a5fa' : '#3b82f6' }}>
                admin / admin123
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;