const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 보상 상품 조회
router.get('/', async (req, res) => {
  try {
    const [rewards] = await pool.query(
      'SELECT * FROM Reward WHERE stock_quantity > 0 ORDER BY required_points'
    );
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 보상 상품 조회
router.get('/:rewardId', async (req, res) => {
  try {
    const [rewards] = await pool.query(
      'SELECT * FROM Reward WHERE reward_id = ?',
      [req.params.rewardId]
    );
    if (rewards.length === 0) {
      return res.status(404).json({ error: '보상 상품을 찾을 수 없습니다.' });
    }
    res.json(rewards[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 보상 교환 (포인트 차감)
router.post('/exchange', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { member_id, reward_id } = req.body;

    // 보상 상품 정보 조회
    const [rewards] = await connection.query(
      'SELECT * FROM Reward WHERE reward_id = ?',
      [reward_id]
    );

    if (rewards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '보상 상품을 찾을 수 없습니다.' });
    }

    const reward = rewards[0];

    // 재고 확인
    if (reward.stock_quantity <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: '재고가 없습니다.' });
    }

    // 회원 포인트 조회
    const [members] = await connection.query(
      'SELECT total_points FROM Member WHERE member_id = ?',
      [member_id]
    );

    if (members.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    }

    const member = members[0];

    // 포인트 확인
    if (member.total_points < reward.required_points) {
      await connection.rollback();
      return res.status(400).json({ error: '포인트가 부족합니다.' });
    }

    // 포인트 교환 기록 추가
    const [exchangeResult] = await connection.query(
      'INSERT INTO PointExchange (member_id, reward_id, used_points, exchanged_at) VALUES (?, ?, ?, NOW())',
      [member_id, reward_id, reward.required_points]
    );

    // 회원 포인트 차감
    await connection.query(
      'UPDATE Member SET total_points = total_points - ? WHERE member_id = ?',
      [reward.required_points, member_id]
    );

    // 보상 재고 감소
    await connection.query(
      'UPDATE Reward SET stock_quantity = stock_quantity - 1 WHERE reward_id = ?',
      [reward_id]
    );

    await connection.commit();

    res.status(201).json({
      exchange_id: exchangeResult.insertId,
      message: '교환이 완료되었습니다!',
      reward_name: reward.reward_name,
      used_points: reward.required_points
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 회원의 교환 내역 조회
router.get('/exchanges/:memberId', async (req, res) => {
  try {
    const [exchanges] = await pool.query(
      `SELECT pe.*, r.reward_name
       FROM PointExchange pe
       JOIN Reward r ON pe.reward_id = r.reward_id
       WHERE pe.member_id = ?
       ORDER BY pe.exchanged_at DESC`,
      [req.params.memberId]
    );
    res.json(exchanges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 보상 상품 생성 (관리자용)
router.post('/', async (req, res) => {
  try {
    const { reward_name, required_points, stock_quantity } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Reward (reward_name, required_points, stock_quantity) VALUES (?, ?, ?)',
      [reward_name, required_points, stock_quantity]
    );
    res.status(201).json({
      reward_id: result.insertId,
      message: '보상 상품이 생성되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 보상 재고 업데이트 (관리자용)
router.put('/:rewardId/stock', async (req, res) => {
  try {
    const { stock_quantity } = req.body;
    const [result] = await pool.query(
      'UPDATE Reward SET stock_quantity = ? WHERE reward_id = ?',
      [stock_quantity, req.params.rewardId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '보상 상품을 찾을 수 없습니다.' });
    }
    res.json({ message: '재고가 업데이트되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
