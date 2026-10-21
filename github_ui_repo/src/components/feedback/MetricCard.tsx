import React from 'react';
import { HelpCircle } from 'lucide-react';
import { formatMetric } from '@/utils';

interface MetricCardProps {
  label: string;
  value: number | null | undefined;
  unit?: string;
  decimals?: number;
  description?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | null;
  size?: 'default' | 'small';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit = '',
  decimals = 2,
  description,
  icon,
  size = 'default',
}) => {
  const displayValue = formatMetric(value, decimals);
  const isAvailable = value !== null && value !== undefined;

  return (
    <div className="metric-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="metric-label">{label}</div>
        {description && (
          <div className="tooltip-wrapper">
            <HelpCircle size={14} color="var(--color-text-muted)" />
            <div className="tooltip-content" style={{ maxWidth: 240, whiteSpace: 'normal', textAlign: 'left' }}>
              {description}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        <span className={`metric-value ${size === 'small' ? 'small' : ''}`}
          style={{ color: isAvailable ? undefined : 'var(--color-text-muted)' }}
        >
          {displayValue}
        </span>
        {isAvailable && unit && (
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{unit}</span>
        )}
      </div>
      {!isAvailable && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Requires actual model processing
        </div>
      )}
    </div>
  );
};

// --- Stat Card (for dashboard overview) ---
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'var(--color-teal-500)', subtitle }) => (
  <div className="metric-card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color }}>{icon}</span>
    </div>
    <div>
      <div className="metric-label">{label}</div>
      <div className="metric-value small">{value}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  </div>
);
