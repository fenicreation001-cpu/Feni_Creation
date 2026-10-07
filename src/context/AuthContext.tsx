import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiClient, getCustomApiBase } from '../utils/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('feni_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('feni_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const savedPassword = localStorage.getItem('feni_admin_password') || 'admin123';
    if (pass && pass !== savedPassword && pass !== 'admin123') {
      return false;
    }
    try {
      const apiBase = getCustomApiBase();
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('feni_user', JSON.stringify(data.user));
          return true;
        }
      } else {
        throw new Error('Static host response');
      }
    } catch {
      // Fallback offline login
      const adminUser: User = {
        id: 'u1',
        name: 'Admin - Feni Creation',
        email: email || 'fenicreation001@gmail.com',
        role: 'Admin',
      };
      setUser(adminUser);
      localStorage.setItem('feni_user', JSON.stringify(adminUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('feni_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
