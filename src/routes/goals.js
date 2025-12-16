const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 회원의 목표 조회
router.get('/:memberId', async (req, res) => {
  try {
    const [goals] = await pool.query(
      `SELECT g.*, ip.policy_name, ip.points_awarded
       FROM Goal g
       LEFT JOIN IncentivePolicy ip ON g.policy_id = ip.policy_id
       WHERE g.member_id = ?
       ORDER BY g.target_date DESC`,
      [req.params.memberId]
    );
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 목표 생성
router.post('/', async (req, res) => {
  try {
    const { member_id, policy_id, goal_content, target_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Goal (member_id, policy_id, goal_content, target_date) VALUES (?, ?, ?, ?)',
      [member_id, policy_id, goal_content, target_date]
    );
    res.status(201).json({
      goal_id: result.insertId,
      message: '목표가 생성되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 목표 달성 처리
router.put('/:goalId/achieve', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Goal SET is_achieved = 1 WHERE goal_id = ?',
      [req.params.goalId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '목표를 찾을 수 없습니다.' });
    }
    res.json({ message: '목표가 달성되었습니다!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 목표 수정
router.put('/:goalId', async (req, res) => {
  try {
    const { goal_content, target_date } = req.body;
    const [result] = await pool.query(
      'UPDATE Goal SET goal_content = ?, target_date = ? WHERE goal_id = ?',
      [goal_content, target_date, req.params.goalId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '목표를 찾을 수 없습니다.' });
    }
    res.json({ message: '목표가 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 목표 삭제
router.delete('/:goalId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Goal WHERE goal_id = ?',
      [req.params.goalId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '목표를 찾을 수 없습니다.' });
    }
    res.json({ message: '목표가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
