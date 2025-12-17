const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 회원의 출석 기록 조회
router.get('/:memberId', async (req, res) => {
  try {
    const [attendance] = await pool.query(
      'SELECT * FROM Attendance WHERE member_id = ? ORDER BY attended_at DESC',
      [req.params.memberId]
    );
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출석 체크 (입장)
router.post('/check-in', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { member_id, attendance_type } = req.body;

    // 0. 오늘 이미 출석했는지 확인
    const [todayAttendance] = await connection.query(
      'SELECT * FROM Attendance WHERE member_id = ? AND DATE(attended_at) = CURDATE()',
      [member_id]
    );

    if (todayAttendance.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: '오늘은 이미 출석했습니다!' });
    }

    // 1. 출석 기록 추가
    const [result] = await connection.query(
      'INSERT INTO Attendance (member_id, attended_at, attendance_type) VALUES (?, NOW(), ?)',
      [member_id, attendance_type || '헬스장']
    );

    // 2. 기본 출석 포인트 50점 지급 (오늘 출석 퀘스트)
    await connection.query(
      'UPDATE Member SET mypoints = mypoints + 50 WHERE member_id = ?',
      [member_id]
    );

    // 3. 출석 퀘스트 체크 및 완료
    await checkAndCompleteQuests(connection, member_id, 'ATTENDANCE');

    await connection.commit();

    // 업데이트된 포인트 조회
    const [member] = await connection.query(
      'SELECT mypoints FROM Member WHERE member_id = ?',
      [member_id]
    );

    res.status(201).json({
      attendance_id: result.insertId,
      message: '출석 체크 완료! +50P',
      points_earned: 50,
      total_points: member[0]?.mypoints || 0
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
     ORDER BY q.target_value ASC`,
    [member_id, quest_type]
  );

  let totalPointsEarned = 0;
  const completedQuests = [];

  for (const quest of quests) {
    let newProgress = quest.current_progress + 1;

    // MemberQuest 레코드가 없으면 생성
    if (!quest.member_quest_id) {
      const [insertResult] = await connection.query(
        'INSERT INTO MemberQuest (member_id, quest_id, current_progress) VALUES (?, ?, ?)',
        [member_id, quest.quest_id, newProgress]
      );
      quest.member_quest_id = insertResult.insertId;
    } else {
      // 진행도 업데이트
      await connection.query(
        'UPDATE MemberQuest SET current_progress = ? WHERE member_quest_id = ?',
        [newProgress, quest.member_quest_id]
      );
    }

    // 목표 달성 확인
    if (newProgress >= quest.target_value && !quest.is_completed) {
      // 퀘스트 완료 처리
      await connection.query(
        'UPDATE MemberQuest SET is_completed = 1, completed_at = NOW() WHERE member_quest_id = ?',
        [quest.member_quest_id]
      );

      // 포인트 지급
      await connection.query(
        'UPDATE Member SET mypoints = mypoints + ? WHERE member_id = ?',
        [quest.points_reward, member_id]
      );

      totalPointsEarned += quest.points_reward;
      completedQuests.push(quest.quest_name);
    }
  }

  return { totalPointsEarned, completedQuests };
}

// 특정 날짜의 출석 기록 조회
router.get('/:memberId/date/:date', async (req, res) => {
  try {
    const [attendance] = await pool.query(
      'SELECT * FROM Attendance WHERE member_id = ? AND DATE(attended_at) = ?',
      [req.params.memberId, req.params.date]
    );
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
