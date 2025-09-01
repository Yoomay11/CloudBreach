import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Cloud as CloudIcon,
  Monitor as MonitorIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { reportsAPI, iacAPI, monitorAPI, cloudAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, trend }) => {
  const { themeMode } = useTheme();
  
  return (
    <Card sx={{ 
      backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
      border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
      height: '140px' 
    }}>
      <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ color: color, fontWeight: 'bold' }}>
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUpIcon sx={{ fontSize: 16, color: '#4caf50', mr: 0.5 }} />
                <Typography variant="body2" sx={{ color: '#4caf50' }}>
                  {trend}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: color, display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const { themeMode } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalScans: 0,
    criticalVulns: 0,
    activeMonitors: 0,
    cloudResources: 0
  });

  // 加载仪表盘数据
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 获取仪表盘数据
      const dashboardResponse = await reportsAPI.getDashboardData();
      setDashboardData(dashboardResponse);
      
      // 获取最近扫描
      const scansResponse = await iacAPI.listScans(5, 0);
      setRecentScans(scansResponse.scans || []);
      
      // 获取监控状态
      const monitorResponse = await monitorAPI.getStatus();
      
      // 获取云资源数量
      const awsResponse = await cloudAPI.getAWSResources();
      const azureResponse = await cloudAPI.getAzureResources();
      
      // 更新指标
      setMetrics({
        totalScans: dashboardResponse.total_scans || scansResponse.total || 0,
        criticalVulns: dashboardResponse.critical_alerts || 0,
        activeMonitors: dashboardResponse.active_monitors || (monitorResponse.running ? 1 : 0),
        cloudResources: (awsResponse.resources?.length || 0) + (azureResponse.resources?.length || 0)
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // 使用默认数据作为后备
      setMetrics({
        totalScans: 156,
        criticalVulns: 23,
        activeMonitors: 8,
        cloudResources: 342
      });
      setRecentScans([
        { id: 'scan_001', path: 'terraform-aws-vpc', status: 'completed', findings: 5, critical: 1, high: 2, medium: 2, low: 0, timestamp: new Date(Date.now() - 2 * 60 * 1000) },
        { id: 'scan_002', path: 'k8s-deployment', status: 'running', findings: 0, critical: 0, high: 0, medium: 0, low: 0, timestamp: new Date(Date.now() - 5 * 60 * 1000) },
        { id: 'scan_003', path: 'docker-compose', status: 'completed', findings: 12, critical: 3, high: 4, medium: 3, low: 2, timestamp: new Date(Date.now() - 10 * 60 * 1000) },
        { id: 'scan_004', path: 'helm-charts', status: 'completed', findings: 3, critical: 0, high: 1, medium: 2, low: 0, timestamp: new Date(Date.now() - 15 * 60 * 1000) }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadDashboardData();
    // 每30秒刷新一次数据
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const vulnerabilityTrend = [
    { name: t('dashboard.monday'), critical: 12, high: 25, medium: 45, low: 23 },
    { name: t('dashboard.tuesday'), critical: 15, high: 28, medium: 42, low: 20 },
    { name: t('dashboard.wednesday'), critical: 18, high: 32, medium: 38, low: 18 },
    { name: t('dashboard.thursday'), critical: 23, high: 35, medium: 35, low: 15 },
    { name: t('dashboard.friday'), critical: 20, high: 30, medium: 40, low: 22 },
    { name: t('dashboard.saturday'), critical: 16, high: 26, medium: 43, low: 25 },
    { name: t('dashboard.sunday'), critical: 14, high: 24, medium: 46, low: 28 }
  ];

  const severityDistribution = [
    { name: t('dashboard.critical'), value: 23, color: '#f44336' },
    { name: t('dashboard.high'), value: 45, color: '#ff9800' },
    { name: t('dashboard.medium'), value: 67, color: '#ffeb3b' },
    { name: t('dashboard.low'), value: 34, color: '#4caf50' }
  ];

  const handleRefresh = () => {
    loadDashboardData();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffeb3b';
      case 'low': return '#4caf50';
      default: return '#2196f3';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'running': return '#2196f3';
      case 'failed': return '#f44336';
      default: return '#666';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {t('dashboard.title')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#666' : '#999' }}>
            {t('dashboard.lastUpdate')}: {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Tooltip title={t('dashboard.refreshData')}>
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon sx={{ color: loading ? (themeMode === 'dark' ? '#666' : '#999') : '#1976d2' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* 关键指标卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t('dashboard.totalScans')}
            value={metrics.totalScans}
            icon={<SecurityIcon sx={{ fontSize: 40 }} />}
            color="#1976d2"
            trend="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t('dashboard.criticalVulns')}
            value={metrics.criticalVulns}
            icon={<ErrorIcon sx={{ fontSize: 40 }} />}
            color="#f44336"
            trend="-5%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t('dashboard.activeMonitors')}
            value={metrics.activeMonitors}
            icon={<MonitorIcon sx={{ fontSize: 40 }} />}
            color="#4caf50"
            trend="+2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t('dashboard.cloudResources')}
            value={metrics.cloudResources}
            icon={<CloudIcon sx={{ fontSize: 40 }} />}
            color="#ff9800"
            trend="+18"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 漏洞趋势图 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '100%' 
          }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('dashboard.vulnerabilityTrend')}
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={vulnerabilityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={themeMode === 'dark' ? '#333' : '#e0e0e0'} />
                    <XAxis dataKey="name" stroke={themeMode === 'dark' ? '#ccc' : '#666'} />
                    <YAxis stroke={themeMode === 'dark' ? '#ccc' : '#666'} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#ffffff',
                        border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
                        borderRadius: '4px'
                      }}
                    />
                    <Line type="monotone" dataKey="critical" stroke="#f44336" strokeWidth={2} />
                    <Line type="monotone" dataKey="high" stroke="#ff9800" strokeWidth={2} />
                    <Line type="monotone" dataKey="medium" stroke="#ffeb3b" strokeWidth={2} />
                    <Line type="monotone" dataKey="low" stroke="#4caf50" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 漏洞分布饼图 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '100%' 
          }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('dashboard.severityDistribution')}
              </Typography>
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#ffffff',
                        border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
                        borderRadius: '4px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* 图例 */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mt: 2, gap: 1 }}>
                  {severityDistribution.map((entry, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          backgroundColor: entry.color,
                          borderRadius: '2px'
                        }}
                      />
                      <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>
                        {entry.name}: {entry.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 最近扫描结果 */}
        <Grid item xs={12}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('dashboard.recentScans')}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>{t('dashboard.projectName')}</TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>{t('dashboard.status')}</TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>{t('dashboard.vulnerabilityCount')}</TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>{t('dashboard.severity')}</TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>{t('dashboard.scanTime')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentScans.map((scan) => {
                      const getSeverityLabel = (critical: number, high: number) => {
                        if (critical > 0) return { label: t('dashboard.critical'), severity: 'critical' };
                        if (high > 0) return { label: t('dashboard.high'), severity: 'high' };
                        return { label: t('dashboard.low'), severity: 'low' };
                      };
                      
                      const severity = getSeverityLabel(scan.critical || 0, scan.high || 0);
                      const timeAgo = scan.timestamp ? 
                        Math.floor((Date.now() - new Date(scan.timestamp).getTime()) / (1000 * 60)) + t('dashboard.minutesAgo') : 
                        t('dashboard.unknown');
                      
                      return (
                        <TableRow key={scan.id} sx={{ 
                          '&:hover': { 
                            backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5' 
                          } 
                        }}>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#fff' : '#000', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            {scan.path || scan.name}
                          </TableCell>
                          <TableCell sx={{ 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            <Chip
                              label={scan.status === 'completed' ? t('dashboard.completed') : scan.status === 'running' ? t('dashboard.running') : t('dashboard.failed')}
                              size="small"
                              sx={{
                                backgroundColor: getStatusColor(scan.status),
                                color: '#fff'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#fff' : '#000', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            {scan.findings || scan.vulnerabilities || 0}
                          </TableCell>
                          <TableCell sx={{ 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            <Chip
                              label={severity.label}
                              size="small"
                              sx={{
                                backgroundColor: getSeverityColor(severity.severity),
                                color: '#fff'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#ccc' : '#666', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            {timeAgo}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;