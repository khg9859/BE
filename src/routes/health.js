const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 회원의 건강 기록 조회
router.get('/:memberId', async (req, res) => {
  try {
    const [records] = await pool.query(
      `SELECT * FROM HealthRecord
       WHERE member_id = ?
       ORDER BY measured_at DESC`,
      [req.params.memberId]
    );
    res.json(records);
  } catch (error) {
    console.error('건강 기록 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 건강 기록 추가
router.post('/', async (req, res) => {
  try {
    const { member_id, height_cm, weight_kg, muscle_mass_kg, fat_mass_kg, measured_at } = req.body;

    console.log('건강 기록 추가 요청:', { member_id, height_cm, weight_kg, muscle_mass_kg, fat_mass_kg, measured_at });

    if (!member_id || !height_cm || !weight_kg) {
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
    }

    // BMI 계산
    const bmi = (weight_kg / ((height_cm / 100) ** 2)).toFixed(1);

    const [result] = await pool.query(
      `INSERT INTO HealthRecord (member_id, height_cm, weight_kg, muscle_mass_kg, fat_mass_kg, bmi, measured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        member_id,
        height_cm,
        weight_kg,
        muscle_mass_kg || null,
        fat_mass_kg || null,
        bmi,
        measured_at || new Date()
      ]
    );

    console.log('건강 기록 추가 성공:', result.insertId);

    res.status(201).json({
      record_id: result.insertId,
      message: '건강 기록이 추가되었습니다.'
    });
  } catch (error) {
    console.error('건강 기록 추가 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 건강 기록 삭제
router.delete('/:recordId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM HealthRecord WHERE record_id = ?',
      [req.params.recordId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '건강 기록을 찾을 수 없습니다.' });
    }
    res.json({ message: '건강 기록이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 날짜의 건강 기록 조회
router.get('/:memberId/date/:date', async (req, res) => {
  try {
    const [records] = await pool.query(
      `SELECT * FROM HealthRecord
       WHERE member_id = ? AND DATE(measured_at) = ?
       ORDER BY measured_at DESC`,
      [req.params.memberId, req.params.date]
    );
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 최근 건강 기록 조회 (차트용)
router.get('/:memberId/recent/:limit', async (req, res) => {
  try {
    const [records] = await pool.query(
      `SELECT * FROM HealthRecord
       WHERE member_id = ?
       ORDER BY measured_at DESC
       LIMIT ?`,
      [req.params.memberId, parseInt(req.params.limit)]
    );
    res.json(records.reverse()); // 오래된 순으로 정렬
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
