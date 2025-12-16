const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 운동 루틴 조회
router.get('/workouts', async (req, res) => {
  try {
    const [routines] = await pool.query(
      'SELECT * FROM WorkoutRoutine ORDER BY category, difficulty'
    );
    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 카테고리별 운동 루틴 조회
router.get('/workouts/category/:category', async (req, res) => {
  try {
    const [routines] = await pool.query(
      'SELECT * FROM WorkoutRoutine WHERE category = ? ORDER BY difficulty',
      [req.params.category]
    );
    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 운동 루틴 상세 조회
router.get('/workouts/:id', async (req, res) => {
  try {
    const [routine] = await pool.query(
      'SELECT * FROM WorkoutRoutine WHERE routine_id = ?',
      [req.params.id]
    );
    if (routine.length === 0) {
      return res.status(404).json({ error: '루틴을 찾을 수 없습니다.' });
    }
    res.json(routine[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 모든 식단 추천 조회
router.get('/diets', async (req, res) => {
  try {
    const [diets] = await pool.query(
      'SELECT * FROM DietRecommendation ORDER BY category, calories'
    );
    res.json(diets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 카테고리별 식단 추천 조회
router.get('/diets/category/:category', async (req, res) => {
  try {
    const [diets] = await pool.query(
      'SELECT * FROM DietRecommendation WHERE category = ? ORDER BY calories',
      [req.params.category]
    );
    res.json(diets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 식단 추천 상세 조회
router.get('/diets/:id', async (req, res) => {
  try {
    const [diet] = await pool.query(
      'SELECT * FROM DietRecommendation WHERE diet_id = ?',
      [req.params.id]
    );
    if (diet.length === 0) {
      return res.status(404).json({ error: '식단을 찾을 수 없습니다.' });
    }
    res.json(diet[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
