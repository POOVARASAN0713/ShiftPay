const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { initDb } = require('./database');
const { authMiddleware, JWT_SECRET } = require('./middleware/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let db;

// Route handler for root status
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Attendance API is running' });
});

// Endpoint to get the server's local network IP address
app.get('/api/info', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIp = 'localhost';
  
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
  }
  
  res.json({
    localIp,
    port: PORT,
    url: `http://${localIp}:${PORT}`
  });
});

// Authentication: Register
app.post('/api/auth/register', async (req, res) => {
  const { name, mobile, password, dailySalary, otRate } = req.body;

  if (!name || !mobile || !password || dailySalary === undefined || otRate === undefined) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE mobile = ?', [mobile]);
    if (existingUser) {
      return res.status(400).json({ message: 'Mobile number already registered' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const result = await db.run(
      'INSERT INTO users (name, mobile, password, daily_salary, ot_rate) VALUES (?, ?, ?, ?, ?)',
      [name, mobile, hashedPassword, parseFloat(dailySalary), parseFloat(otRate)]
    );

    // Generate JWT token
    const token = jwt.sign({ userId: result.lastID }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: result.lastID,
        name,
        mobile,
        dailySalary: parseFloat(dailySalary),
        otRate: parseFloat(otRate)
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Authentication: Login
app.post('/api/auth/login', async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ message: 'Mobile number and password are required' });
  }

  try {
    // Find user
    const user = await db.get('SELECT * FROM users WHERE mobile = ?', [mobile]);
    if (!user) {
      return res.status(400).json({ message: 'Invalid mobile number or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid mobile number or password' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        dailySalary: user.daily_salary,
        otRate: user.ot_rate
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Update Profile Rates (optional but highly useful)
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  const { dailySalary, otRate } = req.body;
  if (dailySalary === undefined || otRate === undefined) {
    return res.status(400).json({ message: 'Daily salary and OT rate are required' });
  }

  try {
    await db.run(
      'UPDATE users SET daily_salary = ?, ot_rate = ? WHERE id = ?',
      [parseFloat(dailySalary), parseFloat(otRate), req.userId]
    );

    res.json({
      message: 'Profile updated successfully',
      dailySalary: parseFloat(dailySalary),
      otRate: parseFloat(otRate)
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Get profile
app.get('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, mobile, daily_salary, ot_rate FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      dailySalary: user.daily_salary,
      otRate: user.ot_rate
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Attendance for a month (format: YYYY-MM)
app.get('/api/attendance', authMiddleware, async (req, res) => {
  const { month } = req.query; // e.g. "2026-06"
  if (!month) {
    return res.status(400).json({ message: 'Month parameter (YYYY-MM) is required' });
  }

  try {
    const records = await db.all(
      "SELECT date, status, ot_hours, worked_hours FROM attendance WHERE user_id = ? AND date LIKE ?",
      [req.userId, `${month}-%`]
    );

    // Convert keys to camelCase for frontend convenience
    const formattedRecords = records.map(r => ({
      date: r.date,
      status: r.status,
      otHours: r.ot_hours,
      workedHours: r.worked_hours
    }));

    res.json(formattedRecords);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error fetching attendance' });
  }
});

// Post / Edit Attendance Record
app.post('/api/attendance', authMiddleware, async (req, res) => {
  const { date, status, otHours, workedHours } = req.body;

  if (!date || !status) {
    return res.status(400).json({ message: 'Date and Status are required' });
  }

  if (status !== 'Present' && status !== 'Leave' && status !== 'Half Day' && status !== 'Partial Day') {
    return res.status(400).json({ message: 'Status must be Present, Leave, Half Day, or Partial Day' });
  }

  const hours = status !== 'Leave' ? parseFloat(otHours || 0) : 0;
  const worked = status === 'Partial Day' ? parseFloat(workedHours || 0) : 0;

  try {
    // SQLite INSERT OR REPLACE
    await db.run(
      `INSERT INTO attendance (user_id, date, status, ot_hours, worked_hours)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
       status = excluded.status,
       ot_hours = excluded.ot_hours,
       worked_hours = excluded.worked_hours`,
      [req.userId, date, status, hours, worked]
    );

    res.json({
      message: 'Attendance recorded successfully',
      record: { date, status, otHours: hours, workedHours: worked }
    });
  } catch (error) {
    console.error('Post attendance error:', error);
    res.status(500).json({ message: 'Server error saving attendance' });
  }
});

// Delete Attendance Record for a specific date
app.delete('/api/attendance', authMiddleware, async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  try {
    await db.run('DELETE FROM attendance WHERE user_id = ? AND date = ?', [req.userId, date]);
    res.json({ message: 'Attendance record cleared' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ message: 'Server error clearing attendance' });
  }
});

// Get detailed Salary Summary and Report
app.get('/api/salary-summary', authMiddleware, async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: 'Month parameter (YYYY-MM) is required' });
  }

  try {
    const user = await db.get('SELECT name, daily_salary, ot_rate FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const records = await db.all(
      "SELECT date, status, ot_hours, worked_hours FROM attendance WHERE user_id = ? AND date LIKE ?",
      [req.userId, `${month}-%`]
    );

    let totalWorkingDays = 0;
    let totalLeaveDays = 0;
    let totalOtHours = 0;

    records.forEach(r => {
      if (r.status === 'Present') {
        totalWorkingDays += 1;
        totalOtHours += r.ot_hours;
      } else if (r.status === 'Half Day') {
        totalWorkingDays += 0.5;
        totalLeaveDays += 0.5;
        totalOtHours += r.ot_hours;
      } else if (r.status === 'Partial Day') {
        totalWorkingDays += r.worked_hours / 8;
        totalLeaveDays += Math.max(0, 1 - (r.worked_hours / 8));
        totalOtHours += r.ot_hours;
      } else if (r.status === 'Leave') {
        totalLeaveDays += 1;
      }
    });

    const dailySalary = user.daily_salary;
    const otRate = user.ot_rate;

    const workingSalary = totalWorkingDays * dailySalary;
    const otSalary = totalOtHours * otRate;
    const finalTotalSalary = workingSalary + otSalary;

    res.json({
      month,
      name: user.name,
      totalWorkingDays,
      totalLeaveDays,
      totalOtHours,
      dailySalaryRate: dailySalary,
      otRatePerHour: otRate,
      workingSalary,
      otSalary,
      finalTotalSalary,
      records: records.map(r => ({
        date: r.date,
        status: r.status,
        otHours: r.ot_hours,
        workedHours: r.worked_hours
      }))
    });
  } catch (error) {
    console.error('Salary summary error:', error);
    res.status(500).json({ message: 'Server error calculating salary summary' });
  }
});

// Serve static assets from frontend build folder in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback all other GET requests to index.html for client-side routing support
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Init DB and Start Server
initDb().then(database => {
  db = database;
  console.log('Database initialized successfully');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
