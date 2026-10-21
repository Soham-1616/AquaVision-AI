import React, { useState, useCallback } from 'react';
import {
  Settings, Globe, Sliders, Wifi, WifiOff, Cpu,
  CheckCircle, XCircle, RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getMockCapabilities } from '@/services/adapters/mock-adapter';
import { apiClient } from '@/services/api/api-client';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, isDemo, setIsDemo, backendCapabilities } = useAppStore();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<'success' | 'error' | null>(null);
  const [apiUrl, setApiUrl] = useState(settings.apiBaseUrl);

  const capabilities = isDemo ? getMockCapabilities() : backendCapabilities;

  const handleTestConnection = useCallback(async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      apiClient.setBaseUrl(apiUrl);
      await apiClient.checkHealth();
      setConnectionResult('success');
      setIsDemo(false);
      updateSettings({ apiBaseUrl: apiUrl });
    } catch {
      setConnectionResult('error');
    } finally {
      setTestingConnection(false);
    }
  }, [apiUrl, setIsDemo, updateSettings]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Settings size={22} color="var(--color-text-secondary)" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Configure application preferences, processing defaults, and backend connectivity.
        </p>
      </div>

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* General Settings */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={18} /> General
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label" htmlFor="default-page">Default Analysis Page</label>
              <select
                id="default-page"
                className="input select"
                value={settings.defaultAnalysisPage}
                onChange={(e) => updateSettings({ defaultAnalysisPage: e.target.value })}
              >
                <option value="/image-processing">Image Processing</option>
                <option value="/video-analysis">Video Analysis</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="comparison-mode">Default Image Comparison Mode</label>
              <select
                id="comparison-mode"
                className="input select"
                value={settings.imageComparisonMode}
                onChange={(e) => updateSettings({ imageComparisonMode: e.target.value as 'slider' | 'side-by-side' | 'toggle' })}
              >
                <option value="slider">Slider</option>
                <option value="side-by-side">Side by Side</option>
                <option value="toggle">Toggle</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Show Demo Labels</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Display "Demo" badges on sample data
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                <input
                  type="checkbox"
                  checked={settings.showDemoLabels}
                  onChange={(e) => updateSettings({ showDemoLabels: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                  aria-label="Show demo labels"
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 12,
                  background: settings.showDemoLabels ? 'var(--color-teal-500)' : 'var(--color-surface-300)',
                  transition: 'background 0.2s',
                }}>
                  <span style={{
                    position: 'absolute', height: 18, width: 18, left: settings.showDemoLabels ? 22 : 3, top: 3,
                    background: 'white', borderRadius: '50%', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Processing Preferences */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} /> Processing Preferences
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label" htmlFor="default-enhancement">Default Enhancement Method</label>
              <select
                id="default-enhancement"
                className="input select"
                value={settings.defaultEnhancementMethod}
                onChange={(e) => updateSettings({ defaultEnhancementMethod: e.target.value as 'auto' | 'deep_learning' | 'white_balance' | 'clahe' })}
              >
                <option value="auto">Auto (Backend Default)</option>
                <option value="deep_learning">Deep Learning</option>
                <option value="white_balance">White Balance</option>
                <option value="clahe">CLAHE</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="default-confidence">
                Default Confidence Threshold: {settings.defaultConfidenceThreshold.toFixed(2)}
              </label>
              <input
                id="default-confidence"
                type="range"
                className="range-slider"
                min={0.1}
                max={0.95}
                step={0.05}
                value={settings.defaultConfidenceThreshold}
                onChange={(e) => updateSettings({ defaultConfidenceThreshold: parseFloat(e.target.value) })}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
                <span>0.10 (more detections)</span><span>0.95 (higher confidence)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Backend Connectivity */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {isDemo ? <WifiOff size={18} /> : <Wifi size={18} />} Backend Connectivity
            </h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: isDemo ? '#FEF3C7' : '#DCFCE7' }}>
              <span className={`status-dot ${isDemo ? 'demo' : 'connected'}`} />
              <span style={{ fontWeight: 500, fontSize: 14 }}>
                {isDemo ? 'Demo Mode (Backend Not Connected)' : 'Connected to Backend'}
              </span>
            </div>

            <div>
              <label className="label" htmlFor="api-url">API Base URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="api-url"
                  className="input"
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:8000/api"
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {testingConnection ? (
                    <><span className="spinner spinner-sm" /> Testing...</>
                  ) : (
                    <><RefreshCw size={14} /> Test</>
                  )}
                </button>
              </div>
              {connectionResult === 'success' && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success)', fontSize: 13 }}>
                  <CheckCircle size={14} /> Connection successful!
                </div>
              )}
              {connectionResult === 'error' && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-error)', fontSize: 13 }}>
                  <XCircle size={14} /> Connection failed. Verify the URL and ensure the backend is running.
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 12px', borderRadius: 6, background: 'var(--color-surface-50)' }}>
              The backend is expected at <code style={{ fontFamily: 'var(--font-mono)' }}>{apiUrl}</code>.
              In demo mode, all processing uses simulated data and no real inference occurs.
            </div>
          </div>
        </div>

        {/* Model Capabilities */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={18} /> Model Capabilities
            </h2>
          </div>
          <div className="card-body" style={{ fontSize: 13 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>Enhancement Models</div>
                {capabilities.enhancementModels.length > 0 ? (
                  capabilities.enhancementModels.map((m) => (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span className={`status-dot ${isDemo ? 'demo' : 'connected'}`} />
                      <span>{m}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>No models available</span>
                )}
              </div>
              <div>
                <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>Detection Models</div>
                {capabilities.detectionModels.length > 0 ? (
                  capabilities.detectionModels.map((m) => (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span className={`status-dot ${isDemo ? 'demo' : 'connected'}`} />
                      <span>{m}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>No models available</span>
                )}
              </div>
              <div>
                <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>Supported Classes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {capabilities.supportedClasses.length > 0 ? (
                    capabilities.supportedClasses.map((c) => (
                      <span key={c} className="badge badge-neutral" style={{ fontSize: 11 }}>{c}</span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>No class metadata available</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>Version</div>
                <span>{capabilities.version ?? 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
