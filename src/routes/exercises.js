const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 운동 리스트 조회
router.get('/list', async (req, res) => {
  try {
    const [exercises] = await pool.query(
      'SELECT * FROM ExerciseList WHERE status = "APPROVED" ORDER BY name'
    );
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 카테고리별 운동 조회
router.get('/list/category/:category', async (req, res) => {
  try {
    const [exercises] = await pool.query(
      'SELECT * FROM ExerciseList WHERE category = ? AND status = "APPROVED"',
      [req.params.category]
    );
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 회원의 운동 기록 조회
router.get('/logs/:memberId', async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT el.log_id as exercise_log_id, el.member_id, el.exercise_id, el.performed_at, 
              el.sets, el.reps, el.weight_kg, el.duration_minutes, el.calories_burned,
              ex.name as exercise_name, ex.category, ex.calories_per_hour
       FROM ExerciseLog el
       JOIN ExerciseList ex ON el.exercise_id = ex.exercise_id
       WHERE el.member_id = ?
       ORDER BY el.performed_at DESC`,
      [req.params.memberId]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 운동 기록 추가
router.post('/logs', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { member_id, exercise_id, duration_minutes, performed_at } = req.body;

    // ISO 8601 날짜를 MySQL DATETIME 형식으로 변환 (한국 시간대 고려)
    let performedAtDate = performed_at ? new Date(performed_at) : new Date();

    // UTC 시간을 한국 시간(UTC+9)으로 변환
    const koreaOffset = 9 * 60; // 9시간을 분으로
    const localOffset = performedAtDate.getTimezoneOffset(); // 로컬 시간대 오프셋
    performedAtDate = new Date(performedAtDate.getTime() + (koreaOffset + localOffset) * 60 * 1000);

    const mysqlDateTime = performedAtDate.toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await connection.query(
      'INSERT INTO ExerciseLog (member_id, exercise_id, duration_minutes, performed_at) VALUES (?, ?, ?, ?)',
      [member_id, exercise_id, duration_minutes, mysqlDateTime]
    );

    // 운동 퀘스트 진행도 업데이트
    await checkAndCompleteQuests(connection, member_id, 'EXERCISE');

    await connection.commit();

    res.status(201).json({
      exercise_log_id: result.insertId,
      message: '운동 기록이 추가되었습니다.'
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

// 운동 기록 삭제
router.delete('/logs/:logId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM ExerciseLog WHERE log_id = ?',
      [req.params.logId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '운동 기록을 찾을 수 없습니다.' });
    }
    res.json({ message: '운동 기록이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 날짜의 운동 기록 조회
router.get('/logs/:memberId/date/:date', async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT el.log_id as exercise_log_id, el.member_id, el.exercise_id, el.performed_at,
              el.sets, el.reps, el.weight_kg, el.duration_minutes, el.calories_burned,
              ex.name as exercise_name, ex.category, ex.calories_per_hour
       FROM ExerciseLog el
       JOIN ExerciseList ex ON el.exercise_id = ex.exercise_id
       WHERE el.member_id = ? AND DATE(el.performed_at) = ?
       ORDER BY el.performed_at DESC`,
      [req.params.memberId, req.params.date]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
