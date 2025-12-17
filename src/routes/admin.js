const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 데이터베이스 스키마 수정 (필요한 컬럼들 추가)
router.post('/fix-schema', async (req, res) => {
    const connection = await pool.getConnection();
    const results = [];

    try {
        console.log('🔧 데이터베이스 스키마 수정 시작...');

        // 1. Member 테이블에 total_points 컬럼 추가
        try {
            await connection.query(`
        ALTER TABLE \`Member\` 
        ADD COLUMN \`total_points\` INT DEFAULT 0 COMMENT '현재 보유 총 포인트'
      `);
            results.push('✅ Member.total_points 컬럼 추가 완료');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                results.push('ℹ️ Member.total_points 컬럼이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 2. AchievementLog 테이블에 points_earned 컬럼 추가
        try {
            await connection.query(`
        ALTER TABLE \`AchievementLog\` 
        ADD COLUMN \`points_earned\` INT NOT NULL DEFAULT 0 COMMENT '획득 포인트'
      `);
            results.push('✅ AchievementLog.points_earned 컬럼 추가 완료');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                results.push('ℹ️ AchievementLog.points_earned 컬럼이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 3. AchievementLog 테이블에 points_snapshot 컬럼 추가
        try {
            await connection.query(`
        ALTER TABLE \`AchievementLog\` 
        ADD COLUMN \`points_snapshot\` INT COMMENT '포인트 지급 당시의 회원 보유 포인트'
      `);
            results.push('✅ AchievementLog.points_snapshot 컬럼 추가 완료');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                results.push('ℹ️ AchievementLog.points_snapshot 컬럼이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 4. 기존 회원들의 포인트를 0으로 초기화 (교환 내역 기반 계산)
        await connection.query(`
      UPDATE \`Member\` m
      SET total_points = 0 - COALESCE((
          SELECT SUM(used_points)
          FROM PointExchange
          WHERE member_id = m.member_id
      ), 0)
    `);
        results.push('✅ 회원 포인트 초기화 완료');

        // 5. 결과 확인
        const [members] = await connection.query(
            'SELECT member_id, name, student_no, total_points FROM `Member` LIMIT 10'
        );

        res.json({
            success: true,
            message: '데이터베이스 스키마 수정 완료',
            results: results,
            members: members
        });
    } catch (error) {
        console.error('❌ 스키마 수정 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            results: results
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
