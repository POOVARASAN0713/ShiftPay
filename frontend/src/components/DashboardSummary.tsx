import React from 'react';
import { Briefcase, LogOut, Clock } from 'lucide-react';

interface DashboardSummaryProps {
  workingDays: number;
  leaveDays: number;
  otHours: number;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  workingDays,
  leaveDays,
  otHours,
}) => {
  return (
    <div className="summary-container fade-in">
      <div className="summary-card">
        <div className="summary-icon-wrapper" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
          <Briefcase size={18} />
        </div>
        <div className="summary-value">{workingDays}</div>
        <div className="summary-label">Working Days</div>
      </div>

      <div className="summary-card">
        <div className="summary-icon-wrapper" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
          <LogOut size={18} />
        </div>
        <div className="summary-value">{leaveDays}</div>
        <div className="summary-label">Leave Days</div>
      </div>

      <div className="summary-card">
        <div className="summary-icon-wrapper" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
          <Clock size={18} />
        </div>
        <div className="summary-value">{otHours}</div>
        <div className="summary-label">OT Hours</div>
      </div>
    </div>
  );
};
