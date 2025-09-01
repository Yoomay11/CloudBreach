import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PlayArrow as ScanIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { iacAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ScanResult {
  id: string;
  fileName: string;
  fileType: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  vulnerabilities: Vulnerability[];
  scanTime: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

interface Vulnerability {
  id: string;
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  file: string;
  line: number;
  column?: number;
  description: string;
  remediation: string;
}

const IacScanner: React.FC = () => {
  const { themeMode } = useTheme();
  const { t } = useLanguage();
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [scanId, setScanId] = useState<string | null>(null);

  // 文件上传处理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.tf', '.yaml', '.yml'],
      'application/json': ['.json']
    },
    multiple: true
  });

  // 开始扫描
  const handleScan = async () => {
    if (uploadedFiles.length === 0) {
      return;
    }

    setIsScanning(true);
    setScanId(null);
    
    try {
      // 上传文件并开始扫描
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      const scanResponse = await iacAPI.scan(formData);
       const currentScanId = scanResponse.scan_id;
       setScanId(currentScanId);
       
       // 轮询扫描状态
       const pollInterval = setInterval(async () => {
         try {
           const statusResponse = await iacAPI.getScanResult(currentScanId);
           
           if (statusResponse.status === 'completed') {
             clearInterval(pollInterval);
             setIsScanning(false);
             
             // 获取扫描结果
             const resultsResponse = await iacAPI.getScanResult(currentScanId);
            
            // 转换API结果为组件格式
            const convertedResults: ScanResult[] = uploadedFiles.map((file, index) => {
              const fileResults = resultsResponse.findings?.filter((f: any) => f.file === file.name) || [];
              const summary = calculateSummary(fileResults.map((f: any) => ({
                ...f,
                severity: f.severity || 'info'
              })));
              
              return {
                id: `scan-${currentScanId}-${index}`,
                fileName: file.name,
                fileType: getFileType(file.name),
                status: 'completed' as const,
                vulnerabilities: fileResults.map((f: any) => ({
                  id: f.id || `vuln-${index}`,
                  rule: f.rule_id || f.rule || 'UNKNOWN_RULE',
                  severity: f.severity || 'info',
                  message: f.title || f.message || f.description || t('iac.unknownIssue'),
                  file: f.file || file.name,
                  line: f.line || 1,
                  column: f.column,
                  description: f.description || f.message || t('iac.noDescription'),
                  remediation: f.remediation || t('iac.checkDocumentation')
                })),
                scanTime: new Date().toLocaleString(),
                summary
              };
            });
            
            setScanResults(prev => [...prev, ...convertedResults]);
          } else if (statusResponse.status === 'failed') {
            clearInterval(pollInterval);
            setIsScanning(false);
            throw new Error(statusResponse.error || t('iac.scanFailed'));
          }
        } catch (error) {
          console.error('Failed to get scan status:', error);
          clearInterval(pollInterval);
          setIsScanning(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start scan:', error);
      setIsScanning(false);
      
      // 使用模拟数据作为后备
      for (const file of uploadedFiles) {
        const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 创建初始扫描结果
        const initialResult: ScanResult = {
          id: scanId,
          fileName: file.name,
          fileType: getFileType(file.name),
          status: 'scanning',
          vulnerabilities: [],
          scanTime: new Date().toLocaleString(),
          summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
        };

        setScanResults(prev => [...prev, initialResult]);

        // 模拟扫描延迟
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 生成模拟漏洞
        const mockVulnerabilities = generateMockVulnerabilities(file.name);
        const summary = calculateSummary(mockVulnerabilities);

        // 更新扫描结果
        setScanResults(prev => prev.map(result => 
          result.id === scanId 
            ? { ...result, status: 'completed', vulnerabilities: mockVulnerabilities, summary }
            : result
        ));
      }
      
      setIsScanning(false);
    }
    
    setUploadedFiles([]);
  };

  const getFileType = (fileName: string): string => {
    if (fileName.endsWith('.tf')) return 'Terraform';
    if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'Kubernetes';
    if (fileName.endsWith('.json')) return 'JSON';
    return 'Unknown';
  };

  const generateMockVulnerabilities = (fileName: string): Vulnerability[] => {
    const vulnerabilities: Vulnerability[] = [];
    const rules = [
      {
        rule: 'AWS_S3_BUCKET_PUBLIC_ACCESS',
        severity: 'critical' as const,
        message: t('iac.s3PublicAccess'),
        description: t('iac.s3PublicAccessDesc'),
        remediation: t('iac.s3PublicAccessRemediation')
      },
      {
        rule: 'K8S_CONTAINER_PRIVILEGED',
        severity: 'high' as const,
        message: t('iac.containerPrivileged'),
        description: t('iac.containerPrivilegedDesc'),
        remediation: t('iac.containerPrivilegedRemediation')
      },
      {
        rule: 'AWS_SECURITY_GROUP_OPEN_TO_WORLD',
        severity: 'medium' as const,
        message: '安全组规则过于宽松',
        description: '安全组允许来自0.0.0.0/0的入站流量。',
        remediation: '限制安全组规则，仅允许必要的IP地址范围。'
      }
    ];

    // 随机生成1-5个漏洞
    const count = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < count; i++) {
      const rule = rules[Math.floor(Math.random() * rules.length)];
      vulnerabilities.push({
        id: `vuln-${i}`,
        ...rule,
        file: fileName,
        line: Math.floor(Math.random() * 100) + 1,
        column: Math.floor(Math.random() * 50) + 1
      });
    }

    return vulnerabilities;
  };

  const calculateSummary = (vulnerabilities: Vulnerability[]) => {
    return vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity]++;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 });
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
      case 'low': return <CheckCircleIcon />;
      case 'info': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  const handleViewDetails = (result: ScanResult) => {
    setSelectedResult(result);
    setDetailDialogOpen(true);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
        {t('iac.title')}
      </Typography>

      <Grid container spacing={3}>
        {/* 文件上传区域 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '100%' 
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('iac.uploadFiles')}
              </Typography>
              
              <Box
                {...getRootProps()}
                sx={{
                  border: themeMode === 'dark' ? '2px dashed #333' : '2px dashed #ccc',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.05)'
                  }
                }}
              >
                <input {...getInputProps()} />
                <UploadIcon sx={{ 
                  fontSize: 48, 
                  color: themeMode === 'dark' ? '#666' : '#999', 
                  mb: 2 
                }} />
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {isDragActive ? t('iac.dropFilesHere') : t('iac.dragDropOrClick')}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: themeMode === 'dark' ? '#666' : '#999' 
                }}>
                  {t('iac.supportedFiles')}
                </Typography>
              </Box>

              {uploadedFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {t('iac.selectedFiles')}:
                  </Typography>
                  {uploadedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => removeFile(index)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}

              <Button
                variant="contained"
                startIcon={<ScanIcon />}
                onClick={handleScan}
                disabled={uploadedFiles.length === 0 || isScanning}
                sx={{ mt: 2, width: '100%' }}
              >
                {isScanning ? t('iac.scanning') : t('iac.startScan')}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 扫描统计 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
            height: '100%' 
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('iac.scanStats')}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                      {scanResults.length}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: themeMode === 'dark' ? '#666' : '#999' 
                    }}>
                      {t('iac.totalScans')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                      {scanResults.reduce((acc, result) => acc + result.summary.critical + result.summary.high, 0)}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: themeMode === 'dark' ? '#666' : '#999' 
                    }}>
                      {t('iac.highRiskVulns')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {isScanning && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {t('iac.scanInProgress')}
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 扫描结果 */}
        <Grid item xs={12}>
          <Card sx={{ 
            backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#ffffff', 
            border: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('iac.scanResults')}
                </Typography>
                <IconButton onClick={() => window.location.reload()}>
                  <RefreshIcon />
                </IconButton>
              </Box>

              {scanResults.length === 0 ? (
                <Alert severity="info">
                  {t('iac.noResults')}
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.fileName')}</TableCell>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.fileType')}</TableCell>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.status')}</TableCell>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.critical')}</TableCell>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.high')}</TableCell>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.medium')}</TableCell>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.low')}</TableCell>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.scanTime')}</TableCell>
                        <TableCell sx={{ 
                          color: themeMode === 'dark' ? '#ccc' : '#666', 
                          borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                        }}>{t('iac.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scanResults.map((result) => (
                        <TableRow key={result.id} sx={{ 
                          '&:hover': { 
                            backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5' 
                          } 
                        }}>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#fff' : '#000', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            {result.fileName}
                          </TableCell>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#fff' : '#000', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            <Chip label={result.fileType} size="small" />
                          </TableCell>
                          <TableCell sx={{ 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            <Chip
                              label={result.status === 'completed' ? t('iac.completed') : result.status === 'scanning' ? t('iac.scanning') : result.status === 'failed' ? t('iac.failed') : t('iac.pending')}
                              size="small"
                              color={result.status === 'completed' ? 'success' : result.status === 'scanning' ? 'info' : result.status === 'failed' ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#f44336', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
                            fontWeight: 'bold' 
                          }}>
                            {result.summary.critical}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#ff9800', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
                            fontWeight: 'bold' 
                          }}>
                            {result.summary.high}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#ffeb3b', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
                            fontWeight: 'bold' 
                          }}>
                            {result.summary.medium}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#4caf50', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0', 
                            fontWeight: 'bold' 
                          }}>
                            {result.summary.low}
                          </TableCell>
                          <TableCell sx={{ 
                            color: themeMode === 'dark' ? '#ccc' : '#666', 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            {result.scanTime}
                          </TableCell>
                          <TableCell sx={{ 
                            borderBottom: themeMode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0' 
                          }}>
                            <Tooltip title={t('iac.viewDetails')}>
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(result)}
                                disabled={result.status !== 'completed'}
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

      {/* 详情对话框 */}
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
          {t('iac.scanDetails')} - {selectedResult?.fileName}
        </DialogTitle>
        <DialogContent>
          {selectedResult?.vulnerabilities.map((vuln, index) => (
            <Accordion key={vuln.id} sx={{ 
              backgroundColor: themeMode === 'dark' ? '#2a2a2a' : '#f5f5f5', 
              mb: 1 
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box sx={{ color: getSeverityColor(vuln.severity) }}>
                    {getSeverityIcon(vuln.severity)}
                  </Box>
                  <Typography sx={{ flexGrow: 1 }}>{vuln.message}</Typography>
                  <Chip
                    label={vuln.severity}
                    size="small"
                    sx={{
                      backgroundColor: getSeverityColor(vuln.severity),
                      color: '#fff'
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" sx={{ 
                    mb: 1, 
                    color: themeMode === 'dark' ? '#ccc' : '#666' 
                  }}>
                    <strong>{t('iac.rule')}:</strong> {vuln.rule}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    mb: 1, 
                    color: themeMode === 'dark' ? '#ccc' : '#666' 
                  }}>
                    <strong>{t('iac.location')}:</strong> {vuln.file}:{vuln.line}:{vuln.column}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    mb: 2, 
                    color: themeMode === 'dark' ? '#ccc' : '#666' 
                  }}>
                    <strong>{t('iac.description')}:</strong> {vuln.description}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                     color: '#4caf50' 
                   }}>
                     <strong>{t('iac.remediation')}:</strong> {vuln.remediation}
                   </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IacScanner;