// API Configuration
// In Electron/production, use localhost, in dev use relative path

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const isProduction = import.meta.env.PROD;

// For Electron app, backend runs on localhost:3102
// For browser dev, use vite proxy
// For browser prod, also use localhost
const API_BASE = isProduction || isElectron
  ? 'http://localhost:3102'
  : '';

export const api = {
  async get(endpoint: string) {
    const res = await fetch(`${API_BASE}/api/v1${endpoint}`);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API error: ${res.status}${body ? ` - ${body}` : ''}`);
    }
    return res.json();
  },

  async post(endpoint: string, data: any) {
    const res = await fetch(`${API_BASE}/api/v1${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API error: ${res.status}${body ? ` - ${body}` : ''}`);
    }
    return res.json();
  },

  async put(endpoint: string, data: any) {
    const res = await fetch(`${API_BASE}/api/v1${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API error: ${res.status}${body ? ` - ${body}` : ''}`);
    }
    return res.json();
  },

  async delete(endpoint: string) {
    const res = await fetch(`${API_BASE}/api/v1${endpoint}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API error: ${res.status}${body ? ` - ${body}` : ''}`);
    }
    return res.json();
  },
};