const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 멘토링 매칭 조회
router.get('/', async (req, res) => {
  try {
    const [mentorings] = await pool.query(
      `SELECT m.*,
              mentor.name as mentor_name,
              mentee.name as mentee_name
       FROM Mentoring m
       JOIN Member mentor ON m.mentor_id = mentor.member_id
       JOIN Member mentee ON m.mentee_id = mentee.member_id
       ORDER BY m.matched_at DESC`
    );
    res.json(mentorings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 회원의 멘토링 정보 조회
router.get('/member/:memberId', async (req, res) => {
  try {
    const [mentorings] = await pool.query(
      `SELECT m.*,
              mentor.name as mentor_name,
              mentee.name as mentee_name
       FROM Mentoring m
       JOIN Member mentor ON m.mentor_id = mentor.member_id
       JOIN Member mentee ON m.mentee_id = mentee.member_id
       WHERE m.mentor_id = ? OR m.mentee_id = ?
       ORDER BY m.matched_at DESC`,
      [req.params.memberId, req.params.memberId]
    );
    res.json(mentorings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘토링 매칭 생성
router.post('/', async (req, res) => {
  try {
    const { mentor_id, mentee_id } = req.body;

    // 이미 매칭된 회원인지 확인
    const [existing] = await pool.query(
      `SELECT * FROM Mentoring
       WHERE (mentor_id = ? AND mentee_id = ?) OR (mentor_id = ? AND mentee_id = ?)
       AND status = 'ACTIVE'`,
      [mentor_id, mentee_id, mentee_id, mentor_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 매칭된 회원입니다.' });
    }

    const [result] = await pool.query(
      'INSERT INTO Mentoring (mentor_id, mentee_id, matched_at) VALUES (?, ?, NOW())',
      [mentor_id, mentee_id]
    );

    // Member 테이블의 matching_status 업데이트
    await pool.query(
      'UPDATE Member SET matching_status = "MATCHED" WHERE member_id IN (?, ?)',
      [mentor_id, mentee_id]
    );

    res.status(201).json({
      mentoring_id: result.insertId,
      message: '멘토링 매칭이 완료되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘토링 종료
router.put('/:mentoringId/end', async (req, res) => {
  try {
    const [mentoring] = await pool.query(
      'SELECT * FROM Mentoring WHERE mentoring_id = ?',
      [req.params.mentoringId]
    );

    if (mentoring.length === 0) {
      return res.status(404).json({ error: '멘토링을 찾을 수 없습니다.' });
    }

    await pool.query(
      'UPDATE Mentoring SET status = "ENDED", ended_at = NOW() WHERE mentoring_id = ?',
      [req.params.mentoringId]
    );

    // Member 테이블의 matching_status 업데이트
    const { mentor_id, mentee_id } = mentoring[0];
    await pool.query(
      'UPDATE Member SET matching_status = "INACTIVE" WHERE member_id IN (?, ?)',
      [mentor_id, mentee_id]
    );

    res.json({ message: '멘토링이 종료되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 활성 멘토링 조회
router.get('/active', async (req, res) => {
  try {
    const [mentorings] = await pool.query(
      `SELECT m.*,
              mentor.name as mentor_name, mentor.student_no as mentor_student_no,
              mentee.name as mentee_name, mentee.student_no as mentee_student_no
       FROM Mentoring m
       JOIN Member mentor ON m.mentor_id = mentor.member_id
       JOIN Member mentee ON m.mentee_id = mentee.member_id
       WHERE m.status = 'ACTIVE'
       ORDER BY m.matched_at DESC`
    );
    res.json(mentorings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
