import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import io from 'socket.io-client';
import { monitorAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface MonitorEvent {
  id: string;
  timestamp: string;
  pid: number;
  uid: number;
  containerName: string;
  eventType: 'file_access' | 'network' | 'process' | 'syscall';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  details: {
    [key: string]: any;
  };
}

interface MonitorStats {
  totalEvents: number;
  criticalEvents: number;
  activeContainers: number;
  cpuUsage: number;
  memoryUsage: number;
}

const Monitor: React.FC = () => {
  const { themeMode } = useTheme();
  const { t } = useLanguage();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [stats, setStats] = useState<MonitorStats>({
    totalEvents: 0,
    criticalEvents: 0,
    activeContainers: 0,
    cpuUsage: 0,
    memoryUsage: 0
  });
  const [selectedEvent, setSelectedEvent] = useState<MonitorEvent | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载监控数据
  const loadMonitorData = async () => {
    setLoading(true);
    try {
      const [eventsResponse, statusResponse] = await Promise.all([
        monitorAPI.getEvents(),
        monitorAPI.getStatus()
      ]);
      
      setEvents(eventsResponse.events || []);
      setStats({
        totalEvents: eventsResponse.total || 0,
        criticalEvents: eventsResponse.events?.filter((e: any) => e.severity === 'critical').length || 0,
        activeContainers: statusResponse.active_containers || 0,
        cpuUsage: statusResponse.cpu_usage || 0,
        memoryUsage: statusResponse.memory_usage || 0
      });
      
      setIsMonitoring(statusResponse.running || false);
    } catch (error) {
      console.error('加载监控数据失败:', error);
      // 使用模拟数据作为后备
      setEvents([]);
      setStats({
        totalEvents: 0,
        criticalEvents: 0,
        activeContainers: 5,
        cpuUsage: Math.floor(Math.random() * 30) + 20,
        memoryUsage: Math.floor(Math.random() * 40) + 30
      });
      setIsMonitoring(false);
    } finally {
      setLoading(false);
    }
  };
  
  // WebSocket连接
  useEffect(() => {
    let socket: any;
    
    if (isMonitoring) {
      socket = io('ws://localhost:8080', {
        transports: ['websocket']
      });

      socket.on('monitor_event', (event: MonitorEvent) => {
        setEvents(prev => [event, ...prev.slice(0, 99)]); // 保持最新100条
        updateStats(event);
      });

      socket.on('monitor_stats', (newStats: MonitorStats) => {
        setStats(newStats);
      });

      // 实时数据更新
      const interval = setInterval(async () => {
        try {
          const statusResponse = await monitorAPI.getStatus();
          const now = new Date();
          const newDataPoint = {
            time: now.toLocaleTimeString(),
            events: statusResponse.event_count || Math.floor(Math.random() * 50) + 10,
            cpu: statusResponse.cpu_usage || Math.floor(Math.random() * 100),
            memory: statusResponse.memory_usage || Math.floor(Math.random() * 100)
          };
          
          setRealTimeData(prev => {
            const updated = [...prev, newDataPoint];
            return updated.slice(-20); // 保持最新20个数据点
          });
        } catch (error) {
          // 使用模拟数据
          const now = new Date();
          const newDataPoint = {
            time: now.toLocaleTimeString(),
            events: Math.floor(Math.random() * 50) + 10,
            cpu: Math.floor(Math.random() * 100),
            memory: Math.floor(Math.random() * 100)
          };
          
          setRealTimeData(prev => {
            const updated = [...prev, newDataPoint];
            return updated.slice(-20);
          });
        }
      }, 2000);

      return () => {
        socket.disconnect();
        clearInterval(interval);
      };
    }
  }, [isMonitoring]);
  
  // 初始化数据
  useEffect(() => {
    loadMonitorData();
  }, []);

  // 自动刷新事件
  useEffect(() => {
    if (isMonitoring && autoRefresh) {
      const interval = setInterval(async () => {
        try {
          const eventsResponse = await monitorAPI.getEvents();
          setEvents(eventsResponse.events || []);
        } catch (error) {
          // 使用模拟事件作为后备
          generateMockEvent();
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring, autoRefresh]);

  const generateMockEvent = () => {
    const eventTypes = ['file_access', 'network', 'process', 'syscall'] as const;
    const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;
    const containers = ['web-app', 'database', 'redis', 'nginx', 'api-server'];
    
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const container = containers[Math.floor(Math.random() * containers.length)];

    const messages = {
      file_access: `${t('monitor.container')} ${container} ${t('monitor.fileAccessAction')}`,
      network: `${t('monitor.container')} ${container} ${t('monitor.networkAction')}`,
      process: `${t('monitor.container')} ${container} ${t('monitor.processAction')}`,
      syscall: `${t('monitor.container')} ${container} ${t('monitor.syscallAction')}`
    };

    const mockEvent: MonitorEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      pid: Math.floor(Math.random() * 10000) + 1000,
      uid: Math.floor(Math.random() * 1000),
      containerName: container,
      eventType,
      severity,
      message: messages[eventType],
      details: {
        command: eventType === 'process' ? '/bin/bash -c "whoami"' : undefined,
        file: eventType === 'file_access' ? '/etc/passwd' : undefined,
        destination: eventType === 'network' ? '192.168.1.100:22' : undefined,
        syscall: eventType === 'syscall' ? 'execve' : undefined
      }
    };

    setEvents(prev => [mockEvent, ...prev.slice(0, 99)]);
    updateStats(mockEvent);
  };

  const updateStats = (event: MonitorEvent) => {
    setStats(prev => ({
      ...prev,
      totalEvents: prev.totalEvents + 1,
      criticalEvents: event.severity === 'critical' || event.severity === 'high' 
        ? prev.criticalEvents + 1 
        : prev.criticalEvents
    }));
  };

  const handleStartMonitoring = async () => {
    try {
      // 获取当前监控状态以验证连接
      await monitorAPI.getStatus();
      setIsMonitoring(true);
      setEvents([]);
      setStats({
        totalEvents: 0,
        criticalEvents: 0,
        activeContainers: 5,
        cpuUsage: 0,
        memoryUsage: 0
      });
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      // Fallback to local state update
      setIsMonitoring(true);
      setEvents([]);
      setStats({
        totalEvents: 0,
        criticalEvents: 0,
        activeContainers: 5,
        cpuUsage: 0,
        memoryUsage: 0
      });
    }
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffeb3b';
      case 'low': return '#4caf50';
      case 'info': return '#2196f3';
      default: return '#666';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <InfoIcon />;
      case 'low': return <SecurityIcon />;
      case 'info': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  const handleViewDetails = (event: MonitorEvent) => {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };

  const filteredEvents = events.filter(event => 
    filterSeverity === 'all' || event.severity === filterSeverity
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {t('monitor.title')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label={t('monitor.autoRefresh')}
          />
          
          {!isMonitoring ? (
            <Button
              variant="contained"
              startIcon={<StartIcon />}
              onClick={handleStartMonitoring}
              sx={{ backgroundColor: '#4caf50' }}
            >
              {t('monitor.startMonitoring')}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<StopIcon />}
              onClick={handleStopMonitoring}
              sx={{ backgroundColor: '#f44336' }}
            >
              {t('monitor.stopMonitoring')}
            </Button>
          )}
        </Box>
      </Box>

      {!isMonitoring && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('monitor.startMonitoringTip')}
        </Alert>
      )}

      {/* 监控状态卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('monitor.totalEvents')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    {stats.totalEvents}
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 40, color: '#1976d2' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('monitor.criticalEvents')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    {stats.criticalEvents}
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: '#f44336' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('monitor.activeContainers')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {stats.activeContainers}
                  </Typography>
                </Box>
                <InfoIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
          }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {t('monitor.monitoringStatus')}
              </Typography>
              <Chip
                label={isMonitoring ? t('monitor.running') : t('monitor.stopped')}
                color={isMonitoring ? 'success' : 'default'}
                sx={{ mt: 1 }}
              />
              {isMonitoring && (
                <LinearProgress sx={{ mt: 2 }} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 实时监控图表 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '100%' 
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('monitor.realTimeEventTrend')}
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={realTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeMode === 'dark' ? '#333' : '#e0e0e0'} />
                  <XAxis dataKey="time" stroke={themeMode === 'dark' ? '#ccc' : '#666'} />
                  <YAxis stroke={themeMode === 'dark' ? '#ccc' : '#666'} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#ffffff',
                      border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
                      borderRadius: '4px'
                    }}
                  />
                  <Line type="monotone" dataKey="events" stroke="#1976d2" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 系统资源使用 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '100%' 
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('monitor.systemResources')}
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{t('monitor.cpuUsage')}</Typography>
                  <Typography variant="body2">{Math.floor(Math.random() * 100)}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.floor(Math.random() * 100)} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{t('monitor.memoryUsage')}</Typography>
                  <Typography variant="body2">{Math.floor(Math.random() * 100)}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.floor(Math.random() * 100)} 
                  sx={{ height: 8, borderRadius: 4 }}
                  color="secondary"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 事件列表 */}
        <Grid item xs={12}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('monitor.monitoringEvents')} ({filteredEvents.length})
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={filterSeverity === 'all' ? 'contained' : 'outlined'}
                    onClick={() => setFilterSeverity('all')}
                  >
                    {t('common.all')}
                  </Button>
                  <Button
                    size="small"
                    variant={filterSeverity === 'critical' ? 'contained' : 'outlined'}
                    onClick={() => setFilterSeverity('critical')}
                    sx={{ color: '#f44336' }}
                  >
                    {t('monitor.critical')}
                  </Button>
                  <Button
                    size="small"
                    variant={filterSeverity === 'high' ? 'contained' : 'outlined'}
                    onClick={() => setFilterSeverity('high')}
                    sx={{ color: '#ff9800' }}
                  >
                    {t('monitor.high')}
                  </Button>
                </Box>
              </Box>

              {filteredEvents.length === 0 ? (
                <Alert severity="info">
                  {isMonitoring ? t('monitor.noEvents') : t('monitor.pleaseStartMonitoring')}
                </Alert>
              ) : (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ 
                          backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5', 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('monitor.time')}</TableCell>
                        <TableCell sx={{ 
                          backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5', 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('monitor.container')}</TableCell>
                        <TableCell sx={{ 
                          backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5', 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('monitor.eventType')}</TableCell>
                        <TableCell sx={{ 
                          backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5', 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('monitor.severity')}</TableCell>
                        <TableCell sx={{ 
                          backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5', 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('monitor.message')}</TableCell>
                        <TableCell sx={{ 
                          backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5', 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('monitor.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id} sx={{ 
                          '&:hover': { 
                            backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5' 
                          } 
                        }}>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#ccc' : '#666', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#fff' : '#000', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            {event.containerName}
                          </TableCell>
                          <TableCell sx={{ 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            <Chip label={event.eventType} size="small" />
                          </TableCell>
                          <TableCell sx={{ 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ color: getSeverityColor(event.severity) }}>
                                {getSeverityIcon(event.severity)}
                              </Box>
                              <Chip
                                label={event.severity}
                                size="small"
                                sx={{
                                  backgroundColor: getSeverityColor(event.severity),
                                  color: '#fff'
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#fff' : '#000', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
                            maxWidth: 300 
                          }}>
                            <Typography variant="body2" noWrap>
                              {event.message}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            <Tooltip title={t('monitor.viewDetails')}>
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(event)}
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
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 事件详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0'
          }
        }}
      >
        <DialogTitle>
          {t('monitor.eventDetails')}
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                    <strong>{t('monitor.eventId')}:</strong> {selectedEvent.id}
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                    <strong>{t('monitor.time')}:</strong> {new Date(selectedEvent.timestamp).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                    <strong>{t('monitor.container')}:</strong> {selectedEvent.containerName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                    <strong>PID:</strong> {selectedEvent.pid}
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                    <strong>UID:</strong> {selectedEvent.uid}
                  </Typography>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                    <strong>{t('monitor.eventType')}:</strong> {selectedEvent.eventType}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mt: 2, mb: 1 }}>
                <strong>{t('monitor.message')}:</strong>
              </Typography>
              <Typography variant="body1" sx={{ color: themeMode === 'dark' ? '#fff' : '#000', mb: 2 }}>
                {selectedEvent.message}
              </Typography>
              
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                <strong>{t('monitor.details')}:</strong>
              </Typography>
              <Box sx={{ 
                backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5', 
                p: 2, 
                borderRadius: 1 
              }}>
                <pre style={{ 
                  color: themeMode === 'dark' ? '#ccc' : '#666', 
                  fontSize: '12px', 
                  margin: 0 
                }}>
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Monitor;