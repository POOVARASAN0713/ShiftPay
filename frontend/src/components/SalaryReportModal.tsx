import { FileDown, Calendar } from 'lucide-react';
import type { SalarySummary } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface SalaryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SalarySummary | null;
  mobile: string;
}

export const SalaryReportModal: React.FC<SalaryReportModalProps> = ({
  isOpen,
  onClose,
  summary,
  mobile,
}) => {
  if (!isOpen || !summary) return null;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [99, 102, 241]; // Indigo
    const textColor = [15, 23, 42]; // Dark Slate

    // Title & Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('ShiftPay', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('Attendance & Salary Report', 14, 28);
    
    // Metadata block
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Name: ${summary.name || 'N/A'}`, 14, 36);
    doc.text(`Mobile: ${mobile}`, 14, 42);
    doc.text(`Month: ${summary.month}`, 14, 48);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 14, 54);

    // Summary Card / Header Grid
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 60, 182, 35, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('SUMMARY METRICS', 20, 68);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Working Days: ${summary.totalWorkingDays} days`, 20, 76);
    doc.text(`Leave Days: ${summary.totalLeaveDays} days`, 20, 82);
    doc.text(`OT Hours: ${summary.totalOtHours} hours`, 20, 88);

    doc.text(`Daily Salary Rate: Rs. ${summary.dailySalaryRate.toFixed(2)}`, 110, 76);
    doc.text(`OT Rate Per Hour: Rs. ${summary.otRatePerHour.toFixed(2)}`, 110, 82);

    // Add Net Salary callout
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`Total Salary: Rs. ${summary.finalTotalSalary.toFixed(2)}`, 110, 88);

    // Table of Logs
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(12);
    doc.text('Daily Attendance Log', 14, 106);

    const sortedRecords = [...summary.records].sort((a, b) => a.date.localeCompare(b.date));

    // Map table rows
    const tableRows = sortedRecords.map(r => {
      let dailyWage = 0;
      let workOtText = '-';

      if (r.status === 'Present') {
        dailyWage = summary.dailySalaryRate + (r.otHours * summary.otRatePerHour);
        workOtText = r.otHours > 0 ? `Full Day / +${r.otHours}h OT` : 'Full Day';
      } else if (r.status === 'Half Day') {
        dailyWage = (0.5 * summary.dailySalaryRate) + (r.otHours * summary.otRatePerHour);
        workOtText = r.otHours > 0 ? `Half Day / +${r.otHours}h OT` : 'Half Day';
      } else if (r.status === 'Partial Day') {
        dailyWage = ((r.workedHours / 8) * summary.dailySalaryRate) + (r.otHours * summary.otRatePerHour);
        workOtText = r.otHours > 0 ? `${r.workedHours}h Work / +${r.otHours}h OT` : `${r.workedHours}h Work`;
      } else if (r.status === 'Leave') {
        dailyWage = 0;
        workOtText = 'Leave';
      }

      return [
        r.date,
        r.status,
        workOtText,
        `Rs. ${dailyWage.toFixed(2)}`
      ];
    });

    // AutoTable call
    (doc as any).autoTable({
      startY: 111,
      head: [['Date', 'Status', 'Work / OT Details', 'Calculated Wage']],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 62 },
        3: { cellWidth: 50, halign: 'right' }
      },
      styles: {
        font: 'helvetica',
        fontSize: 9
      }
    });

    doc.save(`Salary_Report_${summary.month}_${mobile}.pdf`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()} style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar className="logo-icon" size={22} />
            <span>Salary Report ({summary.month})</span>
          </div>
          <button 
            className="btn-icon-only" 
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>

        <div className="report-list fade-in">
          <div className="report-row">
            <span className="report-label">Total Working Days</span>
            <span className="report-value">{summary.totalWorkingDays} Days</span>
          </div>

          <div className="report-row">
            <span className="report-label">Total Leave Days</span>
            <span className="report-value">{summary.totalLeaveDays} Days</span>
          </div>

          <div className="report-row">
            <span className="report-label">Total Overtime (OT) Hours</span>
            <span className="report-value">{summary.totalOtHours} Hours</span>
          </div>

          <div className="report-row">
            <span className="report-label">Daily Salary Rate</span>
            <span className="report-value">₹{summary.dailySalaryRate.toFixed(2)}</span>
          </div>

          <div className="report-row">
            <span className="report-label">OT Rate Per Hour</span>
            <span className="report-value">₹{summary.otRatePerHour.toFixed(2)}</span>
          </div>

          <div className="report-row" style={{ marginTop: '10px' }}>
            <span className="report-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Working Salary
            </span>
            <span className="report-value" style={{ color: 'var(--success)' }}>
              ₹{summary.workingSalary.toFixed(2)}
            </span>
          </div>

          <div className="report-row">
            <span className="report-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              OT Salary
            </span>
            <span className="report-value" style={{ color: 'var(--success)' }}>
              ₹{summary.otSalary.toFixed(2)}
            </span>
          </div>

          <div className="report-row highlight">
            <span className="report-label">Final Net Salary</span>
            <span className="report-value">₹{summary.finalTotalSalary.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            type="button" 
            className="btn btn-primary btn-block" 
            onClick={handleExportPDF}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <FileDown size={18} />
            Export Report as PDF
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-block" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
