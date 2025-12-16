const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 뱃지 조회
router.get('/', async (req, res) => {
  try {
    const [badges] = await pool.query('SELECT * FROM Badge ORDER BY badge_id');
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 회원의 획득한 뱃지 조회
router.get('/member/:memberId', async (req, res) => {
  try {
    const [memberBadges] = await pool.query(
      `SELECT mb.*, b.badge_name, b.badge_description, b.badge_icon
       FROM MemberBadge mb
       JOIN Badge b ON mb.badge_id = b.badge_id
       WHERE mb.member_id = ?
       ORDER BY mb.earned_at DESC`,
      [req.params.memberId]
    );
    res.json(memberBadges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 뱃지 부여 (관리자용)
router.post('/grant', async (req, res) => {
  try {
    const { member_id, badge_id } = req.body;

    // 이미 획득한 뱃지인지 확인
    const [existing] = await pool.query(
      'SELECT * FROM MemberBadge WHERE member_id = ? AND badge_id = ?',
      [member_id, badge_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 획득한 뱃지입니다.' });
    }

    const [result] = await pool.query(
      'INSERT INTO MemberBadge (member_id, badge_id, earned_at) VALUES (?, ?, NOW())',
      [member_id, badge_id]
    );

    res.status(201).json({
      member_badge_id: result.insertId,
      message: '뱃지가 부여되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
