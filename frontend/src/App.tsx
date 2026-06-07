import React, { useState, useEffect } from 'react';
import { LogOut, Sun, Moon, Settings, DollarSign, Clock, Save, ClipboardCheck } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { DashboardSummary } from './components/DashboardSummary';
import { CalendarView } from './components/CalendarView';
import { SalaryReportModal } from './components/SalaryReportModal';
import { useTheme } from './context/ThemeContext';
import type { User, AttendanceRecord, SalarySummary } from './types';

interface Toast {
  msg: string;
  type: 'success' | 'error';
}

function App() {
  const { theme, toggleTheme } = useTheme();
  
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // Calendar & summary state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<SalarySummary | null>(null);

  // Modals & settings state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editDailySalary, setEditDailySalary] = useState('');
  const [editOtRate, setEditOtRate] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Server network info state
  const [serverInfo, setServerInfo] = useState<{ localIp: string; port: number; url: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<Toast | null>(null);

  // Fetch server network info on mount
  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        const response = await fetch('/api/info');
        if (response.ok) {
          const data = await response.json();
          setServerInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch server info:', err);
      }
    };
    fetchServerInfo();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auth helper
  const handleAuthSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setEditDailySalary(String(newUser.dailySalary));
    setEditOtRate(String(newUser.otRate));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'success');
  };

  // Fetch data
  const fetchData = async () => {
    if (!token || !user) return;

    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const monthString = `${currentDate.getFullYear()}-${mm}`;

    try {
      const response = await fetch(`/api/salary-summary?month=${monthString}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setRecords(data.records);
        setSummary(data);
      } else {
        // Token might be expired
        if (response.status === 401) {
          handleLogout();
        }
        showToast(data.message || 'Error loading dashboard data', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection to server failed', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, currentDate]);

  // Initialize form fields when user profile loads
  useEffect(() => {
    if (user) {
      setEditDailySalary(String(user.dailySalary));
      setEditOtRate(String(user.otRate));
    }
  }, [user]);

  // Mark/Add attendance record
  const handleMarkAttendance = async (
    dateStr: string,
    status: 'Present' | 'Leave' | 'Half Day' | 'Partial Day',
    otHours: number,
    workedHours: number
  ) => {
    if (!token) return;

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: dateStr, status, otHours, workedHours })
      });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Attendance saved', 'success');
        fetchData();
      } else {
        showToast(data.message || 'Failed to save attendance', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  // Clear attendance record
  const handleClearAttendance = async (dateStr: string) => {
    if (!token) return;

    try {
      const response = await fetch('/api/attendance', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: dateStr })
      });
      const data = await response.json();
      if (response.ok) {
        showToast('Record deleted', 'success');
        fetchData();
      } else {
        showToast(data.message || 'Failed to delete record', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  // Update profile rates
  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    setSettingsLoading(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dailySalary: parseFloat(editDailySalary),
          otRate: parseFloat(editOtRate)
        })
      });
      const data = await response.json();
      if (response.ok) {
        const updatedUser = {
          ...user,
          dailySalary: data.dailySalary,
          otRate: data.otRate
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        showToast('Rates updated successfully', 'success');
        setIsSettingsOpen(false);
        fetchData();
      } else {
        showToast(data.message || 'Failed to update rates', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  if (!token || !user) {
    return (
      <>
        {toast && (
          <div className={`toast-msg toast-${toast.type}`}>
            <span>{toast.msg}</span>
          </div>
        )}
        <AuthScreen onAuthSuccess={handleAuthSuccess} showToast={showToast} />
      </>
    );
  }

  const workingDays = summary ? summary.totalWorkingDays : 0;
  const leaveDays = summary ? summary.totalLeaveDays : 0;
  const otHours = summary ? summary.totalOtHours : 0;

  return (
    <div className="app-container">
      {/* Toast notifications */}
      {toast && (
        <div className={`toast-msg toast-${toast.type}`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* App Header */}
      <header className="app-header">
        <div className="logo-container">
          <ClipboardCheck className="logo-icon" size={24} />
          <h1 className="app-title">ShiftPay</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn-icon-only" 
            onClick={toggleTheme}
            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <button 
            className="btn-icon-only" 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            title="Edit Salary Rates"
          >
            <Settings size={18} />
          </button>

          <button 
            className="btn-icon-only" 
            onClick={handleLogout}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Settings Dialog Dropdown */}
      {isSettingsOpen && (
        <div className="settings-menu fade-in">
          <h4 style={{ marginBottom: '12px', fontSize: '0.9rem', fontWeight: 700 }}>Update Salary Configurations</h4>
          <form onSubmit={handleUpdateRates}>
            <div className="form-group">
              <label className="form-label">Daily Salary (₹)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }}>
                  <DollarSign size={14} />
                </span>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem' }}
                  value={editDailySalary}
                  onChange={(e) => setEditDailySalary(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">OT Hourly Rate (₹)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }}>
                  <Clock size={14} />
                </span>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem' }}
                  value={editOtRate}
                  onChange={(e) => setEditOtRate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1 }}
                onClick={() => setIsSettingsOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1, display: 'flex', justifyContent: 'center', gap: '4px' }}
                disabled={settingsLoading}
              >
                <Save size={12} />
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div className="dashboard-top">
          <div className="welcome-msg">
            <h3>Hello, {user.name}!</h3>
            <p className="user-mobile">Mobile: {user.mobile}</p>
          </div>
          <div className="rates-badge">
            <div>Daily: <span>₹{user.dailySalary.toFixed(2)}</span></div>
            <div>OT Rate: <span>₹{user.otRate.toFixed(2)}/hr</span></div>
          </div>
        </div>
        
        {serverInfo && (
          <div className="mobile-connect-card desktop-only">
            <div className="mobile-connect-header">
              <span className="mobile-connect-title">📱 Open on Mobile Device</span>
            </div>
            <div className="mobile-connect-body">
              <div className="qr-container">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(serverInfo.url)}`}
                  alt="Scan to open on mobile" 
                  className="qr-image"
                />
              </div>
              <div className="mobile-connect-instructions">
                <p>Scan this QR code with your phone camera to open ShiftPay on your mobile device instantly.</p>
                <p>Or open your mobile browser and enter: <code className="ip-code">{serverInfo.url}</code></p>
                <p className="pwa-tip">💡 <strong>Tip:</strong> Once opened, add it to your home screen to install it as an app!</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Cards Summary */}
        <DashboardSummary 
          workingDays={workingDays} 
          leaveDays={leaveDays} 
          otHours={otHours} 
        />

        {/* Monthly Interactive Calendar */}
        <CalendarView 
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          records={records}
          onMarkAttendance={handleMarkAttendance}
          onClearAttendance={handleClearAttendance}
        />
      </div>

      {/* Bottom Calculate Action Bar */}
      <div className="action-area">
        <button 
          className="btn btn-primary btn-block"
          style={{ height: '48px', borderRadius: '12px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={() => setIsReportOpen(true)}
        >
          Calculate Salary
        </button>
      </div>

      {/* Salary Breakdown & Export Dialog */}
      <SalaryReportModal 
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        summary={summary}
        mobile={user.mobile}
      />
    </div>
  );
}

export default App;
