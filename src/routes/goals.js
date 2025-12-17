const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 회원의 목표 조회
router.get('/:memberId', async (req, res) => {
  try {
    const [goals] = await pool.query(
      `SELECT * FROM Goal WHERE member_id = ? ORDER BY target_date DESC`,
      [req.params.memberId]
    );
    console.log(`회원 ${req.params.memberId}의 목표 조회:`, goals.length, '개');
    res.json(goals);
  } catch (error) {
    console.error('목표 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 목표 생성
router.post('/', async (req, res) => {
  try {
    const { member_id, item_name, target_date } = req.body;

    console.log('목표 생성 요청:', { member_id, item_name, target_date });

    if (!member_id || !item_name || !target_date) {
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
    }

    const [result] = await pool.query(
      'INSERT INTO Goal (member_id, item_name, target_date) VALUES (?, ?, ?)',
      [member_id, item_name, target_date]
    );

    console.log('목표 생성 성공:', result.insertId);

    res.status(201).json({
      goal_id: result.insertId,
      message: '목표가 생성되었습니다.'
    });
  } catch (error) {
    console.error('목표 생성 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 목표 달성 처리
router.put('/:goalId/achieve', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Goal SET is_achieved = 1 WHERE goal_id = ?',
      [req.params.goalId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '목표를 찾을 수 없습니다.' });
    }
    res.json({ message: '목표가 달성되었습니다!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 목표 수정 (is_achieved 토글 포함)
router.put('/:goalId', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { item_name, target_date, is_achieved } = req.body;

    // 기존 목표 정보 조회
    const [existingGoal] = await connection.query(
      'SELECT * FROM Goal WHERE goal_id = ?',
      [req.params.goalId]
    );

    if (existingGoal.length === 0) {
      return res.status(404).json({ error: '목표를 찾을 수 없습니다.' });
    }

    const wasAchieved = existingGoal[0].is_achieved;
    const nowAchieved = is_achieved !== undefined ? is_achieved : wasAchieved;

    // 동적 쿼리 생성
    const updates = [];
    const values = [];

    if (item_name !== undefined) {
      updates.push('item_name = ?');
      values.push(item_name);
    }
    if (target_date !== undefined) {
      updates.push('target_date = ?');
      values.push(target_date);
    }
    if (is_achieved !== undefined) {
      updates.push('is_achieved = ?');
      values.push(is_achieved ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '수정할 내용이 없습니다.' });
    }

    values.push(req.params.goalId);

    const [result] = await connection.query(
      `UPDATE Goal SET ${updates.join(', ')} WHERE goal_id = ?`,
      values
    );

    // 목표가 새로 달성된 경우 퀘스트 업데이트
    if (!wasAchieved && nowAchieved) {
      await checkAndCompleteQuests(connection, existingGoal[0].member_id, 'GOAL');
    }

    await connection.commit();

    res.json({ message: '목표가 수정되었습니다.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// 퀘스트 체크 및 완료 함수
async function checkAndCompleteQuests(connection, member_id, quest_type) {
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
      await connection.query(
        'UPDATE MemberQuest SET current_progress = ? WHERE member_quest_id = ?',
        [newProgress, quest.member_quest_id]
      );
    } else {
      await connection.query(
        'INSERT INTO MemberQuest (member_id, quest_id, current_progress) VALUES (?, ?, ?)',
        [member_id, quest.quest_id, newProgress]
      );
    }

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

      await connection.query(
        'UPDATE Member SET total_points = total_points + ? WHERE member_id = ?',
        [quest.points_reward, member_id]
      );

      totalPointsEarned += quest.points_reward;
    }
  }

  return { totalPointsEarned };
}

// 목표 삭제
router.delete('/:goalId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Goal WHERE goal_id = ?',
      [req.params.goalId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '목표를 찾을 수 없습니다.' });
    }
    res.json({ message: '목표가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
