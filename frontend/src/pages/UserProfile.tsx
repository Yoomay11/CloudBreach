import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  AccountCircle,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  department: string;
  position: string;
  location: string;
  joinDate: string;
  lastLogin: string;
  avatar?: string;
  role: string;
  permissions: string[];
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    securityAlerts: boolean;
    reportNotifications: boolean;
  };
}

const UserProfile: React.FC = () => {
  const { themeMode } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [userInfo, setUserInfo] = useState<UserInfo>({
    id: '1',
    username: user?.username || 'admin',
    email: 'admin@cloudbreach.com',
    fullName: t('profile.systemAdmin'),
    phone: '+86 138-0013-8000',
    department: t('profile.securityDept'),
    position: t('profile.seniorSecurityEngineer'),
    location: t('profile.beijing'),
    joinDate: '2023-01-15',
    lastLogin: new Date().toISOString(),
    role: t('profile.admin'),
    permissions: [t('profile.systemManagement'), t('profile.userManagement'), t('profile.securityScanning'), t('profile.reportGeneration'), t('profile.monitoringManagement')],
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      securityAlerts: true,
      reportNotifications: true
    }
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState<UserInfo>(userInfo);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    // 模拟从API获取用户信息
    const fetchUserInfo = async () => {
      // 这里应该调用实际的API
      // const response = await userAPI.getUserProfile();
      // setUserInfo(response.data);
    };
    fetchUserInfo();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedInfo({ ...userInfo });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedInfo(userInfo);
    setSaveError('');
  };

  const handleSave = async () => {
    try {
      // 模拟API调用
      // await userAPI.updateUserProfile(editedInfo);
      setUserInfo(editedInfo);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(t('profile.saveFailed'));
    }
  };

  const handleInputChange = (field: keyof UserInfo, value: any) => {
    setEditedInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = (field: keyof UserInfo['preferences'], value: boolean) => {
    setEditedInfo(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value
      }
    }));
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveError(t('profile.passwordMismatch'));
      return;
    }
    
    try {
      // 模拟API调用
      // await userAPI.changePassword(passwordData);
      setChangePasswordOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(t('profile.passwordChangeFailed'));
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case t('profile.admin'): return '#f44336';
      case t('profile.seniorUser'): return '#ff9800';
      case t('profile.regularUser'): return '#4caf50';
      default: return '#666';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {t('profile.title')}
        </Typography>
        {!isEditing ? (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            sx={{ borderRadius: 2 }}
          >
            {t('profile.editProfile')}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              sx={{ borderRadius: 2 }}
            >
              {t('profile.cancel')}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              sx={{ borderRadius: 2 }}
            >
              {t('profile.save')}
            </Button>
          </Box>
        )}
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {t('profile.saveSuccess')}
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {saveError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 基本信息卡片 */}
        <Grid item xs={12} md={4}>
          <Card sx={{
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
            height: 'fit-content'
          }}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  backgroundColor: '#1976d2',
                  fontSize: '3rem'
                }}
              >
                <AccountCircle sx={{ fontSize: '4rem' }} />
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                {userInfo.fullName}
              </Typography>
              <Typography variant="body1" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 2 }}>
                @{userInfo.username}
              </Typography>
              <Chip
                label={userInfo.role}
                sx={{
                  backgroundColor: getRoleColor(userInfo.role),
                  color: '#fff',
                  fontWeight: 'bold',
                  mb: 2
                }}
              />
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>
                {userInfo.department} · {userInfo.position}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 详细信息卡片 */}
        <Grid item xs={12} md={8}>
          <Card sx={{
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <AccountCircle sx={{ mr: 1 }} />
                {t('profile.basicInfo')}
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('profile.fullName')}
                    value={isEditing ? editedInfo.fullName : userInfo.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <AccountCircle sx={{ mr: 1, color: themeMode === 'dark' ? '#ccc' : '#666' }} />
                    }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('profile.email')}
                    value={isEditing ? editedInfo.email : userInfo.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <EmailIcon sx={{ mr: 1, color: themeMode === 'dark' ? '#ccc' : '#666' }} />
                    }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('profile.phone')}
                    value={isEditing ? editedInfo.phone : userInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <PhoneIcon sx={{ mr: 1, color: themeMode === 'dark' ? '#ccc' : '#666' }} />
                    }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('profile.department')}
                    value={isEditing ? editedInfo.department : userInfo.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <WorkIcon sx={{ mr: 1, color: themeMode === 'dark' ? '#ccc' : '#666' }} />
                    }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('profile.position')}
                    value={isEditing ? editedInfo.position : userInfo.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <WorkIcon sx={{ mr: 1, color: themeMode === 'dark' ? '#ccc' : '#666' }} />
                    }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('profile.location')}
                    value={isEditing ? editedInfo.location : userInfo.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <LocationIcon sx={{ mr: 1, color: themeMode === 'dark' ? '#ccc' : '#666' }} />
                    }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3, borderColor: themeMode === 'dark' ? '#333' : '#e0e0e0' }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <SecurityIcon sx={{ mr: 1 }} />
                  {t('profile.securitySettings')}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={() => setChangePasswordOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  {t('profile.changePassword')}
                </Button>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>
                        {t('profile.joinDate')}
                      </Typography>
                      <Typography variant="body1">
                        {new Date(userInfo.joinDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>
                        {t('profile.lastLogin')}
                      </Typography>
                      <Typography variant="body1">
                        {new Date(userInfo.lastLogin).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 权限信息卡片 */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <SecurityIcon sx={{ mr: 1 }} />
                {t('profile.permissionManagement')}
              </Typography>
              <List>
                {userInfo.permissions.map((permission, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <SecurityIcon sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary={permission} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 通知设置卡片 */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <NotificationsIcon sx={{ mr: 1 }} />
                {t('profile.notificationSettings')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isEditing ? editedInfo.preferences.emailNotifications : userInfo.preferences.emailNotifications}
                      onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label={t('profile.emailNotifications')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={isEditing ? editedInfo.preferences.smsNotifications : userInfo.preferences.smsNotifications}
                      onChange={(e) => handlePreferenceChange('smsNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label={t('profile.smsNotifications')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={isEditing ? editedInfo.preferences.securityAlerts : userInfo.preferences.securityAlerts}
                      onChange={(e) => handlePreferenceChange('securityAlerts', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label={t('profile.securityAlerts')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={isEditing ? editedInfo.preferences.reportNotifications : userInfo.preferences.reportNotifications}
                      onChange={(e) => handlePreferenceChange('reportNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label={t('profile.reportNotifications')}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 修改密码对话框 */}
      <Dialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0'
          }
        }}
      >
        <DialogTitle>
          {t('profile.changePassword')}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="password"
            label={t('profile.currentPassword')}
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            type="password"
            label={t('profile.newPassword')}
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="password"
            label={t('profile.confirmPassword')}
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>
            {t('profile.cancel')}
          </Button>
          <Button onClick={handleChangePassword} variant="contained">
            {t('profile.confirmChange')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserProfile;