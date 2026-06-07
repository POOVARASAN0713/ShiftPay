export interface User {
  id: number;
  name: string;
  mobile: string;
  dailySalary: number;
  otRate: number;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Leave' | 'Half Day' | 'Partial Day';
  otHours: number;
  workedHours: number;
}

export interface SalarySummary {
  month: string; // YYYY-MM
  name: string;
  totalWorkingDays: number;
  totalLeaveDays: number;
  totalOtHours: number;
  dailySalaryRate: number;
  otRatePerHour: number;
  workingSalary: number;
  otSalary: number;
  finalTotalSalary: number;
  records: AttendanceRecord[];
}
