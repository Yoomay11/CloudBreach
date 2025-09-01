import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理token过期
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
};

// IaC扫描相关API
export const iacAPI = {
  scan: async (formData: FormData) => {
    const response = await api.post('/iac/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getScanResult: async (scanId: string) => {
    const response = await api.get(`/iac/scan/${scanId}`);
    return response.data;
  },
  
  listScans: async (limit = 10, offset = 0) => {
    const response = await api.get(`/iac/scans?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  
  uploadConfig: async (formData: FormData) => {
    const response = await api.post('/iac/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// eBPF监控相关API
export const monitorAPI = {
  getStatus: async () => {
    const response = await api.get('/monitor/status');
    return response.data;
  },
  
  getEvents: async (limit = 100) => {
    const response = await api.get(`/monitor/events?limit=${limit}`);
    return response.data;
  },
  
  streamEvents: async () => {
    const response = await api.get('/monitor/events/stream');
    return response.data;
  },
};

// 攻击链分析相关API
export const attackAPI = {
  analyze: async (name: string, type: string = 'full') => {
    const response = await api.post('/attack/analyze', { name, type });
    return response.data;
  },
  
  getChain: async (chainId: string) => {
    const response = await api.get(`/attack/chain/${chainId}`);
    return response.data;
  },
  
  listChains: async () => {
    const response = await api.get('/attack/chains');
    return response.data;
  },
};

// 修复建议相关API
export const remediationAPI = {
  generate: async (vulnId: string, filePath: string, lineNumber?: number) => {
    const response = await api.post('/remediation/generate', {
      vuln_id: vulnId,
      file_path: filePath,
      line_number: lineNumber,
    });
    return response.data;
  },
  
  apply: async (suggestionId: string) => {
    const response = await api.post('/remediation/apply', {
      suggestion_id: suggestionId,
    });
    return response.data;
  },
  
  getSuggestion: async (suggestionId: string) => {
    const response = await api.get(`/remediation/suggestions/${suggestionId}`);
    return response.data;
  },
  
  listSuggestions: async () => {
    const response = await api.get('/remediation/suggestions');
    return response.data;
  },
};

// 云API集成相关API
export const cloudAPI = {
  getAWSResources: async (type?: string) => {
    const url = type ? `/cloud/aws/resources?type=${type}` : '/cloud/aws/resources';
    const response = await api.get(url);
    return response.data;
  },
  
  getAzureResources: async (type?: string) => {
    const url = type ? `/cloud/azure/resources?type=${type}` : '/cloud/azure/resources';
    const response = await api.get(url);
    return response.data;
  },
  
  syncResources: async () => {
    const response = await api.post('/cloud/sync');
    return response.data;
  },
  
  getResourceContext: async (resourceId: string, provider = 'aws') => {
    const response = await api.get(`/cloud/resources/context/${resourceId}?provider=${provider}`);
    return response.data;
  },
  
  getSecurityPosture: async () => {
    const response = await api.get('/cloud/security/posture');
    return response.data;
  },
  
  exportResources: async (format = 'json') => {
    const response = await api.get(`/cloud/resources/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// 报告和可视化相关API
export const reportsAPI = {
  getDashboardData: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },
  
  exportReport: async (reportId: string) => {
    const response = await api.get(`/reports/export/${reportId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  getMetrics: async () => {
    const response = await api.get('/reports/metrics');
    return response.data;
  },
};

// WebSocket连接
export const createWebSocketConnection = (onMessage: (data: any) => void) => {
  const wsUrl = API_BASE_URL.replace('http', 'ws').replace('/api/v1', '/ws');
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket连接已建立');
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket错误:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket连接已关闭');
  };
  
  return ws;
};

// 健康检查
export const healthCheck = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;