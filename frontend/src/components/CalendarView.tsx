import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Trash2, Clock, CircleDot, Timer } from 'lucide-react';
import type { AttendanceRecord } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  records: AttendanceRecord[];
  onMarkAttendance: (
    dateString: string,
    status: 'Present' | 'Leave' | 'Half Day' | 'Partial Day',
    otHours: number,
    workedHours: number
  ) => Promise<void>;
  onClearAttendance: (dateString: string) => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  onDateChange,
  records,
  onMarkAttendance,
  onClearAttendance,
}) => {
  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'Present' | 'Leave' | 'Half Day' | 'Partial Day'>('Present');
  const [editOtHours, setEditOtHours] = useState<string>('0');
  const [editWorkedHours, setEditWorkedHours] = useState<string>('8');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get days in the month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  // Previous month days to display
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const formatDateString = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const getDayRecord = (day: number) => {
    const dateStr = formatDateString(day);
    return records.find(r => r.date === dateStr);
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatDateString(day);
    const existing = records.find(r => r.date === dateStr);
    
    setSelectedDayString(dateStr);
    setEditStatus(existing ? existing.status : 'Present');
    setEditOtHours(existing ? String(existing.otHours) : '0');
    setEditWorkedHours(existing && existing.workedHours ? String(existing.workedHours) : '8');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDayString) return;
    await onMarkAttendance(
      selectedDayString, 
      editStatus, 
      editStatus !== 'Leave' ? parseFloat(editOtHours || '0') : 0,
      editStatus === 'Partial Day' ? parseFloat(editWorkedHours || '8') : 0
    );
    setIsModalOpen(false);
  };

  const handleClear = async () => {
    if (!selectedDayString) return;
    await onClearAttendance(selectedDayString);
    setIsModalOpen(false);
  };

  // Generate cells
  const dayCells = [];
  
  // Leading empty days (from prev month)
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDay = prevMonthTotalDays - i;
    dayCells.push(
      <div key={`prev-${prevDay}`} className="calendar-day-cell other-month">
        {prevDay}
      </div>
    );
  }

  // Days in current month
  for (let d = 1; d <= totalDays; d++) {
    const record = getDayRecord(d);
    const dateStr = formatDateString(d);
    const isSelected = selectedDayString === dateStr;

    let cellClass = 'calendar-day-cell unmarked';
    if (record) {
      if (record.status === 'Present') cellClass = 'calendar-day-cell present';
      else if (record.status === 'Leave') cellClass = 'calendar-day-cell leave';
      else if (record.status === 'Half Day') cellClass = 'calendar-day-cell half-day';
      else if (record.status === 'Partial Day') cellClass = 'calendar-day-cell partial-day';
    }
    if (isSelected) cellClass += ' selected';

    dayCells.push(
      <div 
        key={`day-${d}`} 
        className={cellClass}
        onClick={() => handleDayClick(d)}
      >
        <span>{d}</span>
        {record && record.status === 'Partial Day' && (
          <span className="ot-badge" style={{ backgroundColor: 'var(--primary)', bottom: record.otHours > 0 ? '12px' : '2px', fontSize: '0.55rem' }}>
            {record.workedHours}h
          </span>
        )}
        {record && record.status !== 'Leave' && record.otHours > 0 && (
          <span className="ot-badge">+{record.otHours}h</span>
        )}
      </div>
    );
  }

  // Trailing empty days (from next month)
  const totalCellsWritten = firstDayIndex + totalDays;
  const trailingDays = totalCellsWritten % 7 === 0 ? 0 : 7 - (totalCellsWritten % 7);
  for (let i = 1; i <= trailingDays; i++) {
    dayCells.push(
      <div key={`next-${i}`} className="calendar-day-cell other-month">
        {i}
      </div>
    );
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="calendar-wrapper fade-in">
      <div className="calendar-header">
        <button className="btn-icon-only" onClick={handlePrevMonth}>
          <ChevronLeft size={20} />
        </button>
        <div className="calendar-month-title">
          {monthNames[month]} {year}
        </div>
        <button className="btn-icon-only" onClick={handleNextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-grid-weekdays">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="calendar-grid-days">
        {dayCells}
      </div>

      {isModalOpen && selectedDayString && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Mark Attendance</div>
              <button 
                className="btn-icon-only" 
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="date-selector-modal">
              {new Date(selectedDayString).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>

            <div className="status-picker" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid' }}>
              <div 
                className={`status-option present-opt ${editStatus === 'Present' ? 'selected' : ''}`}
                onClick={() => setEditStatus('Present')}
              >
                <CheckCircle size={22} />
                <span style={{ fontSize: '0.8rem' }}>Present</span>
              </div>
              <div 
                className={`status-option half-day-opt ${editStatus === 'Half Day' ? 'selected' : ''}`}
                onClick={() => setEditStatus('Half Day')}
              >
                <CircleDot size={22} />
                <span style={{ fontSize: '0.8rem' }}>Half Day</span>
              </div>
              <div 
                className={`status-option partial-day-opt ${editStatus === 'Partial Day' ? 'selected' : ''}`}
                onClick={() => setEditStatus('Partial Day')}
              >
                <Timer size={22} />
                <span style={{ fontSize: '0.8rem' }}>Partial Day</span>
              </div>
              <div 
                className={`status-option leave-opt ${editStatus === 'Leave' ? 'selected' : ''}`}
                onClick={() => setEditStatus('Leave')}
              >
                <XCircle size={22} />
                <span style={{ fontSize: '0.8rem' }}>Leave</span>
              </div>
            </div>

            {editStatus === 'Partial Day' && (
              <div className="form-group fade-in" style={{ marginBottom: '20px' }}>
                <label className="form-label">Regular Worked Hours (1 to 8)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                    <Timer size={18} />
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="8"
                    className="form-input"
                    placeholder="Worked hours (e.g. 5)"
                    value={editWorkedHours}
                    onChange={(e) => setEditWorkedHours(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>
            )}

            {editStatus !== 'Leave' && (
              <div className="form-group fade-in" style={{ marginBottom: '20px' }}>
                <label className="form-label">Overtime Hours (OT)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }}>
                    <Clock size={18} />
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    className="form-input"
                    placeholder="Enter OT hours (e.g. 2)"
                    value={editOtHours}
                    onChange={(e) => setEditOtHours(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleClear}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', border: '1px solid var(--danger)' }}
              >
                <Trash2 size={16} />
                Clear
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSave}
                style={{ flex: 1 }}
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
