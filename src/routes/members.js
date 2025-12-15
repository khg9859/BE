const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 회원 조회
router.get('/', async (req, res) => {
  try {
    const [members] = await pool.query('SELECT * FROM Member');
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 회원 조회
router.get('/:id', async (req, res) => {
  try {
    const [members] = await pool.query(
      'SELECT * FROM Member WHERE member_id = ?',
      [req.params.id]
    );
    if (members.length === 0) {
      return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    }
    res.json(members[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 회원 생성
router.post('/', async (req, res) => {
  try {
    const { student_no, name, contact, department, grade, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Member (student_no, name, contact, department, grade, status) VALUES (?, ?, ?, ?, ?, ?)',
      [student_no, name, contact, department, grade, status || '재학']
    );
    res.status(201).json({
      member_id: result.insertId,
      message: '회원이 생성되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 회원 정보 수정
router.put('/:id', async (req, res) => {
  try {
    const { name, contact, department, grade, status } = req.body;
    const [result] = await pool.query(
      'UPDATE Member SET name = ?, contact = ?, department = ?, grade = ?, status = ? WHERE member_id = ?',
      [name, contact, department, grade, status, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    }
    res.json({ message: '회원 정보가 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 회원 삭제
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Member WHERE member_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    }
    res.json({ message: '회원이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
