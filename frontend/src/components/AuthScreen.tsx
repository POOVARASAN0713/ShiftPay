import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Phone, DollarSign, Clock, ClipboardList, User as UserIcon } from 'lucide-react';
import type { User } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: User) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [dailySalary, setDailySalary] = useState('');
  const [otRate, setOtRate] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobile || !password) {
      showToast('Please fill in mobile and password', 'error');
      return;
    }

    if (!isLogin && (!name || !dailySalary || !otRate)) {
      showToast('Please fill in name, salary and OT rates', 'error');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { mobile, password }
      : { 
          name,
          mobile, 
          password, 
          dailySalary: parseFloat(dailySalary), 
          otRate: parseFloat(otRate) 
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      showToast(isLogin ? 'Welcome back!' : 'Registration successful!', 'success');
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      showToast(err.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-header">
        <div className="auth-icon-wrapper">
          <ClipboardList size={32} />
        </div>
        <h1 className="auth-title">ShiftPay</h1>
        <p className="auth-subtitle">Attendance & Salary Tracker</p>
      </div>

      <div className="auth-card">
        <h2 style={{ marginBottom: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          {isLogin ? 'Login to your account' : 'Create new account'}
        </h2>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group fade-in">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                  <UserIcon size={18} />
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                <Phone size={18} />
              </span>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '14px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Daily Salary Rate ($)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                    <DollarSign size={18} />
                  </span>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 50"
                    value={dailySalary}
                    onChange={(e) => setDailySalary(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Overtime (OT) Rate Per Hour ($)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                    <Clock size={18} />
                  </span>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 8"
                    value={otRate}
                    onChange={(e) => setOtRate(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: '12px' }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Register Here' : 'Login Here'}
          </button>
        </div>
      </div>
    </div>
  );
};
