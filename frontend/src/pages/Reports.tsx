import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Code as JsonIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendIcon,
  Schedule as ScheduleIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { reportsAPI } from '../services/api';

interface ReportData {
  id: string;
  name: string;
  type: 'security' | 'compliance' | 'vulnerability' | 'attack_chain' | 'monitoring';
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
  generatedBy: string;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    resolvedIssues: number;
  };
  fileSize: string;
  downloadUrl?: string;
}

interface SecurityMetrics {
  date: string;
  vulnerabilities: number;
  resolved: number;
  newIssues: number;
}

const Reports: React.FC = () => {
  const { themeMode } = useTheme();
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState('security');
  const [dateRange, setDateRange] = useState('7d');
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics[]>([]);

  // 加载报告数据
  const loadReports = async () => {
    try {
      const dashboardData = await reportsAPI.getDashboardData();
      // 从仪表盘数据中提取报告信息
      const reportsList = dashboardData.reports || [];
      setReports(reportsList);
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Fallback to mock data
      const mockReports: ReportData[] = [
      {
        id: 'report-1',
        name: `${t('reports.securityReport')} - 2024年1月`,
        type: 'security',
        status: 'completed',
        createdAt: new Date().toISOString(),
        generatedBy: 'admin',
        summary: {
          totalIssues: 45,
          criticalIssues: 3,
          highIssues: 8,
          mediumIssues: 15,
          lowIssues: 19,
          resolvedIssues: 32
        },
        fileSize: '2.3 MB',
        downloadUrl: '/reports/security-2024-01.pdf'
      },
      {
        id: 'report-2',
        name: `${t('reports.vulnerabilityReport')} - ${t('reports.webApplication')}`,
        type: 'vulnerability',
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        generatedBy: 'scanner',
        summary: {
          totalIssues: 23,
          criticalIssues: 2,
          highIssues: 5,
          mediumIssues: 8,
          lowIssues: 8,
          resolvedIssues: 15
        },
        fileSize: '1.8 MB',
        downloadUrl: '/reports/vulnerability-web.pdf'
      },
      {
        id: 'report-3',
        name: t('reports.attackChainReport'),
        type: 'attack_chain',
        status: 'completed',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        generatedBy: 'analyzer',
        summary: {
          totalIssues: 12,
          criticalIssues: 4,
          highIssues: 3,
          mediumIssues: 3,
          lowIssues: 2,
          resolvedIssues: 7
        },
        fileSize: '3.1 MB',
        downloadUrl: '/reports/attack-chain.pdf'
      },
      {
        id: 'report-4',
        name: t('reports.complianceReport'),
        type: 'compliance',
        status: 'generating',
        createdAt: new Date().toISOString(),
        generatedBy: 'compliance',
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          resolvedIssues: 0
        },
        fileSize: t('reports.generating'),
      }
      ];
      setReports(mockReports);
    }
  };

  // 初始化数据
  useEffect(() => {
    loadReports();

    // 生成安全指标数据
    const mockMetrics: SecurityMetrics[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockMetrics.push({
        date: date.toLocaleDateString(),
        vulnerabilities: Math.floor(Math.random() * 20) + 10,
        resolved: Math.floor(Math.random() * 15) + 5,
        newIssues: Math.floor(Math.random() * 8) + 2
      });
    }
    setSecurityMetrics(mockMetrics);
  }, []);

  // 生成报告
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // 使用现有的API方法生成报告
      const reportId = `report-${Date.now()}`;
      const reportData = await reportsAPI.exportReport(reportId);
      
      const newReport: ReportData = {
        id: reportId,
        name: `${getReportTypeName(reportType)} - ${new Date().toLocaleString()}`,
        type: reportType as ReportData['type'],
        status: 'completed',
        createdAt: new Date().toISOString(),
        generatedBy: 'admin',
        summary: {
          totalIssues: Math.floor(Math.random() * 50) + 10,
          criticalIssues: Math.floor(Math.random() * 5) + 1,
          highIssues: Math.floor(Math.random() * 10) + 2,
          mediumIssues: Math.floor(Math.random() * 15) + 5,
          lowIssues: Math.floor(Math.random() * 20) + 5,
          resolvedIssues: Math.floor(Math.random() * 30) + 10
        },
        fileSize: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
        downloadUrl: `/reports/${reportType}-${Date.now()}.pdf`
      };
      
      setReports(prev => [newReport, ...prev]);
      setIsGenerating(false);
    } catch (error) {
      console.error('Failed to generate report:', error);
      setIsGenerating(false);
      
      // Fallback to mock report generation
      const newReport: ReportData = {
        id: `report-${Date.now()}`,
        name: `${getReportTypeName(reportType)} - ${new Date().toLocaleString()}`,
        type: reportType as ReportData['type'],
        status: 'generating',
        createdAt: new Date().toISOString(),
        generatedBy: 'admin',
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          resolvedIssues: 0
        },
        fileSize: t('reports.generating')
      };

      setReports(prev => [newReport, ...prev]);

      // 模拟生成过程
      setTimeout(() => {
        const completedReport: ReportData = {
          ...newReport,
          status: 'completed',
          summary: {
            totalIssues: Math.floor(Math.random() * 50) + 10,
            criticalIssues: Math.floor(Math.random() * 5) + 1,
            highIssues: Math.floor(Math.random() * 10) + 2,
            mediumIssues: Math.floor(Math.random() * 15) + 5,
            lowIssues: Math.floor(Math.random() * 20) + 5,
            resolvedIssues: Math.floor(Math.random() * 30) + 10
          },
          fileSize: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
          downloadUrl: `/reports/${reportType}-${Date.now()}.pdf`
        };

        setReports(prev => prev.map(report => 
          report.id === newReport.id ? completedReport : report
        ));
        setIsGenerating(false);
      }, 3000);
    }
  };

  const getReportTypeName = (type: string) => {
    const typeNames = {
      security: t('reports.securityReport'),
      compliance: t('reports.complianceReport'),
      vulnerability: t('reports.vulnerabilityReport'),
      attack_chain: t('reports.attackChainReport'),
      monitoring: t('reports.monitoringReport')
    };
    return typeNames[type as keyof typeof typeNames] || t('reports.unknownReport');
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <SecurityIcon />;
      case 'compliance': return <CheckIcon />;
      case 'vulnerability': return <WarningIcon />;
      case 'attack_chain': return <TrendIcon />;
      case 'monitoring': return <ScheduleIcon />;
      default: return <ReportIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'generating': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return t('reports.completed');
      case 'generating': return t('reports.generating');
      case 'failed': return t('reports.failed');
      default: return t('reports.unknown');
    }
  };

  const handleViewReport = (report: ReportData) => {
    setSelectedReport(report);
    setDetailDialogOpen(true);
  };

  const handleDownloadReport = async (report: ReportData, format: 'pdf' | 'excel' | 'json') => {
    try {
      const blob = await reportsAPI.exportReport(report.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.name}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      // Fallback to mock download
      const link = document.createElement('a');
      link.href = report.downloadUrl || '#';
      link.download = `${report.name}.${format}`;
      link.click();
    }
  };

  // 图表颜色
  const COLORS = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3'];

  // 饼图数据
  const pieData = selectedReport ? [
    { name: t('common.critical'), value: selectedReport.summary.criticalIssues, color: '#f44336' },
    { name: t('common.high'), value: selectedReport.summary.highIssues, color: '#ff9800' },
    { name: t('common.medium'), value: selectedReport.summary.mediumIssues, color: '#ffeb3b' },
    { name: t('common.low'), value: selectedReport.summary.lowIssues, color: '#4caf50' }
  ].filter(item => item.value > 0) : [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {t('reports.securityReports')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t('reports.reportType')}</InputLabel>
            <Select
              value={reportType}
              label={t('reports.reportType')}
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="security">{t('reports.securityAssessment')}</MenuItem>
              <MenuItem value="vulnerability">{t('reports.vulnerabilityScanning')}</MenuItem>
              <MenuItem value="attack_chain">{t('reports.attackChainAnalysis')}</MenuItem>
              <MenuItem value="compliance">{t('reports.complianceCheck')}</MenuItem>
              <MenuItem value="monitoring">{t('reports.monitoringReport')}</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>{t('reports.timeRange')}</InputLabel>
            <Select
              value={dateRange}
              label={t('reports.timeRange')}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="1d">{t('reports.oneDay')}</MenuItem>
              <MenuItem value="7d">{t('reports.sevenDays')}</MenuItem>
              <MenuItem value="30d">{t('reports.thirtyDays')}</MenuItem>
              <MenuItem value="90d">{t('reports.ninetyDays')}</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={<ReportIcon />}
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? t('reports.generating') : t('reports.generateReport')}
          </Button>
        </Box>
      </Box>

      {/* 报告统计 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#fff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '140px' 
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('reports.totalReports')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    {reports.length}
                  </Typography>
                </Box>
                <ReportIcon sx={{ fontSize: 40, color: '#1976d2' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#fff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '140px' 
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('reports.completed')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {reports.filter(r => r.status === 'completed').length}
                  </Typography>
                </Box>
                <CheckIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#fff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '140px' 
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('reports.generating')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                    {reports.filter(r => r.status === 'generating').length}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, color: '#ff9800' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#fff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '140px' 
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('reports.totalIssues')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    {reports.reduce((acc, report) => acc + report.summary.totalIssues, 0)}
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: '#f44336' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 安全趋势图 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#fff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '100%' 
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('reports.securityTrend')}
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={securityMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeMode === 'dark' ? '#333' : '#e0e0e0'} />
                  <XAxis 
                    dataKey="date" 
                    stroke={themeMode === 'dark' ? '#ccc' : '#666'}
                    tick={{ fill: themeMode === 'dark' ? '#ccc' : '#666' }}
                  />
                  <YAxis 
                    stroke={themeMode === 'dark' ? '#ccc' : '#666'}
                    tick={{ fill: themeMode === 'dark' ? '#ccc' : '#666' }}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#fff', 
                      border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
                      borderRadius: '4px'
                    }} 
                  />
                  <Line type="monotone" dataKey="vulnerabilities" stroke="#f44336" strokeWidth={2} name={t('reports.vulnerabilities')} />
                  <Line type="monotone" dataKey="resolved" stroke="#4caf50" strokeWidth={2} name={t('reports.resolved')} />
                  <Line type="monotone" dataKey="newIssues" stroke="#ff9800" strokeWidth={2} name={t('reports.newIssues')} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 问题分布 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#fff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '100%' 
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('reports.severityDistribution')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: t('common.critical'), count: reports.reduce((acc, r) => acc + r.summary.criticalIssues, 0), color: '#f44336' },
                  { label: t('common.high'), count: reports.reduce((acc, r) => acc + r.summary.highIssues, 0), color: '#ff9800' },
                  { label: t('common.medium'), count: reports.reduce((acc, r) => acc + r.summary.mediumIssues, 0), color: '#ffeb3b' },
                  { label: t('common.low'), count: reports.reduce((acc, r) => acc + r.summary.lowIssues, 0), color: '#4caf50' }
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, backgroundColor: item.color, borderRadius: '50%' }} />
                      <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{item.label}</Typography>
                    </Box>
                    <Typography variant="h6" sx={{ color: item.color, fontWeight: 'bold' }}>
                      {item.count}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 报告列表 */}
      <Card sx={{ 
        backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#fff', 
        border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {t('reports.reportList')}
            </Typography>
            <IconButton onClick={() => window.location.reload()}>
              <RefreshIcon />
            </IconButton>
          </Box>

          {reports.length === 0 ? (
            <Alert severity="info">
              {t('reports.noReports')}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('reports.reportName')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('reports.type')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('reports.status')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('reports.issueStats')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('reports.fileSize')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('reports.generatedBy')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('reports.createdAt')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} sx={{ 
                      '&:hover': { 
                        backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5' 
                      } 
                    }}>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#fff' : '#000', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getReportTypeIcon(report.type)}
                          {report.name}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#fff' : '#000', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        {getReportTypeName(report.type)}
                      </TableCell>
                      <TableCell sx={{ 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        <Chip
                          label={getStatusText(report.status)}
                          size="small"
                          color={getStatusColor(report.status) as any}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {report.summary.criticalIssues > 0 && (
                            <Chip label={`${t('common.critical')}: ${report.summary.criticalIssues}`} size="small" sx={{ backgroundColor: '#f44336', color: '#fff' }} />
                          )}
                          {report.summary.highIssues > 0 && (
                            <Chip label={`${t('common.high')}: ${report.summary.highIssues}`} size="small" sx={{ backgroundColor: '#ff9800', color: '#fff' }} />
                          )}
                          {report.summary.totalIssues > 0 && (
                            <Chip label={`${t('reports.totalIssues')}: ${report.summary.totalIssues}`} size="small" sx={{ backgroundColor: '#666', color: '#fff' }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        {report.fileSize}
                      </TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        {report.generatedBy}
                      </TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        {new Date(report.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="查看详情">
                            <IconButton
                              size="small"
                              onClick={() => handleViewReport(report)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {report.status === 'completed' && (
                            <>
                              <Tooltip title={t('reports.downloadPdf')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadReport(report, 'pdf')}
                                >
                                  <PdfIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('reports.downloadExcel')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadReport(report, 'excel')}
                                >
                                  <ExcelIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('reports.downloadJson')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadReport(report, 'json')}
                                >
                                  <JsonIcon />
                                </IconButton>
                              </Tooltip>
                            </>
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

      {/* 报告详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#fff',
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          {t('reports.reportDetails')} - {selectedReport?.name}
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('reports.reportType')}</Typography>
                  <Typography variant="body1" sx={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>
                    {getReportTypeName(selectedReport.type)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('reports.status')}</Typography>
                  <Chip
                    label={getStatusText(selectedReport.status)}
                    size="small"
                    color={getStatusColor(selectedReport.status) as any}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('reports.fileSize')}</Typography>
                  <Typography variant="body1" sx={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>
                    {selectedReport.fileSize}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('reports.generatedBy')}</Typography>
                  <Typography variant="body1" sx={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>
                    {selectedReport.generatedBy}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2, borderColor: themeMode === 'dark' ? '#333' : '#e0e0e0' }} />
              
              <Typography variant="h6" sx={{ mb: 2 }}>{t('reports.issueStats')}</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('reports.totalIssues')}</Typography>
                      <Typography variant="body1" sx={{ color: themeMode === 'dark' ? '#fff' : '#000', fontWeight: 'bold' }}>
                        {selectedReport.summary.totalIssues}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#f44336' }}>{t('common.critical')}</Typography>
                      <Typography variant="body1" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                        {selectedReport.summary.criticalIssues}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#ff9800' }}>{t('common.high')}</Typography>
                      <Typography variant="body1" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                        {selectedReport.summary.highIssues}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#ffeb3b' }}>{t('common.medium')}</Typography>
                      <Typography variant="body1" sx={{ color: '#ffeb3b', fontWeight: 'bold' }}>
                        {selectedReport.summary.mediumIssues}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#4caf50' }}>{t('common.low')}</Typography>
                      <Typography variant="body1" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                        {selectedReport.summary.lowIssues}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#2196f3' }}>{t('reports.resolved')}</Typography>
                      <Typography variant="body1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                        {selectedReport.summary.resolvedIssues}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
              
              {pieData.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>{t('reports.issueDistribution')}</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
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
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedReport?.status === 'completed' && (
            <>
              <Button
                startIcon={<PdfIcon />}
                onClick={() => selectedReport && handleDownloadReport(selectedReport, 'pdf')}
              >
                {t('reports.downloadPdf')}
              </Button>
              <Button
                startIcon={<ExcelIcon />}
                onClick={() => selectedReport && handleDownloadReport(selectedReport, 'excel')}
              >
                {t('reports.downloadExcel')}
              </Button>
            </>
          )}
          <Button onClick={() => setDetailDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;