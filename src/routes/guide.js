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

// ========== 사용자 게시글 API ==========

// 사용자 운동 루틴 게시글 조회
router.get('/user-workouts', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.*, m.name as author_name,
        (SELECT COUNT(*) FROM UserPostLike WHERE post_id = p.post_id) as likes
      FROM UserPost p
      JOIN Member m ON p.member_id = m.member_id
      WHERE p.post_type = 'workout'
      ORDER BY p.created_at DESC
    `);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사용자 식단 게시글 조회
router.get('/user-diets', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.*, m.name as author_name,
        (SELECT COUNT(*) FROM UserPostLike WHERE post_id = p.post_id) as likes
      FROM UserPost p
      JOIN Member m ON p.member_id = m.member_id
      WHERE p.post_type = 'diet'
      ORDER BY p.created_at DESC
    `);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사용자 게시글 작성
router.post('/user-posts', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { member_id, post_type, title, content, category, data } = req.body;

    const [result] = await connection.query(
      `INSERT INTO UserPost (member_id, post_type, title, content, category, data, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [member_id, post_type, title, content, category, JSON.stringify(data)]
    );

    // 소셜 활동 퀘스트 업데이트
    await checkAndCompleteQuests(connection, member_id, 'SOCIAL');

    await connection.commit();

    res.status(201).json({
      post_id: result.insertId,
      message: '게시글이 작성되었습니다.'
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

// 사용자 게시글 삭제
router.delete('/user-posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { member_id } = req.query;

    // 작성자 확인
    const [post] = await pool.query(
      'SELECT member_id FROM UserPost WHERE post_id = ?',
      [postId]
    );

    if (post.length === 0) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (post[0].member_id !== parseInt(member_id)) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    // 좋아요 먼저 삭제
    await pool.query('DELETE FROM UserPostLike WHERE post_id = ?', [postId]);

    // 게시글 삭제
    await pool.query('DELETE FROM UserPost WHERE post_id = ?', [postId]);

    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 좋아요 추가
router.post('/user-posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { member_id } = req.body;

    // 이미 좋아요 했는지 확인
    const [existing] = await pool.query(
      'SELECT * FROM UserPostLike WHERE post_id = ? AND member_id = ?',
      [postId, member_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 좋아요를 누른 게시글입니다.' });
    }

    // 좋아요 추가
    await pool.query(
      'INSERT INTO UserPostLike (post_id, member_id, created_at) VALUES (?, ?, NOW())',
      [postId, member_id]
    );

    // 좋아요 수 조회
    const [likes] = await pool.query(
      'SELECT COUNT(*) as count FROM UserPostLike WHERE post_id = ?',
      [postId]
    );

    res.json({
      message: '좋아요가 추가되었습니다.',
      likes: likes[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 좋아요 취소
router.delete('/user-posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { member_id } = req.query;

    await pool.query(
      'DELETE FROM UserPostLike WHERE post_id = ? AND member_id = ?',
      [postId, member_id]
    );

    // 좋아요 수 조회
    const [likes] = await pool.query(
      'SELECT COUNT(*) as count FROM UserPostLike WHERE post_id = ?',
      [postId]
    );

    res.json({
      message: '좋아요가 취소되었습니다.',
      likes: likes[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사용자가 좋아요한 게시글 목록
router.get('/user-posts/liked/:memberId', async (req, res) => {
  try {
    const [liked] = await pool.query(
      'SELECT post_id FROM UserPostLike WHERE member_id = ?',
      [req.params.memberId]
    );
    res.json(liked.map(l => l.post_id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
