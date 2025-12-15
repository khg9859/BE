const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 회원의 출석 기록 조회
router.get('/:memberId', async (req, res) => {
  try {
    const [attendance] = await pool.query(
      'SELECT * FROM Attendance WHERE member_id = ? ORDER BY entered_at DESC',
      [req.params.memberId]
    );
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출석 체크 (입장)
router.post('/check-in', async (req, res) => {
  try {
    const { member_id, attendance_type } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Attendance (member_id, entered_at, attendance_type) VALUES (?, NOW(), ?)',
      [member_id, attendance_type || '헬스장']
    );
    res.status(201).json({
      attendance_id: result.insertId,
      message: '입장 체크 완료!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 퇴장 체크
router.put('/check-out/:attendanceId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Attendance SET left_at = NOW() WHERE attendance_id = ?',
      [req.params.attendanceId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '출석 기록을 찾을 수 없습니다.' });
    }
    res.json({ message: '퇴장 체크 완료!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 현재 이용 중인 회원 조회 (left_at이 NULL인 경우)
router.get('/current/users', async (req, res) => {
  try {
    const [currentUsers] = await pool.query(
      `SELECT a.*, m.name, m.student_no
       FROM Attendance a
       JOIN Member m ON a.member_id = m.member_id
       WHERE a.left_at IS NULL
       ORDER BY a.entered_at DESC`
    );
    res.json(currentUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 혼잡도 조회
router.get('/current/crowd', async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as current_count FROM Attendance WHERE left_at IS NULL'
    );
    const maxCapacity = 30;
    const currentCount = result[0].current_count;
    res.json({
      current: currentCount,
      available: maxCapacity - currentCount,
      max: maxCapacity,
      percentage: Math.round((currentCount / maxCapacity) * 100)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 날짜의 출석 기록 조회
router.get('/:memberId/date/:date', async (req, res) => {
  try {
    const [attendance] = await pool.query(
      'SELECT * FROM Attendance WHERE member_id = ? AND DATE(entered_at) = ?',
      [req.params.memberId, req.params.date]
    );
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
