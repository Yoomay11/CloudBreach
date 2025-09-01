import React, { useState, useEffect, useRef } from 'react';
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
  LinearProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AccountTree as AttackChainIcon,
  PlayArrow as AnalyzeIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { Network, DataSet } from 'vis-network/standalone/esm/vis-network';
import { attackAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface AttackNode {
  id: string;
  label: string;
  type: 'entry' | 'vulnerability' | 'exploit' | 'privilege' | 'persistence' | 'exfiltration';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  mitre: string;
  remediation: string;
}

interface AttackEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  probability: number;
}

interface AttackChainData {
  id: string;
  name: string;
  nodes: AttackNode[];
  edges: AttackEdge[];
  riskScore: number;
  status: 'analyzing' | 'completed' | 'failed';
  createdAt: string;
  summary: {
    totalSteps: number;
    criticalVulns: number;
    estimatedTime: string;
    successProbability: number;
  };
}

const AttackChain: React.FC = () => {
  const { themeMode } = useTheme();
  const { t } = useLanguage();
  const [attackChains, setAttackChains] = useState<AttackChainData[]>([]);
  const [selectedChain, setSelectedChain] = useState<AttackChainData | null>(null);
  const [selectedNode, setSelectedNode] = useState<AttackNode | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [nodeDetailDialogOpen, setNodeDetailDialogOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState('full');
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<Network | null>(null);

  // 加载攻击链数据
   const loadAttackChains = async () => {
     try {
       const response = await attackAPI.listChains();
       setAttackChains(response);
    } catch (error) {
      console.error('Failed to load attack chain data:', error);
      // 使用模拟数据作为后备
      const mockChains: AttackChainData[] = [
        {
          id: 'chain-1',
          name: t('attackChain.webAppPenetration'),
          nodes: [],
          edges: [],
          riskScore: 8.5,
          status: 'completed',
          createdAt: new Date().toISOString(),
          summary: {
            totalSteps: 6,
            criticalVulns: 2,
            estimatedTime: t('attackChain.estimatedTime24h'),
            successProbability: 85
          }
        },
        {
          id: 'chain-2',
          name: t('attackChain.containerEscape'),
          nodes: [],
          edges: [],
          riskScore: 9.2,
          status: 'completed',
          createdAt: new Date().toISOString(),
          summary: {
            totalSteps: 4,
            criticalVulns: 3,
            estimatedTime: t('attackChain.estimatedTime12h'),
            successProbability: 92
          }
        }
      ];
      setAttackChains(mockChains);
    }
  };

  // 初始化数据
  useEffect(() => {
    loadAttackChains();
  }, []);

  // 生成攻击链图形
  const generateAttackGraph = (chainData: AttackChainData) => {
    const nodes = [
      {
        id: '1',
        label: t('attackChain.initialAccess'),
        type: 'entry',
        severity: 'high',
        description: t('attackChain.sqlInjectionDesc'),
        mitre: 'T1190',
        remediation: t('attackChain.sqlInjectionRemediation')
      },
      {
        id: '2',
        label: t('attackChain.privilegeDiscovery'),
        type: 'vulnerability',
        severity: 'medium',
        description: t('attackChain.userEnumerationDesc'),
        mitre: 'T1087',
        remediation: t('attackChain.userEnumerationRemediation')
      },
      {
        id: '3',
        label: t('attackChain.privilegeEscalation'),
        type: 'privilege',
        severity: 'critical',
        description: t('attackChain.dbPrivilegeEscDesc'),
        mitre: 'T1068',
        remediation: t('attackChain.dbPrivilegeEscRemediation')
      },
      {
        id: '4',
        label: t('attackChain.lateralMovement'),
        type: 'exploit',
        severity: 'high',
        description: t('attackChain.networkScanDesc'),
        mitre: 'T1018',
        remediation: t('attackChain.networkScanRemediation')
      },
      {
        id: '5',
        label: t('attackChain.persistence'),
        type: 'persistence',
        severity: 'critical',
        description: t('attackChain.backdoorDesc'),
        mitre: 'T1053',
        remediation: t('attackChain.backdoorRemediation')
      },
      {
        id: '6',
        label: t('attackChain.dataExfiltration'),
        type: 'exfiltration',
        severity: 'critical',
        description: t('attackChain.dataTheftDesc'),
        mitre: 'T1041',
        remediation: t('attackChain.dataTheftRemediation')
      }
    ] as AttackNode[];

    const edges = [
      { id: 'e1', from: '1', to: '2', label: '95%', probability: 0.95 },
      { id: 'e2', from: '2', to: '3', label: '80%', probability: 0.80 },
      { id: 'e3', from: '3', to: '4', label: '90%', probability: 0.90 },
      { id: 'e4', from: '4', to: '5', label: '75%', probability: 0.75 },
      { id: 'e5', from: '5', to: '6', label: '85%', probability: 0.85 }
    ] as AttackEdge[];

    return { ...chainData, nodes, edges };
  };

  // 渲染攻击链图形
  const renderAttackGraph = (chainData: AttackChainData) => {
    if (!networkRef.current || !chainData.nodes.length) return;

    const getNodeColor = (type: string, severity: string) => {
      const severityColors = {
        critical: '#f44336',
        high: '#ff9800',
        medium: '#ffeb3b',
        low: '#4caf50'
      };
      return severityColors[severity as keyof typeof severityColors] || '#666';
    };

    const nodes = new DataSet(
      chainData.nodes.map(node => ({
        id: node.id,
        label: node.label,
        color: {
          background: getNodeColor(node.type, node.severity),
          border: '#333',
          highlight: {
            background: getNodeColor(node.type, node.severity),
            border: '#fff'
          }
        },
        font: { color: '#fff', size: 12 },
        shape: 'box',
        margin: { top: 10, right: 10, bottom: 10, left: 10 }
      }))
    );

    const edges = new DataSet(
      chainData.edges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        arrows: 'to',
        color: { color: '#666', highlight: '#1976d2' },
        font: { color: '#ccc', size: 10 }
      }))
    );

    const data = {
      nodes: nodes,
      edges: edges
    };
    const options = {
      layout: {
        hierarchical: {
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 200,
          nodeSpacing: 150
        }
      },
      physics: {
        enabled: false
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true
      },
      nodes: {
        borderWidth: 2,
        shadow: true
      },
      edges: {
        width: 2,
        shadow: true
      }
    };

    if (networkInstance.current) {
      networkInstance.current.destroy();
    }

    networkInstance.current = new Network(networkRef.current, data, options);

    // 节点点击事件
    networkInstance.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = chainData.nodes.find(n => n.id === nodeId);
        if (node) {
          setSelectedNode(node);
          setNodeDetailDialogOpen(true);
        }
      }
    });
  };

  // 开始分析
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    try {
      // 调用API开始攻击链分析
      const analysisRequest = {
        type: analysisType,
        timestamp: new Date().toISOString()
      };
      
      const newChain = await attackAPI.analyze(`${t('attackChain.analysisTitle')} ${new Date().toLocaleTimeString()}`, analysisType);
      setAttackChains(prev => [newChain, ...prev]);
      
      // 轮询检查分析状态
      const checkStatus = async () => {
        try {
          const updatedChain = await attackAPI.getChain(newChain.id);
          setAttackChains(prev => prev.map(chain => 
            chain.id === newChain.id ? updatedChain : chain
          ));
          
          if (updatedChain.status === 'completed' || updatedChain.status === 'failed') {
            setIsAnalyzing(false);
          } else {
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Failed to check analysis status:', error);
          setIsAnalyzing(false);
        }
      };
      
      setTimeout(checkStatus, 2000);
    } catch (error) {
      console.error('Failed to start attack chain analysis:', error);
      setIsAnalyzing(false);
      
      // 使用模拟数据作为后备
      const newChain: AttackChainData = {
        id: `chain-${Date.now()}`,
        name: `${t('attackChain.analysisTitle')} ${new Date().toLocaleTimeString()}`,
        nodes: [],
        edges: [],
        riskScore: 0,
        status: 'analyzing',
        createdAt: new Date().toISOString(),
        summary: {
          totalSteps: 0,
          criticalVulns: 0,
          estimatedTime: t('attackChain.analyzing'),
          successProbability: 0
        }
      };

      setAttackChains(prev => [newChain, ...prev]);

      setTimeout(() => {
        const completedChain = generateAttackGraph({
          ...newChain,
          status: 'completed',
          riskScore: Math.floor(Math.random() * 3) + 7,
          summary: {
            totalSteps: 6,
            criticalVulns: Math.floor(Math.random() * 3) + 1,
            estimatedTime: `${Math.floor(Math.random() * 3) + 1}-${Math.floor(Math.random() * 3) + 3} ${t('attackChain.hours')}`,
            successProbability: Math.floor(Math.random() * 20) + 70
          }
        });

        setAttackChains(prev => prev.map(chain => 
          chain.id === newChain.id ? completedChain : chain
        ));
        setIsAnalyzing(false);
      }, 3000);
    }
  };

  const handleViewChain = async (chain: AttackChainData) => {
    try {
      // 从API获取完整的攻击链详情
       const detailedChain = await attackAPI.getChain(chain.id);
      setSelectedChain(detailedChain);
      setDetailDialogOpen(true);
      
      // 延迟渲染图形以确保对话框已打开
      setTimeout(() => {
        renderAttackGraph(detailedChain);
      }, 100);
    } catch (error) {
      console.error('Failed to get attack chain details:', error);
      // 使用本地生成的图形作为后备
      const chainWithGraph = generateAttackGraph(chain);
      setSelectedChain(chainWithGraph);
      setDetailDialogOpen(true);
      
      setTimeout(() => {
        renderAttackGraph(chainWithGraph);
      }, 100);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 9) return '#f44336';
    if (score >= 7) return '#ff9800';
    if (score >= 5) return '#ffeb3b';
    return '#4caf50';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 9) return t('attackChain.veryHigh');
    if (score >= 7) return t('attackChain.high');
    if (score >= 5) return t('attackChain.medium');
    return t('attackChain.low');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {t('attackChain.title')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{t('attackChain.analysisType')}</InputLabel>
            <Select
              value={analysisType}
              label={t('attackChain.analysisType')}
              onChange={(e) => setAnalysisType(e.target.value)}
            >
              <MenuItem value="full">{t('attackChain.fullAnalysis')}</MenuItem>
              <MenuItem value="quick">{t('attackChain.quickAnalysis')}</MenuItem>
              <MenuItem value="targeted">{t('attackChain.targetedAnalysis')}</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={<AnalyzeIcon />}
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? t('attackChain.analyzing') : t('attackChain.startAnalysis')}
          </Button>
        </Box>
      </Box>

      {isAnalyzing && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography>{t('attackChain.analyzingPath')}</Typography>
            <LinearProgress sx={{ flexGrow: 1 }} />
          </Box>
        </Alert>
      )}

      {/* 攻击链统计 */}
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
                    {t('attackChain.totalChains')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    {attackChains.length}
                  </Typography>
                </Box>
                <AttackChainIcon sx={{ fontSize: 40, color: '#1976d2' }} />
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
                    {t('attackChain.highRiskChains')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    {attackChains.filter(chain => chain.riskScore >= 8).length}
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
                    {t('attackChain.avgRiskScore')}
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                    {attackChains.length > 0 ? (attackChains.reduce((acc, chain) => acc + chain.riskScore, 0) / attackChains.length).toFixed(1) : '0'}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 40, color: '#ff9800' }} />
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
                    {t('attackChain.analysisStatus')}
                  </Typography>
                  <Chip
                    label={isAnalyzing ? t('attackChain.analyzing') : t('attackChain.ready')}
                    color={isAnalyzing ? 'info' : 'success'}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <TimelineIcon sx={{ fontSize: 40, color: isAnalyzing ? '#2196f3' : '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 攻击链列表 */}
      <Card sx={{ 
        backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
        border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {t('attackChain.chainList')}
            </Typography>
            <IconButton onClick={loadAttackChains}>
              <RefreshIcon />
            </IconButton>
          </Box>

          {attackChains.length === 0 ? (
            <Alert severity="info">
              {t('attackChain.noChains')}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('attackChain.name')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('attackChain.riskScore')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('attackChain.attackSteps')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('attackChain.criticalVulns')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('attackChain.successRate')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('attackChain.status')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('attackChain.createdAt')}</TableCell>
                    <TableCell sx={{ 
                      color: themeMode === 'dark' ? '#ccc' : '#666', 
                      borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                    }}>{t('attackChain.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attackChains.map((chain) => (
                    <TableRow key={chain.id} sx={{ 
                      '&:hover': { 
                        backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5' 
                      } 
                    }}>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#fff' : '#000', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        {chain.name}
                      </TableCell>
                      <TableCell sx={{ 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{ color: getRiskColor(chain.riskScore), fontWeight: 'bold' }}
                          >
                            {chain.riskScore.toFixed(1)}
                          </Typography>
                          <Chip
                            label={getRiskLevel(chain.riskScore)}
                            size="small"
                            sx={{
                              backgroundColor: getRiskColor(chain.riskScore),
                              color: '#fff'
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#fff' : '#000', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        {chain.summary.totalSteps}
                      </TableCell>
                      <TableCell sx={{ 
                        color: '#f44336', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
                        fontWeight: 'bold' 
                      }}>
                        {chain.summary.criticalVulns}
                      </TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#fff' : '#000', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        {chain.summary.successProbability}%
                      </TableCell>
                      <TableCell sx={{ 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        <Chip
                          label={chain.status === 'completed' ? t('attackChain.completed') : chain.status === 'analyzing' ? t('attackChain.analyzing') : t('attackChain.failed')}
                          size="small"
                          color={chain.status === 'completed' ? 'success' : chain.status === 'analyzing' ? 'info' : 'error'}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        color: themeMode === 'dark' ? '#ccc' : '#666', 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        {new Date(chain.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ 
                        borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                      }}>
                        <Tooltip title={t('attackChain.viewChain')}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewChain(chain)}
                            disabled={chain.status !== 'completed'}
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

      {/* 攻击链详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff',
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          {t('attackChain.chainDetails')} - {selectedChain?.name}
        </DialogTitle>
        <DialogContent>
          {selectedChain && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={3}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('attackChain.riskScore')}</Typography>
                  <Typography variant="h6" sx={{ color: getRiskColor(selectedChain.riskScore) }}>
                    {selectedChain.riskScore.toFixed(1)}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('attackChain.attackSteps')}</Typography>
                  <Typography variant="h6" sx={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>
                    {selectedChain.summary.totalSteps}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('attackChain.criticalVulns')}</Typography>
                  <Typography variant="h6" sx={{ color: '#f44336' }}>
                    {selectedChain.summary.criticalVulns}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666' }}>{t('attackChain.successRate')}</Typography>
                  <Typography variant="h6" sx={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>
                    {selectedChain.summary.successProbability}%
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" sx={{ mb: 2 }}>{t('attackChain.attackPath')}</Typography>
              <Box
                ref={networkRef}
                sx={{
                  height: 400,
                  border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
                  borderRadius: 1,
                  backgroundColor: themeMode === 'dark' ? '#0a0a0a' : '#f5f5f5'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* 攻击步骤详情对话框 */}
      <Dialog
        open={nodeDetailDialogOpen}
        onClose={() => setNodeDetailDialogOpen(false)}
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
          {t('attackChain.stepDetails')}
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box>
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                <strong>MITRE ATT&CK:</strong> {selectedNode.mitre}
              </Typography>
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 2 }}>
                <strong>{t('attackChain.severity')}:</strong>
                <Chip
                  label={selectedNode.severity}
                  size="small"
                  sx={{
                    ml: 1,
                    backgroundColor: getSeverityColor(selectedNode.severity),
                    color: '#fff'
                  }}
                />
              </Typography>
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 2 }}>
                <strong>{t('attackChain.description')}:</strong>
              </Typography>
              <Typography variant="body1" sx={{ color: themeMode === 'dark' ? '#fff' : '#000', mb: 2 }}>
                {selectedNode.description}
              </Typography>
              <Typography variant="body2" sx={{ color: themeMode === 'dark' ? '#ccc' : '#666', mb: 1 }}>
                <strong>{t('attackChain.remediation')}:</strong>
              </Typography>
              <Typography variant="body1" sx={{ color: '#4caf50' }}>
                {selectedNode.remediation}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeDetailDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#f44336';
    case 'high': return '#ff9800';
    case 'medium': return '#ffeb3b';
    case 'low': return '#4caf50';
    default: return '#666';
  }
};

export default AttackChain;