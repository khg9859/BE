const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 모든 보상 상품 조회
router.get('/', async (req, res) => {
  try {
    const [rewards] = await pool.query(
      'SELECT * FROM Reward ORDER BY category, required_points'
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
      `SELECT pe.*, r.reward_name, r.icon
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

// 보상 데이터 초기화 (관리자용 - 주의: 기존 데이터 삭제됨)
router.post('/init', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 기존 데이터 삭제
    await connection.query('DELETE FROM PointExchange');
    await connection.query('DELETE FROM Reward');

    // 음료/보충제
    const beverages = [
      ['프로틴 쉐이크', 150, 50, '음료/보충제', '🥤', '고단백 프로틴 쉐이크 1회분'],
      ['스포츠 음료', 80, 200, '음료/보충제', '🧃', '전해질 보충 스포츠 음료'],
      ['에너지바 5개', 120, 100, '음료/보충제', '🍫', '운동 전후 간편 에너지바'],
      ['BCAA 보충제', 250, 30, '음료/보충제', '💊', '근육 회복 BCAA 보충제'],
      ['크레아틴 보충제', 280, 25, '음료/보충제', '💊', '근력 향상 크레아틴']
    ];

    // 운동 용품
    const equipment = [
      ['운동 타올', 150, 100, '운동 용품', '🧻', '고급 스포츠 타올'],
      ['운동 장갑', 200, 50, '운동 용품', '🧤', '논슬립 운동 장갑'],
      ['헬스 벨트', 350, 30, '운동 용품', '⚫', '허리 보호 헬스 벨트'],
      ['무릎 보호대', 250, 40, '운동 용품', '🦵', '무릎 보호 슬리브'],
      ['손목 보호대', 180, 60, '운동 용품', '💪', '손목 보호 랩'],
      ['요가 매트', 400, 20, '운동 용품', '🧘', '프리미엄 요가 매트'],
      ['짐백', 450, 15, '운동 용품', '🎒', '대용량 스포츠 백']
    ];

    // 이용권
    const tickets = [
      ['PT 1회 무료 이용권', 300, 30, '이용권', '🎫', '퍼스널 트레이닝 1회'],
      ['PT 5회 무료 이용권', 1200, 10, '이용권', '🎟️', '퍼스널 트레이닝 5회'],
      ['헬스장 1개월 무료 이용권', 500, 20, '이용권', '🏋️', '헬스장 1개월 연장'],
      ['헬스장 3개월 무료 이용권', 1300, 5, '이용권', '🏋️', '헬스장 3개월 연장'],
      ['락커 1개월 무료 이용', 400, 15, '이용권', '🔐', '개인 락커 1개월']
    ];

    // 의류
    const clothing = [
      ['운동복 상의', 500, 25, '의류', '👕', '기능성 운동복 상의'],
      ['운동복 하의', 450, 30, '의류', '👖', '기능성 운동복 하의'],
      ['운동화 할인권 50%', 600, 15, '의류', '👟', '운동화 50% 할인'],
      ['헬스장 후드티', 700, 10, '의류', '🧥', '헬스장 로고 후드티']
    ];

    // 기타
    const others = [
      ['헬스장 물병', 180, 80, '기타', '🍶', '스테인리스 물병'],
      ['블루투스 이어폰', 800, 8, '기타', '🎧', '무선 스포츠 이어폰'],
      ['스마트 워치 할인권 30%', 1000, 5, '기타', '⌚', '스마트 워치 30% 할인'],
      ['마사지 건', 1500, 3, '기타', '🔫', '근육 이완 마사지 건']
    ];

    const allRewards = [...beverages, ...equipment, ...tickets, ...clothing, ...others];

    for (const reward of allRewards) {
      await connection.query(
        'INSERT INTO Reward (reward_name, required_points, stock_quantity, category, icon, description) VALUES (?, ?, ?, ?, ?, ?)',
        reward
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: `${allRewards.length}개의 보상 상품이 초기화되었습니다.`,
      count: allRewards.length
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
