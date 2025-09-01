import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储的token
    const token = localStorage.getItem('token');
    if (token) {
      // 验证token有效性
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // 这里可以调用API验证token
      // 暂时模拟用户数据
      setUser({
        id: '1',
        username: 'admin',
        email: 'admin@cloudbreach.com',
        role: 'admin'
      });
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // 模拟登录验证 - 支持默认账号
      if (username === 'admin' && password === 'admin123') {
        const mockToken = 'mock-jwt-token-' + Date.now();
        const userData = {
          id: '1',
          username: 'admin',
          email: 'admin@cloudbreach.com',
          role: 'admin'
        };
        
        localStorage.setItem('token', mockToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        setUser(userData);
        return true;
      }
      
      // 其他测试账号
      if (username === 'user' && password === 'user123') {
        const mockToken = 'mock-jwt-token-' + Date.now();
        const userData = {
          id: '2',
          username: 'user',
          email: 'user@cloudbreach.com',
          role: 'user'
        };
        
        localStorage.setItem('token', mockToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        setUser(userData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};