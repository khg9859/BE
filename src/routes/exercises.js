const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 운동 리스트 조회
router.get('/list', async (req, res) => {
  try {
    const [exercises] = await pool.query(
      'SELECT * FROM ExerciseList WHERE status = "APPROVED" ORDER BY name'
    );
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 카테고리별 운동 조회
router.get('/list/category/:category', async (req, res) => {
  try {
    const [exercises] = await pool.query(
      'SELECT * FROM ExerciseList WHERE category = ? AND status = "APPROVED"',
      [req.params.category]
    );
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 회원의 운동 기록 조회
router.get('/logs/:memberId', async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT el.log_id as exercise_log_id, el.member_id, el.exercise_id, el.performed_at, 
              el.sets, el.reps, el.weight_kg, el.duration_minutes, el.calories_burned,
              ex.name as exercise_name, ex.category, ex.calories_per_hour
       FROM ExerciseLog el
       JOIN ExerciseList ex ON el.exercise_id = ex.exercise_id
       WHERE el.member_id = ?
       ORDER BY el.performed_at DESC`,
      [req.params.memberId]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 운동 기록 추가
router.post('/logs', async (req, res) => {
  try {
    const { member_id, exercise_id, duration_minutes, performed_at } = req.body;
    const [result] = await pool.query(
      'INSERT INTO ExerciseLog (member_id, exercise_id, duration_minutes, performed_at) VALUES (?, ?, ?, ?)',
      [member_id, exercise_id, duration_minutes, performed_at || new Date()]
    );
    res.status(201).json({
      exercise_log_id: result.insertId,
      message: '운동 기록이 추가되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 운동 기록 삭제
router.delete('/logs/:logId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM ExerciseLog WHERE log_id = ?',
      [req.params.logId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '운동 기록을 찾을 수 없습니다.' });
    }
    res.json({ message: '운동 기록이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 날짜의 운동 기록 조회
router.get('/logs/:memberId/date/:date', async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT el.log_id as exercise_log_id, el.member_id, el.exercise_id, el.performed_at,
              el.sets, el.reps, el.weight_kg, el.duration_minutes, el.calories_burned,
              ex.name as exercise_name, ex.category, ex.calories_per_hour
       FROM ExerciseLog el
       JOIN ExerciseList ex ON el.exercise_id = ex.exercise_id
       WHERE el.member_id = ? AND DATE(el.performed_at) = ?
       ORDER BY el.performed_at DESC`,
      [req.params.memberId, req.params.date]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
