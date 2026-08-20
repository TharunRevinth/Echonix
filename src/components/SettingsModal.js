import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const SettingsModal = ({ isOpen, onClose }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [credentials, setCredentials] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load current server URL
      const savedUrl = localStorage.getItem('echonixServerUrl') || '';
      setServerUrl(savedUrl);
      setStatus({ type: '', message: '' });
      setCredentials('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testConnection = async () => {
    if (!serverUrl) {
      setStatus({ type: 'error', message: 'Please enter a server URL first.' });
      return;
    }

    setTesting(true);
    setStatus({ type: '', message: '' });
    
    // Trim trailing slash for consistency
    const formattedUrl = serverUrl.replace(/\/+$/, '');

    try {
      // Test connection to backend endpoint
      const res = await axios.get(`${formattedUrl}/api/trending-tracks`, { timeout: 8000 });
      if (res.status === 200) {
        setStatus({ type: 'success', message: 'Successfully connected to Echonix server!' });
      } else {
        setStatus({ type: 'error', message: `Connected, but received status code ${res.status}.` });
      }
    } catch (err) {
      console.error('Connection test failed:', err);
      setStatus({ 
        type: 'error', 
        message: 'Failed to connect. Make sure your server is running, on the same network, and CORS is enabled.' 
      });
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setStatus({ type: '', message: '' });

    // Clean up server URL
    const formattedUrl = serverUrl.trim().replace(/\/+$/, '');

    try {
      // Save server URL to localStorage
      if (formattedUrl) {
        localStorage.setItem('echonixServerUrl', formattedUrl);
      } else {
        localStorage.removeItem('echonixServerUrl');
      }

      // If credentials (headers or browser.json) are provided, upload them to the server
      if (credentials.trim()) {
        const targetUrl = formattedUrl || 'http://localhost:5001';
        
        setStatus({ type: 'info', message: 'Saving server URL and uploading credentials...' });
        
        const res = await axios.post(`${targetUrl}/api/ytmusic/setup`, {
          headers_raw: credentials.trim()
        }, { timeout: 10000 });

        if (res.data && res.data.success) {
          setStatus({ 
            type: 'success', 
            message: 'Settings saved & YouTube Music credentials updated! Reloading...' 
          });
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        } else {
          throw new Error(res.data?.error || 'Failed to update credentials');
        }
      }

      // If no credentials, just save server URL and reload
      setStatus({ type: 'success', message: 'Settings saved! Reloading...' });
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error('Failed to save settings:', err);
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.error || err.message || 'Failed to save settings. Please verify server status.' 
      });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
      <div className="relative w-full max-w-md bg-bg-highlight border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Backend Server Connection</h3>
            <p className="text-xs text-text-subdued mt-0.5">Configure Echonix backend and authentication</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-text-subdued hover:text-white hover:bg-white/5 transition-all"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Server URL Config */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-subdued uppercase tracking-wider">
              Echonix Server URL
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="e.g. http://192.168.1.5:5001"
                className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accent-purple/50 focus:bg-white/[0.05] transition-all"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={saving}
              />
              <button 
                type="button"
                onClick={testConnection}
                disabled={testing || saving}
                className="px-4 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </button>
            </div>
            <p className="text-[11px] text-text-subdued leading-relaxed">
              If Echonix is running on your computer, use your local IP address (e.g. <code>http://192.168.1.5:5001</code>) so your mobile device can connect to it. Keep empty for default (localhost).
            </p>
          </div>

          {/* YTMusic Credentials Config */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-subdued uppercase tracking-wider">
              YouTube Music Credentials (Optional)
            </label>
            <textarea 
              rows="5"
              placeholder="Paste raw request headers or contents of browser.json here..."
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-accent-purple/50 focus:bg-white/[0.05] transition-all resize-none"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              disabled={saving}
            />
            <p className="text-[11px] text-text-subdued leading-relaxed">
              Paste your account request headers (copied from browser dev tools) to authenticate your personal playlists and history. Credentials will be securely saved to your server's <code>browser.json</code>.
            </p>
          </div>

          {/* Status Messages */}
          {status.message && (
            <div className={`p-4 rounded-xl flex gap-3 text-sm leading-relaxed ${
              status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
              status.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
              'bg-blue-500/10 border border-blue-500/20 text-blue-400'
            }`}>
              {status.type === 'success' ? (
                <Check className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span>{status.message}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-subdued hover:text-white transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-accent-purple text-sm font-bold text-white hover:bg-accent-purple/90 shadow-glow-purple transition-all flex items-center gap-2"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            Save & Connect
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
