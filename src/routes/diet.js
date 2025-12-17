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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { member_id, food_id, meal_type, ate_at } = req.body;

    // ISO 8601 날짜를 MySQL DATETIME 형식으로 변환 (한국 시간대 고려)
    let ateAtDate = ate_at ? new Date(ate_at) : new Date();

    // UTC 시간을 한국 시간(UTC+9)으로 변환
    const koreaOffset = 9 * 60; // 9시간을 분으로
    const localOffset = ateAtDate.getTimezoneOffset(); // 로컬 시간대 오프셋
    ateAtDate = new Date(ateAtDate.getTime() + (koreaOffset + localOffset) * 60 * 1000);

    const mysqlDateTime = ateAtDate.toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await connection.query(
      'INSERT INTO DietLog (member_id, food_id, meal_type, ate_at) VALUES (?, ?, ?, ?)',
      [member_id, food_id, meal_type, mysqlDateTime]
    );

    // 식단 퀘스트 진행도 업데이트
    await checkAndCompleteQuests(connection, member_id, 'DIET');

    await connection.commit();

    res.status(201).json({
      diet_log_id: result.insertId,
      message: '식단 기록이 추가되었습니다.'
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 퀘스트 체크 및 완료 함수
async function checkAndCompleteQuests(connection, member_id, quest_type) {
  // 해당 타입의 미완료 퀘스트 조회
  const [quests] = await connection.query(
    `SELECT q.*, IFNULL(mq.current_progress, 0) as current_progress,
            IFNULL(mq.is_completed, 0) as is_completed, mq.member_quest_id
     FROM Quest q
     LEFT JOIN MemberQuest mq ON q.quest_id = mq.quest_id AND mq.member_id = ?
     WHERE q.quest_type = ? AND (mq.is_completed = 0 OR mq.is_completed IS NULL)
     ORDER BY q.target_value`,
    [member_id, quest_type]
  );

  let totalPointsEarned = 0;

  for (const quest of quests) {
    let newProgress = quest.current_progress + 1;

    if (quest.member_quest_id) {
      // 기존 진행도 업데이트
      await connection.query(
        'UPDATE MemberQuest SET current_progress = ? WHERE member_quest_id = ?',
        [newProgress, quest.member_quest_id]
      );
    } else {
      // 새로운 진행도 생성
      await connection.query(
        'INSERT INTO MemberQuest (member_id, quest_id, current_progress) VALUES (?, ?, ?)',
        [member_id, quest.quest_id, newProgress]
      );
    }

    // 목표 달성 시 완료 처리
    if (newProgress >= quest.target_value) {
      if (quest.member_quest_id) {
        await connection.query(
          'UPDATE MemberQuest SET is_completed = 1, completed_at = NOW() WHERE member_quest_id = ?',
          [quest.member_quest_id]
        );
      } else {
        await connection.query(
          'UPDATE MemberQuest SET is_completed = 1, completed_at = NOW() WHERE member_id = ? AND quest_id = ?',
          [member_id, quest.quest_id]
        );
      }

      // 포인트 지급
      await connection.query(
        'UPDATE Member SET total_points = total_points + ? WHERE member_id = ?',
        [quest.points_reward, member_id]
      );

      totalPointsEarned += quest.points_reward;
    }
  }

  return { totalPointsEarned };
}

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
