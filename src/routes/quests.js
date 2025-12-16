const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 퀘스트 조회
router.get('/', async (req, res) => {
  try {
    const [quests] = await pool.query('SELECT * FROM Quest ORDER BY quest_type, target_value');
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 회원의 퀘스트 진행상황 조회
router.get('/member/:memberId', async (req, res) => {
  try {
    const [quests] = await pool.query(
      `SELECT
        q.*,
        IFNULL(mq.current_progress, 0) as current_progress,
        IFNULL(mq.is_completed, 0) as is_completed,
        mq.completed_at,
        mq.member_quest_id
       FROM Quest q
       LEFT JOIN MemberQuest mq ON q.quest_id = mq.quest_id AND mq.member_id = ?
       ORDER BY q.quest_type, q.target_value`,
      [req.params.memberId]
    );
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 타입별 퀘스트 조회 (회원별)
router.get('/member/:memberId/type/:type', async (req, res) => {
  try {
    const [quests] = await pool.query(
      `SELECT
        q.*,
        IFNULL(mq.current_progress, 0) as current_progress,
        IFNULL(mq.is_completed, 0) as is_completed,
        mq.completed_at,
        mq.member_quest_id
       FROM Quest q
       LEFT JOIN MemberQuest mq ON q.quest_id = mq.quest_id AND mq.member_id = ?
       WHERE q.quest_type = ?
       ORDER BY q.target_value`,
      [req.params.memberId, req.params.type]
    );
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 완료된 퀘스트 조회
router.get('/member/:memberId/completed', async (req, res) => {
  try {
    const [quests] = await pool.query(
      `SELECT
        q.*,
        mq.current_progress,
        mq.is_completed,
        mq.completed_at,
        mq.member_quest_id
       FROM Quest q
       JOIN MemberQuest mq ON q.quest_id = mq.quest_id
       WHERE mq.member_id = ? AND mq.is_completed = 1
       ORDER BY mq.completed_at DESC`,
      [req.params.memberId]
    );
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 미완료 퀘스트 조회
router.get('/member/:memberId/available', async (req, res) => {
  try {
    const [quests] = await pool.query(
      `SELECT
        q.*,
        IFNULL(mq.current_progress, 0) as current_progress,
        IFNULL(mq.is_completed, 0) as is_completed,
        mq.member_quest_id
       FROM Quest q
       LEFT JOIN MemberQuest mq ON q.quest_id = mq.quest_id AND mq.member_id = ?
       WHERE mq.is_completed = 0 OR mq.is_completed IS NULL
       ORDER BY q.quest_type, q.target_value`,
      [req.params.memberId]
    );
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
