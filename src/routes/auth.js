const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { student_no, password } = req.body;

    if (!student_no || !password) {
      return res.status(400).json({ error: '학번과 비밀번호를 입력해주세요.' });
    }

    // 회원 조회 (비밀번호 포함)
    const [members] = await pool.query(
      'SELECT * FROM Member WHERE student_no = ?',
      [student_no]
    );

    if (members.length === 0) {
      return res.status(401).json({ error: '학번 또는 비밀번호가 일치하지 않습니다.' });
    }

    const member = members[0];

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, member.password || '1234');
    if (!isPasswordValid) {
      return res.status(401).json({ error: '학번 또는 비밀번호가 일치하지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        member_id: member.member_id,
        student_no: member.student_no,
        name: member.name,
        role_type: member.role_type
      },
      process.env.JWT_SECRET || 'hansung_gym_secret_key_2025',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // 비밀번호 제외하고 응답
    delete member.password;

    res.json({
      success: true,
      token,
      member: {
        member_id: member.member_id,
        student_no: member.student_no,
        name: member.name,
        contact: member.contact,
        department: member.department,
        grade: member.grade,
        status: member.status,
        role_type: member.role_type,
        matching_status: member.matching_status,
        mypoints: member.mypoints
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { student_no, name, contact, department, grade, password } = req.body;

    if (!student_no || !name || !contact || !password) {
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
    }

    // 학번 중복 체크
    const [existing] = await pool.query(
      'SELECT student_no FROM Member WHERE student_no = ?',
      [student_no]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 등록된 학번입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 회원 생성
    const [result] = await pool.query(
      'INSERT INTO Member (student_no, name, contact, password, department, grade) VALUES (?, ?, ?, ?, ?, ?)',
      [student_no, name, contact, hashedPassword, department || '미정', grade || 1]
    );

    // 생성된 회원 정보 조회
    const [newMember] = await pool.query(
      'SELECT * FROM Member WHERE member_id = ?',
      [result.insertId]
    );

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        member_id: newMember[0].member_id,
        student_no: newMember[0].student_no,
        name: newMember[0].name,
        role_type: newMember[0].role_type
      },
      process.env.JWT_SECRET || 'hansung_gym_secret_key_2025',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      member: {
        member_id: newMember[0].member_id,
        student_no: newMember[0].student_no,
        name: newMember[0].name,
        contact: newMember[0].contact,
        department: newMember[0].department,
        grade: newMember[0].grade,
        mypoints: newMember[0].mypoints
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 현재 로그인한 사용자 정보 조회
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hansung_gym_secret_key_2025');

    const [members] = await pool.query(
      'SELECT * FROM Member WHERE member_id = ?',
      [decoded.member_id]
    );

    if (members.length === 0) {
      return res.status(404).json({ error: '회원 정보를 찾을 수 없습니다.' });
    }

    const member = members[0];
    delete member.password;

    res.json({
      success: true,
      member: {
        member_id: member.member_id,
        student_no: member.student_no,
        name: member.name,
        contact: member.contact,
        department: member.department,
        grade: member.grade,
        status: member.status,
        role_type: member.role_type,
        matching_status: member.matching_status,
        mypoints: member.mypoints
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다.' });
    }
    console.error('Get me error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 로그아웃 (클라이언트에서 토큰 삭제)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: '로그아웃되었습니다.' });
});

module.exports = router;
