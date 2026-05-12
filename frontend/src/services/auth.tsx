import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any;
  organizationId: string;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, orgName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Use localhost for file:// protocol, relative for HTTP
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const API_URL = isFileProtocol ? 'http://localhost:3102/api/v1' : '/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string>('');

  useEffect(() => {
    // Load from localStorage
    const savedUser = localStorage.getItem('stradex_user');
    const savedOrg = localStorage.getItem('stradex_org');
    if (savedUser && savedOrg) {
      setUser(JSON.parse(savedUser));
      setOrganizationId(savedOrg);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error('Login failed');

    const data = await res.json();
    setUser(data.user);
    setOrganizationId(data.user.organizationId);
    localStorage.setItem('stradex_user', JSON.stringify(data.user));
    localStorage.setItem('stradex_org', data.user.organizationId);
  }

  async function register(email: string, password: string, orgName: string) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, organizationName: orgName }),
    });

    if (!res.ok) throw new Error('Registration failed');

    const data = await res.json();
    setUser(data.user);
    setOrganizationId(data.user.organizationId);
    localStorage.setItem('stradex_user', JSON.stringify(data.user));
    localStorage.setItem('stradex_org', data.user.organizationId);
  }

  function logout() {
    setUser(null);
    setOrganizationId('');
    localStorage.removeItem('stradex_user');
    localStorage.removeItem('stradex_org');
  }

  return (
    <AuthContext.Provider value={{
      user,
      organizationId,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Initialize default organization if needed
export async function ensureDefaultOrg(): Promise<string> {
  const savedOrg = localStorage.getItem('stradex_org');
  if (savedOrg) return savedOrg;

  // Create default org
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@stradex.local',
      password: 'admin123',
      organizationName: 'Моя парковка',
    }),
  });

  if (res.ok) {
    const data = await res.json();
    localStorage.setItem('stradex_user', JSON.stringify(data.user));
    localStorage.setItem('stradex_org', data.user.organizationId);
    return data.user.organizationId;
  }

  return 'default';
}