import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  PlayArrow as ApplyIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { remediationAPI } from '../services/api';

interface RemediationSuggestion {
  id: string;
  vuln_id: string;
  file_path: string;
  line_number?: number;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion: string;
  code_fix: string;
  status: 'pending' | 'applied' | 'failed';
  created_at: string;
  applied_at?: string;
  error_message?: string;
}

const Remediation: React.FC = () => {
  const { themeMode } = useTheme();
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<RemediationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<RemediationSuggestion | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await remediationAPI.listSuggestions();
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      // 使用模拟数据作为后备
      const mockSuggestions: RemediationSuggestion[] = [
        {
          id: 'suggestion_001',
          vuln_id: 'vuln_001',
          file_path: '/src/handlers/user.go',
          line_number: 45,
          severity: 'high',
          title: '修复SQL注入漏洞',
          description: '在用户查询中使用参数化查询',
          suggestion: '使用参数化查询替换字符串拼接，避免SQL注入攻击',
          code_fix: 'query := "SELECT * FROM users WHERE id = ?"\nrows, err := db.Query(query, userID)',
          status: 'pending',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'suggestion_002',
          vuln_id: 'vuln_002',
          file_path: '/k8s/deployment.yaml',
          line_number: 25,
          severity: 'medium',
          title: '加强容器安全配置',
          description: '设置非root用户运行容器',
          suggestion: '配置容器以非root用户身份运行，减少权限提升风险',
          code_fix: 'securityContext:\n  runAsNonRoot: true\n  runAsUser: 1000',
          status: 'pending',
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'suggestion_003',
          vuln_id: 'vuln_003',
          file_path: '/go.mod',
          severity: 'low',
          title: '更新依赖包版本',
          description: '升级存在安全漏洞的依赖包',
          suggestion: '将依赖包升级到最新安全版本，修复已知漏洞',
          code_fix: 'go get -u github.com/example/package@v1.2.3',
          status: 'applied',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          applied_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        }
      ];
      setSuggestions(mockSuggestions);
      setAlert({ type: 'info', message: t('remediation.loadedSampleData') });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (suggestion: RemediationSuggestion) => {
    try {
      const response = await remediationAPI.getSuggestion(suggestion.id);
      setSelectedSuggestion(response);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Failed to load suggestion details:', error);
      setAlert({ type: 'error', message: t('remediation.loadDetailsFailed') });
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    try {
      setApplyingId(suggestionId);
      await remediationAPI.apply(suggestionId);
      setAlert({ type: 'success', message: t('remediation.applySuccess') });
      await loadSuggestions(); // 重新加载列表
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      setAlert({ type: 'error', message: t('remediation.applyFailed') });
    } finally {
      setApplyingId(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <CheckIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'pending': return <WarningIcon color="warning" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('remediation.title')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadSuggestions}
          disabled={loading}
        >
          {t('remediation.refresh')}
        </Button>
      </Box>

      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 统计卡片 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('remediation.totalSuggestions')}
                  </Typography>
                  <Typography variant="h4">
                    {suggestions.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('remediation.pending')}
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {suggestions.filter(s => s.status === 'pending').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('remediation.applied')}
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {suggestions.filter(s => s.status === 'applied').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('remediation.failed')}
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {suggestions.filter(s => s.status === 'failed').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 修复建议列表 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('remediation.suggestionList')}
              </Typography>
              {suggestions.length === 0 ? (
                <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  {t('remediation.noSuggestions')}
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('remediation.title2')}</TableCell>
                        <TableCell>{t('remediation.filePath')}</TableCell>
                        <TableCell>{t('remediation.severity')}</TableCell>
                        <TableCell>{t('remediation.status')}</TableCell>
                        <TableCell>{t('remediation.createTime')}</TableCell>
                        <TableCell>{t('remediation.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {suggestions.map((suggestion) => (
                        <TableRow key={suggestion.id}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {suggestion.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {suggestion.description.substring(0, 100)}...
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {suggestion.file_path}
                              {suggestion.line_number && `:${suggestion.line_number}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={suggestion.severity.toUpperCase()}
                              color={getSeverityColor(suggestion.severity) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStatusIcon(suggestion.status)}
                              <Chip
                                label={suggestion.status === 'pending' ? t('remediation.pending') : 
                                       suggestion.status === 'applied' ? t('remediation.applied') : t('remediation.failed')}
                                color={getStatusColor(suggestion.status) as any}
                                size="small"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(suggestion.created_at).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title={t('remediation.viewDetails')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewDetails(suggestion)}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              {suggestion.status === 'pending' && (
                                <Tooltip title={t('remediation.applyFix')}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleApplySuggestion(suggestion.id)}
                                    disabled={applyingId === suggestion.id}
                                  >
                                    {applyingId === suggestion.id ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <ApplyIcon />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('remediation.suggestionDetails')}
        </DialogTitle>
        <DialogContent>
          {selectedSuggestion && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedSuggestion.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={selectedSuggestion.severity.toUpperCase()}
                      color={getSeverityColor(selectedSuggestion.severity) as any}
                      size="small"
                    />
                    <Chip
                      label={selectedSuggestion.status === 'pending' ? t('remediation.pending') : 
                             selectedSuggestion.status === 'applied' ? t('remediation.applied') : t('remediation.failed')}
                      color={getStatusColor(selectedSuggestion.status) as any}
                      size="small"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('remediation.filePath')}:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {selectedSuggestion.file_path}
                    {selectedSuggestion.line_number && `:${selectedSuggestion.line_number}`}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">{t('remediation.problemDesc')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        {selectedSuggestion.description}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">{t('remediation.fixSuggestion')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        {selectedSuggestion.suggestion}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">{t('remediation.fixCode')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: themeMode === 'dark' ? '#2a2a2a' : 'grey.100',
                          color: themeMode === 'dark' ? '#fff' : '#000',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        }}
                      >
                        {selectedSuggestion.code_fix}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {selectedSuggestion.error_message && (
                  <Grid item xs={12}>
                    <Alert severity="error">
                      <Typography variant="subtitle2" gutterBottom>
                        {t('remediation.errorInfo')}:
                      </Typography>
                      <Typography variant="body2">
                        {selectedSuggestion.error_message}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedSuggestion?.status === 'pending' && (
            <Button
              variant="contained"
              startIcon={<ApplyIcon />}
              onClick={() => {
                handleApplySuggestion(selectedSuggestion.id);
                setDetailDialogOpen(false);
              }}
              disabled={applyingId === selectedSuggestion.id}
            >
              {t('remediation.applyFixBtn')}
            </Button>
          )}
          <Button onClick={() => setDetailDialogOpen(false)}>
            {t('remediation.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Remediation;