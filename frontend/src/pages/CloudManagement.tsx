import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Cloud as CloudIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Computer as ComputeIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { cloudAPI } from '../services/api';

interface CloudResource {
  id: string;
  name: string;
  type: string;
  region: string;
  status: string;
  tags: Record<string, string>;
  created_at: string;
  last_modified: string;
  security_score?: number;
  compliance_status?: string;
}

interface SecurityPosture {
  overall_score: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  compliance_percentage: number;
  recommendations: string[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cloud-tabpanel-${index}`}
      aria-labelledby={`cloud-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CloudManagement: React.FC = () => {
  const { themeMode } = useTheme();
  const { t } = useLanguage();
  const [tabValue, setTabValue] = useState(0);
  const [awsResources, setAwsResources] = useState<CloudResource[]>([]);
  const [azureResources, setAzureResources] = useState<CloudResource[]>([]);
  const [securityPosture, setSecurityPosture] = useState<SecurityPosture | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedResource, setSelectedResource] = useState<CloudResource | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [resourceFilter, setResourceFilter] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [awsResponse, azureResponse, postureResponse] = await Promise.all([
        cloudAPI.getAWSResources(),
        cloudAPI.getAzureResources(),
        cloudAPI.getSecurityPosture(),
      ]);
      
      setAwsResources(awsResponse.resources || []);
      setAzureResources(azureResponse.resources || []);
      setSecurityPosture(postureResponse);
    } catch (error) {
      console.error('Failed to load cloud data:', error);
      // 使用模拟数据作为后备
      const mockAwsResources: CloudResource[] = [
        {
          id: 'aws-ec2-001',
          name: 'web-server-prod',
          type: 'EC2 Instance',
          region: 'us-east-1',
          status: 'running',
          tags: { Environment: 'production', Team: 'backend' },
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          last_modified: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          security_score: 85,
          compliance_status: 'compliant'
        },
        {
          id: 'aws-s3-001',
          name: 'app-data-bucket',
          type: 'S3 Bucket',
          region: 'us-west-2',
          status: 'active',
          tags: { Environment: 'production', DataType: 'user-uploads' },
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_modified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          security_score: 92,
          compliance_status: 'compliant'
        }
      ];
      
      const mockAzureResources: CloudResource[] = [
        {
          id: 'azure-vm-001',
          name: 'api-server-staging',
          type: 'Virtual Machine',
          region: 'East US',
          status: 'running',
          tags: { Environment: 'staging', Application: 'api' },
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          last_modified: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          security_score: 78,
          compliance_status: 'non-compliant'
        }
      ];
      
      const mockSecurityPosture: SecurityPosture = {
        overall_score: 82,
        critical_issues: 2,
        high_issues: 5,
        medium_issues: 12,
        low_issues: 8,
        compliance_percentage: 85,
        recommendations: [
          t('cloud.enableMFA'),
          t('cloud.updateSSLCert'),
          t('cloud.configureSecurityGroups')
        ]
      };
      
      setAwsResources(mockAwsResources);
      setAzureResources(mockAzureResources);
      setSecurityPosture(mockSecurityPosture);
      setAlert({ type: 'info', message: t('cloud.mockDataLoaded') });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await cloudAPI.syncResources();
      setAlert({ type: 'success', message: t('cloud.syncSuccess') });
      await loadData();
    } catch (error) {
      console.error('Failed to sync resources:', error);
      setAlert({ type: 'error', message: t('cloud.syncFailed') });
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async (format: string = 'json') => {
    try {
      const blob = await cloudAPI.exportResources(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `cloud-resources.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setAlert({ type: 'success', message: t('cloud.exportSuccess') });
    } catch (error) {
      console.error('Failed to export resources:', error);
      setAlert({ type: 'error', message: t('cloud.exportFailed') });
    }
  };

  const handleViewResource = async (resource: CloudResource) => {
    try {
      const provider = tabValue === 0 ? 'aws' : 'azure';
      const context = await cloudAPI.getResourceContext(resource.id, provider);
      setSelectedResource({ ...resource, ...context });
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Failed to load resource context:', error);
      setAlert({ type: 'error', message: t('cloud.loadDetailsFailed') });
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ec2':
      case 'vm':
        return <ComputeIcon />;
      case 's3':
      case 'storage':
        return <StorageIcon />;
      case 'vpc':
      case 'network':
        return <NetworkIcon />;
      default:
        return <CloudIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'active':
        return 'success';
      case 'stopped':
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const filteredAwsResources = awsResources.filter(resource => 
    !resourceFilter || resource.type.toLowerCase().includes(resourceFilter.toLowerCase())
  );
  
  const filteredAzureResources = azureResources.filter(resource => 
    !resourceFilter || resource.type.toLowerCase().includes(resourceFilter.toLowerCase())
  );

  const resourceTypeData = [
    { name: 'AWS', value: awsResources.length, color: '#FF8042' },
    { name: 'Azure', value: azureResources.length, color: '#0088FE' },
  ];

  const securityIssuesData = securityPosture ? [
    { name: t('cloud.critical'), value: securityPosture.critical_issues, color: '#f44336' },
    { name: t('cloud.high'), value: securityPosture.high_issues, color: '#ff9800' },
    { name: t('cloud.medium'), value: securityPosture.medium_issues, color: '#ffeb3b' },
    { name: t('cloud.low'), value: securityPosture.low_issues, color: '#4caf50' },
  ] : [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('cloud.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? t('cloud.syncing') : t('cloud.syncResources')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('json')}
          >
            {t('cloud.exportResources')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            {t('common.refresh')}
          </Button>
        </Box>
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

      {syncing && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            {t('cloud.syncingProgress')}
          </Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 概览统计 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('cloud.awsResources')}
                  </Typography>
                  <Typography variant="h4" color="#FF8042">
                    {awsResources.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('cloud.azureResources')}
                  </Typography>
                  <Typography variant="h4" color="#0088FE">
                    {azureResources.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('cloud.securityScore')}
                  </Typography>
                  <Typography 
                    variant="h4" 
                    color={securityPosture ? getSecurityScoreColor(securityPosture.overall_score) + '.main' : 'text.primary'}
                  >
                    {securityPosture?.overall_score || 0}/100
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('cloud.complianceRate')}
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {securityPosture?.compliance_percentage || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 图表展示 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('cloud.resourceDistribution')}
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={resourceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {resourceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#fff', 
                          border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
                          borderRadius: '4px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('cloud.securityIssuesDistribution')}
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={securityIssuesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                      dataKey="name" 
                      tick={{ fill: themeMode === 'dark' ? '#ccc' : '#666' }}
                    />
                    <YAxis 
                      tick={{ fill: themeMode === 'dark' ? '#ccc' : '#666' }}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#fff', 
                        border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
                        borderRadius: '4px'
                      }} 
                    />
                      <Bar dataKey="value">
                        {securityIssuesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 资源列表 */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('cloud.resourceManagement')}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>{t('cloud.resourceType')}</InputLabel>
                  <Select
                    value={resourceFilter}
                    label={t('cloud.resourceType')}
                    onChange={(e) => setResourceFilter(e.target.value)}
                  >
                    <MenuItem value="">{t('common.all')}</MenuItem>
                    <MenuItem value="ec2">EC2</MenuItem>
                    <MenuItem value="s3">S3</MenuItem>
                    <MenuItem value="vpc">VPC</MenuItem>
                    <MenuItem value="vm">{t('cloud.virtualMachine')}</MenuItem>
                    <MenuItem value="storage">{t('cloud.storage')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label={`AWS (${filteredAwsResources.length})`} />
                <Tab label={`Azure (${filteredAzureResources.length})`} />
              </Tabs>
              
              <TabPanel value={tabValue} index={0}>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('cloud.resourceName')}</TableCell>
                        <TableCell>{t('cloud.type')}</TableCell>
                        <TableCell>{t('cloud.region')}</TableCell>
                        <TableCell>{t('cloud.status')}</TableCell>
                        <TableCell>{t('cloud.securityScore')}</TableCell>
                        <TableCell>{t('cloud.createdAt')}</TableCell>
                        <TableCell>{t('cloud.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAwsResources.map((resource) => (
                        <TableRow key={resource.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getResourceIcon(resource.type)}
                              <Typography variant="subtitle2">
                                {resource.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={resource.type} size="small" />
                          </TableCell>
                          <TableCell>{resource.region}</TableCell>
                          <TableCell>
                            <Chip
                              label={resource.status}
                              color={getStatusColor(resource.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {resource.security_score && (
                              <Chip
                                label={`${resource.security_score}/100`}
                                color={getSecurityScoreColor(resource.security_score) as any}
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(resource.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={t('cloud.viewDetails')}>
                              <IconButton
                                size="small"
                                onClick={() => handleViewResource(resource)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('cloud.resourceName')}</TableCell>
                        <TableCell>{t('cloud.type')}</TableCell>
                        <TableCell>{t('cloud.region')}</TableCell>
                        <TableCell>{t('cloud.status')}</TableCell>
                        <TableCell>{t('cloud.securityScore')}</TableCell>
                        <TableCell>{t('cloud.createdAt')}</TableCell>
                        <TableCell>{t('cloud.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAzureResources.map((resource) => (
                        <TableRow key={resource.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getResourceIcon(resource.type)}
                              <Typography variant="subtitle2">
                                {resource.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={resource.type} size="small" />
                          </TableCell>
                          <TableCell>{resource.region}</TableCell>
                          <TableCell>
                            <Chip
                              label={resource.status}
                              color={getStatusColor(resource.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {resource.security_score && (
                              <Chip
                                label={`${resource.security_score}/100`}
                                color={getSecurityScoreColor(resource.security_score) as any}
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(resource.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={t('cloud.viewDetails')}>
                              <IconButton
                                size="small"
                                onClick={() => handleViewResource(resource)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>
            </CardContent>
          </Card>

          {/* 安全建议 */}
          {securityPosture?.recommendations && securityPosture.recommendations.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {t('cloud.securityRecommendations')}
                </Typography>
                {securityPosture.recommendations.map((recommendation, index) => (
                  <Alert key={index} severity="info" sx={{ mb: 1 }}>
                    {recommendation}
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 资源详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('cloud.resourceDetails')}
        </DialogTitle>
        <DialogContent>
          {selectedResource && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedResource.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label={selectedResource.type} size="small" />
                    <Chip
                      label={selectedResource.status}
                      color={getStatusColor(selectedResource.status) as any}
                      size="small"
                    />
                    {selectedResource.security_score && (
                      <Chip
                        label={`${t('cloud.securityScore')}: ${selectedResource.security_score}/100`}
                        color={getSecurityScoreColor(selectedResource.security_score) as any}
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('cloud.resourceId')}:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {selectedResource.id}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('cloud.region')}:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedResource.region}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('cloud.createdAt')}:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {new Date(selectedResource.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('cloud.lastModified')}:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {new Date(selectedResource.last_modified).toLocaleString()}
                  </Typography>
                </Grid>
                
                {Object.keys(selectedResource.tags).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('cloud.tags')}:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(selectedResource.tags).map(([key, value]) => (
                        <Chip
                          key={key}
                          label={`${key}: ${value}`}
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CloudManagement;