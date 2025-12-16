const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 회원의 포인트 조회
router.get('/:memberId', async (req, res) => {
  try {
    const [member] = await pool.query(
      'SELECT total_points FROM Member WHERE member_id = ?',
      [req.params.memberId]
    );
    if (member.length === 0) {
      return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    }
    res.json({ total_points: member[0].total_points });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 회원의 성취 로그 조회
router.get('/achievements/:memberId', async (req, res) => {
  try {
    const [achievements] = await pool.query(
      `SELECT al.*, ip.policy_name
       FROM AchievementLog al
       LEFT JOIN IncentivePolicy ip ON al.policy_id = ip.policy_id
       WHERE al.member_id = ?
       ORDER BY al.achieved_at DESC`,
      [req.params.memberId]
    );
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 포인트 수동 지급 (관리자용)
router.post('/grant', async (req, res) => {
  try {
    const { member_id, points, description } = req.body;

    // AchievementLog에 기록 추가
    const [result] = await pool.query(
      `INSERT INTO AchievementLog (member_id, source_type, points_earned, achieved_at, description)
       VALUES (?, 'ETC', ?, NOW(), ?)`,
      [member_id, points, description || '관리자 수동 지급']
    );

    // Member의 total_points 업데이트 (트리거가 자동으로 처리할 수도 있음)
    await pool.query(
      'UPDATE Member SET total_points = total_points + ? WHERE member_id = ?',
      [points, member_id]
    );

    res.status(201).json({
      achievement_id: result.insertId,
      message: `${points}P가 지급되었습니다.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 보상 정책 조회
router.get('/policies/all', async (req, res) => {
  try {
    const [policies] = await pool.query('SELECT * FROM IncentivePolicy');
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 타입의 보상 정책 조회
router.get('/policies/:type', async (req, res) => {
  try {
    const [policies] = await pool.query(
      'SELECT * FROM IncentivePolicy WHERE policy_type = ?',
      [req.params.type]
    );
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
