const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 음식 리스트 조회
router.get('/list', async (req, res) => {
  try {
    const [foods] = await pool.query(
      'SELECT food_id, name, serving_size_g, calories_per_serving as calories, category, status FROM FoodList WHERE status = "APPROVED" ORDER BY name'
    );
    res.json(foods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 카테고리별 음식 조회
router.get('/list/category/:category', async (req, res) => {
  try {
    const [foods] = await pool.query(
      'SELECT food_id, name, serving_size_g, calories_per_serving as calories, category, status FROM FoodList WHERE category = ? AND status = "APPROVED"',
      [req.params.category]
    );
    res.json(foods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 회원의 식단 기록 조회
router.get('/logs/:memberId', async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT dl.log_id as diet_log_id, dl.member_id, dl.food_id, dl.ate_at, dl.meal_type,
              dl.amount, dl.image_url,
              f.name as food_name, f.category, f.calories_per_serving as calories
       FROM DietLog dl
       JOIN FoodList f ON dl.food_id = f.food_id
       WHERE dl.member_id = ?
       ORDER BY dl.ate_at DESC`,
      [req.params.memberId]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 식단 기록 추가
router.post('/logs', async (req, res) => {
  try {
    const { member_id, food_id, meal_type, ate_at } = req.body;
    const [result] = await pool.query(
      'INSERT INTO DietLog (member_id, food_id, meal_type, ate_at) VALUES (?, ?, ?, ?)',
      [member_id, food_id, meal_type, ate_at || new Date()]
    );
    res.status(201).json({
      diet_log_id: result.insertId,
      message: '식단 기록이 추가되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 식단 기록 삭제
router.delete('/logs/:logId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM DietLog WHERE log_id = ?',
      [req.params.logId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '식단 기록을 찾을 수 없습니다.' });
    }
    res.json({ message: '식단 기록이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 날짜의 식단 기록 조회
router.get('/logs/:memberId/date/:date', async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT dl.log_id as diet_log_id, dl.member_id, dl.food_id, dl.ate_at, dl.meal_type,
              dl.amount, dl.image_url,
              f.name as food_name, f.category, f.calories_per_serving as calories
       FROM DietLog dl
       JOIN FoodList f ON dl.food_id = f.food_id
       WHERE dl.member_id = ? AND DATE(dl.ate_at) = ?
       ORDER BY dl.ate_at DESC`,
      [req.params.memberId, req.params.date]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
