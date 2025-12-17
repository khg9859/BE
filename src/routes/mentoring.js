const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// ========== 멘토 모집글 관련 API ==========

// 모든 멘토 모집글 조회
router.get('/mentors/posts', async (req, res) => {
  try {
    const [posts] = await pool.query(
      `SELECT p.*, m.name as user_name, m.profile_image
       FROM MentorPost p
       JOIN Member m ON p.member_id = m.member_id
       ORDER BY p.created_at DESC`
    );
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘토 모집글 작성
router.post('/mentors/posts', async (req, res) => {
  try {
    const { member_id, title, description, career, specialty, mentor_contact } = req.body;

    // 이미 멘토 글을 작성했는지 확인
    const [existingMentor] = await pool.query(
      'SELECT * FROM MentorPost WHERE member_id = ?',
      [member_id]
    );

    if (existingMentor.length > 0) {
      return res.status(400).json({ error: '이미 등록된 멘토 모집글이 있습니다.' });
    }

    // 멘티 글을 작성했는지 확인
    const [existingMentee] = await pool.query(
      'SELECT * FROM MenteePost WHERE member_id = ?',
      [member_id]
    );

    if (existingMentee.length > 0) {
      return res.status(400).json({ error: '멘티 모집글을 작성한 사용자는 멘토 모집글을 작성할 수 없습니다.' });
    }

    const [result] = await pool.query(
      'INSERT INTO MentorPost (member_id, title, description, career, specialty, mentor_contact) VALUES (?, ?, ?, ?, ?, ?)',
      [member_id, title, description, career, specialty, mentor_contact]
    );

    res.status(201).json({
      post_id: result.insertId,
      message: '멘토 모집글이 등록되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘토 모집글 삭제
router.delete('/mentors/posts/:postId', async (req, res) => {
  try {
    await pool.query('DELETE FROM MentorPost WHERE post_id = ?', [req.params.postId]);
    res.json({ message: '멘토 모집글이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 멘티 모집글 관련 API ==========

// 모든 멘티 모집글 조회
router.get('/mentees/posts', async (req, res) => {
  try {
    const [posts] = await pool.query(
      `SELECT p.*, m.name as user_name, m.profile_image
       FROM MenteePost p
       JOIN Member m ON p.member_id = m.member_id
       ORDER BY p.created_at DESC`
    );
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘티 모집글 작성
router.post('/mentees/posts', async (req, res) => {
  try {
    const { member_id, title, description, goal, interest, mentee_contact } = req.body;

    // 이미 멘티 글을 작성했는지 확인
    const [existingMentee] = await pool.query(
      'SELECT * FROM MenteePost WHERE member_id = ?',
      [member_id]
    );

    if (existingMentee.length > 0) {
      return res.status(400).json({ error: '이미 등록된 멘티 모집글이 있습니다.' });
    }

    // 멘토 글을 작성했는지 확인
    const [existingMentor] = await pool.query(
      'SELECT * FROM MentorPost WHERE member_id = ?',
      [member_id]
    );

    if (existingMentor.length > 0) {
      return res.status(400).json({ error: '멘토 모집글을 작성한 사용자는 멘티 모집글을 작성할 수 없습니다.' });
    }

    const [result] = await pool.query(
      'INSERT INTO MenteePost (member_id, title, description, goal, interest, mentee_contact) VALUES (?, ?, ?, ?, ?, ?)',
      [member_id, title, description, goal, interest, mentee_contact]
    );

    res.status(201).json({
      post_id: result.insertId,
      message: '멘티 모집글이 등록되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘티 모집글 삭제
router.delete('/mentees/posts/:postId', async (req, res) => {
  try {
    await pool.query('DELETE FROM MenteePost WHERE post_id = ?', [req.params.postId]);
    res.json({ message: '멘티 모집글이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 매칭 관련 API ==========

// 모든 멘토링 매칭 조회 (신청 포함)
router.get('/applications', async (req, res) => {
  try {
    const [applications] = await pool.query(
      `SELECT m.*,
              mentor.name as mentor_name,
              mentee.name as mentee_name
       FROM Mentoring m
       JOIN Member mentor ON m.mentor_id = mentor.member_id
       JOIN Member mentee ON m.mentee_id = mentee.member_id
       ORDER BY m.created_at DESC`
    );
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// 멘토링 신청 생성 (멘티가 멘토에게 신청)
router.post('/apply', async (req, res) => {
  try {
    const { mentor_id, mentee_id } = req.body;

    // 이미 신청했거나 매칭된 회원인지 확인
    const [existing] = await pool.query(
      `SELECT * FROM Mentoring
       WHERE mentor_id = ? AND mentee_id = ?`,
      [mentor_id, mentee_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 신청했거나 매칭된 상태입니다.' });
    }

    const [result] = await pool.query(
      'INSERT INTO Mentoring (mentor_id, mentee_id, status) VALUES (?, ?, "PENDING")',
      [mentor_id, mentee_id]
    );

    res.status(201).json({
      mentoring_id: result.insertId,
      message: '멘토에게 신청이 완료되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘토링 신청 수락
router.put('/accept/:mentoringId', async (req, res) => {
  try {
    const [mentoring] = await pool.query(
      'SELECT * FROM Mentoring WHERE mentoring_id = ?',
      [req.params.mentoringId]
    );

    if (mentoring.length === 0) {
      return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    }

    await pool.query(
      'UPDATE Mentoring SET status = "ACTIVE", matched_at = NOW() WHERE mentoring_id = ?',
      [req.params.mentoringId]
    );

    // Member 테이블의 matching_status 업데이트
    const { mentor_id, mentee_id } = mentoring[0];
    await pool.query(
      'UPDATE Member SET matching_status = "MATCHED" WHERE member_id IN (?, ?)',
      [mentor_id, mentee_id]
    );

    res.json({ message: '매칭이 완료되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘토링 신청 거절
router.delete('/reject/:mentoringId', async (req, res) => {
  try {
    await pool.query('DELETE FROM Mentoring WHERE mentoring_id = ?', [req.params.mentoringId]);
    res.json({ message: '신청이 거절되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 멘토링 매칭 생성 (직접 매칭 - 기존 API 유지)
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
