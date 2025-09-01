import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Monitor as MonitorIcon,
  AccountTree as AttackChainIcon,
  Assessment as ReportsIcon,
  Build as RemediationIcon,
  Cloud as CloudIcon,
  AccountCircle,
  ExitToApp,
  LightMode,
  DarkMode,
  Language
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { themeMode, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const menuItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: <DashboardIcon /> },
    { path: '/iac-scanner', label: t('nav.iacScanner'), icon: <SecurityIcon /> },
    { path: '/monitor', label: t('nav.monitor'), icon: <MonitorIcon /> },
    { path: '/attack-chain', label: t('nav.attackChain'), icon: <AttackChainIcon /> },
    { path: '/remediation', label: t('nav.remediation'), icon: <RemediationIcon /> },
    { path: '/cloud-management', label: t('nav.cloudManagement'), icon: <CloudIcon /> },
    { path: '/reports', label: t('nav.reports'), icon: <ReportsIcon /> }
  ];

  return (
    <AppBar 
      position="static" 
      sx={{ 
        backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
        color: themeMode === 'dark' ? '#ffffff' : '#000000'
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 0, mr: 4, fontWeight: 'bold', color: '#1976d2' }}
        >
          CloudBreach
        </Typography>
        
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {menuItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                backgroundColor: location.pathname === item.path ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.1)'
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={language === 'zh' ? 'Switch to English' : 'Switch to Chinese'}>
            <IconButton
              onClick={toggleLanguage}
              color="inherit"
              sx={{ 
                color: themeMode === 'dark' ? '#ffffff' : '#000000',
                '&:hover': {
                  backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }}
            >
              <Language />
            </IconButton>
          </Tooltip>
          <Tooltip title={themeMode === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
            <IconButton
              onClick={toggleTheme}
              color="inherit"
              sx={{ 
                color: themeMode === 'dark' ? '#ffffff' : '#000000',
                '&:hover': {
                  backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }}
            >
              {themeMode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
          <Typography 
            variant="body2" 
            sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}
          >
            {language === 'zh' ? `${t('nav.welcome')}, ${user?.username}` : `Welcome, ${user?.username}`}
          </Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, backgroundColor: '#1976d2' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleProfile}>
              <AccountCircle sx={{ mr: 1 }} />
              {t('nav.profile')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              {t('nav.logout')}
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;