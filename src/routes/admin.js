const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 데이터베이스 스키마 수정 (total_points 컬럼 추가)
router.post('/fix-schema', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('🔧 데이터베이스 스키마 수정 시작...');

        // 1. total_points 컬럼 추가 (이미 있으면 무시)
        try {
            await connection.query(`
        ALTER TABLE \`Member\` 
        ADD COLUMN \`total_points\` INT DEFAULT 0 COMMENT '현재 보유 총 포인트'
      `);
            console.log('✅ total_points 컬럼 추가 완료');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ total_points 컬럼이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 2. 기존 회원들의 포인트 계산
        await connection.query(`
      UPDATE \`Member\` m
      SET total_points = COALESCE((
          SELECT SUM(points_earned)
          FROM AchievementLog
          WHERE member_id = m.member_id
      ), 0) - COALESCE((
          SELECT SUM(used_points)
          FROM PointExchange
          WHERE member_id = m.member_id
      ), 0)
    `);
        console.log('✅ 회원 포인트 계산 완료');

        // 3. 결과 확인
        const [members] = await connection.query(
            'SELECT member_id, name, student_no, total_points FROM `Member` LIMIT 10'
        );

        res.json({
            success: true,
            message: '데이터베이스 스키마 수정 완료',
            members: members
        });
    } catch (error) {
        console.error('❌ 스키마 수정 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
