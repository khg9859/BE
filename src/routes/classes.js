const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 교양수업 조회
router.get('/', async (req, res) => {
  try {
    const [classes] = await pool.query('SELECT * FROM Class ORDER BY class_name');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 수업의 시간표 조회
router.get('/:classId/schedules', async (req, res) => {
  try {
    const [schedules] = await pool.query(
      'SELECT * FROM Class_Schedule WHERE class_id = ? ORDER BY day_of_week, start_time',
      [req.params.classId]
    );
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 모든 수업 시간표 조회
router.get('/schedules/all', async (req, res) => {
  try {
    const [schedules] = await pool.query(
      `SELECT cs.*, c.class_name, c.instructor_name
       FROM Class_Schedule cs
       JOIN Class c ON cs.class_id = c.class_id
       ORDER BY cs.day_of_week, cs.start_time`
    );
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 교양수업 생성
router.post('/', async (req, res) => {
  try {
    const { class_name, instructor_name, capacity } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Class (class_name, instructor_name, capacity) VALUES (?, ?, ?)',
      [class_name, instructor_name, capacity]
    );
    res.status(201).json({
      class_id: result.insertId,
      message: '교양수업이 생성되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 수업 시간표 추가
router.post('/:classId/schedules', async (req, res) => {
  try {
    const { day_of_week, start_time, end_time } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Class_Schedule (class_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
      [req.params.classId, day_of_week, start_time, end_time]
    );
    res.status(201).json({
      schedule_id: result.insertId,
      message: '수업 시간표가 추가되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 교양수업 수정
router.put('/:classId', async (req, res) => {
  try {
    const { class_name, instructor_name, capacity } = req.body;
    const [result] = await pool.query(
      'UPDATE Class SET class_name = ?, instructor_name = ?, capacity = ? WHERE class_id = ?',
      [class_name, instructor_name, capacity, req.params.classId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '수업을 찾을 수 없습니다.' });
    }
    res.json({ message: '수업 정보가 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 교양수업 삭제
router.delete('/:classId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Class WHERE class_id = ?',
      [req.params.classId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '수업을 찾을 수 없습니다.' });
    }
    res.json({ message: '수업이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
