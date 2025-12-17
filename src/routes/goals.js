const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 회원의 목표 조회
router.get('/:memberId', async (req, res) => {
  try {
    const [goals] = await pool.query(
      `SELECT * FROM Goal WHERE member_id = ? ORDER BY target_date DESC`,
      [req.params.memberId]
    );
    console.log(`회원 ${req.params.memberId}의 목표 조회:`, goals.length, '개');
    res.json(goals);
  } catch (error) {
    console.error('목표 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 목표 생성
router.post('/', async (req, res) => {
  try {
    const { member_id, item_name, target_date } = req.body;

    console.log('목표 생성 요청:', { member_id, item_name, target_date });

    if (!member_id || !item_name || !target_date) {
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
    }

    const [result] = await pool.query(
      'INSERT INTO Goal (member_id, item_name, target_date) VALUES (?, ?, ?)',
      [member_id, item_name, target_date]
    );

    console.log('목표 생성 성공:', result.insertId);

    res.status(201).json({
      goal_id: result.insertId,
      message: '목표가 생성되었습니다.'
    });
  } catch (error) {
    console.error('목표 생성 실패:', error);
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

// 목표 수정 (is_achieved 토글 포함)
router.put('/:goalId', async (req, res) => {
  try {
    const { item_name, target_date, is_achieved } = req.body;

    // 동적 쿼리 생성
    const updates = [];
    const values = [];

    if (item_name !== undefined) {
      updates.push('item_name = ?');
      values.push(item_name);
    }
    if (target_date !== undefined) {
      updates.push('target_date = ?');
      values.push(target_date);
    }
    if (is_achieved !== undefined) {
      updates.push('is_achieved = ?');
      values.push(is_achieved ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '수정할 내용이 없습니다.' });
    }

    values.push(req.params.goalId);

    const [result] = await pool.query(
      `UPDATE Goal SET ${updates.join(', ')} WHERE goal_id = ?`,
      values
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
