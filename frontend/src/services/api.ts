// API Configuration
// When served from file:// (Electron) - use localhost
// When served from HTTP - use relative paths

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

// For Electron (file://), backend runs on localhost:3102
// For HTTP (dev or production), use relative path
const API_BASE = isFileProtocol ? 'http://localhost:3102' : '';

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