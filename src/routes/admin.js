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

// 회원에게 포인트 지급 (테스트용)
router.post('/add-points', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { member_id, points } = req.body;

        if (!member_id || !points) {
            return res.status(400).json({
                success: false,
                error: 'member_id와 points가 필요합니다'
            });
        }

        // 포인트만 추가 (로그는 생략)
        await connection.query(
            'UPDATE `Member` SET total_points = total_points + ? WHERE member_id = ?',
            [points, member_id]
        );

        // 결과 확인
        const [members] = await connection.query(
            'SELECT member_id, name, student_no, total_points FROM `Member` WHERE member_id = ?',
            [member_id]
        );

        res.json({
            success: true,
            message: `${points}P 지급 완료`,
            member: members[0]
        });
    } catch (error) {
        console.error('❌ 포인트 지급 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// 모든 회원에게 포인트 일괄 지급
router.post('/add-points-all', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { points } = req.body;

        if (!points) {
            return res.status(400).json({
                success: false,
                error: 'points가 필요합니다'
            });
        }

        // 모든 회원 조회
        const [members] = await connection.query('SELECT member_id FROM `Member`');

        // 각 회원에게 포인트 추가 (로그는 생략)
        for (const member of members) {
            await connection.query(
                'UPDATE `Member` SET total_points = total_points + ? WHERE member_id = ?',
                [points, member.member_id]
            );
        }

        res.json({
            success: true,
            message: `${members.length}명의 회원에게 ${points}P 지급 완료`,
            count: members.length
        });
    } catch (error) {
        console.error('❌ 일괄 포인트 지급 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// 사용자 게시글 테이블 생성
router.post('/create-user-post-tables', async (req, res) => {
    const connection = await pool.getConnection();
    const results = [];

    try {
        console.log('🔧 사용자 게시글 테이블 생성 시작...');

        // 1. UserPost 테이블 생성
        try {
            await connection.query(`
        CREATE TABLE IF NOT EXISTS UserPost (
          post_id INT PRIMARY KEY AUTO_INCREMENT,
          member_id INT NOT NULL,
          post_type ENUM('workout', 'diet') NOT NULL,
          title VARCHAR(200) NOT NULL,
          content TEXT,
          category VARCHAR(50),
          data JSON COMMENT '운동/식단 상세 데이터',
          created_at DATETIME NOT NULL DEFAULT NOW(),
          CONSTRAINT FK_UserPost_Member FOREIGN KEY (member_id) REFERENCES Member(member_id) ON DELETE CASCADE,
          INDEX idx_post_type (post_type),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
            results.push('✅ UserPost 테이블 생성 완료');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                results.push('ℹ️ UserPost 테이블이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 2. UserPostLike 테이블 생성
        try {
            await connection.query(`
        CREATE TABLE IF NOT EXISTS UserPostLike (
          like_id INT PRIMARY KEY AUTO_INCREMENT,
          post_id INT NOT NULL,
          member_id INT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT NOW(),
          CONSTRAINT FK_UserPostLike_Post FOREIGN KEY (post_id) REFERENCES UserPost(post_id) ON DELETE CASCADE,
          CONSTRAINT FK_UserPostLike_Member FOREIGN KEY (member_id) REFERENCES Member(member_id) ON DELETE CASCADE,
          UNIQUE KEY unique_post_member (post_id, member_id),
          INDEX idx_member (member_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
            results.push('✅ UserPostLike 테이블 생성 완료');
        } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                results.push('ℹ️ UserPostLike 테이블이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        res.json({
            success: true,
            message: '사용자 게시글 테이블 생성 완료',
            results: results
        });
    } catch (error) {
        console.error('❌ 테이블 생성 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            results: results
        });
    } finally {
        connection.release();
    }
});

// 운동/음식 리스트 초기화
router.post('/init-exercise-food-lists', async (req, res) => {
    const connection = await pool.getConnection();
    const results = [];

    try {
        console.log('🔧 운동/음식 리스트 초기화 시작...');

        // ExerciseList에 category 컬럼 추가
        try {
            await connection.query(`
                ALTER TABLE ExerciseList 
                ADD COLUMN category VARCHAR(50)
            `);
            results.push('✅ ExerciseList.category 컬럼 추가');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                results.push('ℹ️ ExerciseList.category 컬럼이 이미 존재');
            } else {
                throw error;
            }
        }

        // FoodList에 category 컬럼 추가
        try {
            await connection.query(`
                ALTER TABLE FoodList 
                ADD COLUMN category VARCHAR(50)
            `);
            results.push('✅ FoodList.category 컬럼 추가');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                results.push('ℹ️ FoodList.category 컬럼이 이미 존재');
            } else {
                throw error;
            }
        }

        // FoodList 테이블 확인 (calories_per_serving 컬럼 사용)
        results.push('ℹ️ FoodList는 calories_per_serving 컬럼 사용');

        // 운동 리스트 초기화
        const exercises = [
            // 가슴
            ['벤치프레스', '가슴', 300, 'APPROVED'],
            ['인클라인 벤치프레스', '가슴', 310, 'APPROVED'],
            ['덤벨 플라이', '가슴', 280, 'APPROVED'],
            ['푸쉬업', '가슴', 250, 'APPROVED'],
            ['딥스', '가슴', 290, 'APPROVED'],
            // 등
            ['데드리프트', '등', 350, 'APPROVED'],
            ['풀업', '등', 280, 'APPROVED'],
            ['랫풀다운', '등', 260, 'APPROVED'],
            ['바벨 로우', '등', 320, 'APPROVED'],
            // 하체
            ['스쿼트', '하체', 400, 'APPROVED'],
            ['레그프레스', '하체', 320, 'APPROVED'],
            ['런지', '하체', 350, 'APPROVED'],
            // 어깨
            ['숄더 프레스', '어깨', 290, 'APPROVED'],
            ['사이드 레터럴 레이즈', '어깨', 240, 'APPROVED'],
            // 팔
            ['바벨 컬', '팔', 220, 'APPROVED'],
            ['덤벨 컬', '팔', 210, 'APPROVED'],
            ['트라이셉스 익스텐션', '팔', 230, 'APPROVED'],
            // 복근
            ['크런치', '복근', 200, 'APPROVED'],
            ['플랭크', '복근', 180, 'APPROVED'],
            // 유산소
            ['런닝머신', '유산소', 500, 'APPROVED'],
            ['사이클', '유산소', 400, 'APPROVED']
        ];

        for (const [name, category, calories, status] of exercises) {
            await connection.query(
                'INSERT INTO ExerciseList (name, category, calories_per_hour, status) VALUES (?, ?, ?, ?)',
                [name, category, calories, status]
            );
        }
        results.push(`✅ ${exercises.length}개의 운동 추가 완료`);

        // 음식 리스트 초기화 (기존 음식에 카테고리 업데이트)
        const foodUpdates = [
            ['닭가슴살', '단백질'],
            ['계란', '단백질'],
            ['연어', '단백질'],
            ['현미밥', '탄수화물'],
            ['고구마', '탄수화물'],
            ['바나나', '과일'],
            ['아보카도', '과일'],
            ['아몬드', '보충제'],
            ['브로콜리', '채소'],
            ['시금치', '채소']
        ];

        let updateCount = 0;
        for (const [name, category] of foodUpdates) {
            const [result] = await connection.query(
                'UPDATE FoodList SET category = ? WHERE name = ?',
                [category, name]
            );
            if (result.affectedRows > 0) {
                updateCount++;
            }
        }
        results.push(`✅ ${updateCount}개의 음식 카테고리 업데이트 완료`);

        // 추가 음식 삽입 (기존에 없는 것만)
        const newFoods = [
            ['닭가슴살 구이', 100, 165, '단백질', 'APPROVED'],
            ['닭가슴살 샐러드', 200, 250, '단백질', 'APPROVED'],
            ['연어 구이', 150, 280, '단백질', 'APPROVED'],
            ['참치 캔', 100, 120, '단백질', 'APPROVED'],
            ['소고기 스테이크', 200, 350, '단백질', 'APPROVED'],
            ['계란 3개', 150, 210, '단백질', 'APPROVED'],
            ['백미밥 1공기', 200, 310, '탄수화물', 'APPROVED'],
            ['감자 1개', 150, 110, '탄수화물', 'APPROVED'],
            ['귀리 오트밀', 100, 150, '탄수화물', 'APPROVED'],
            ['그린 샐러드', 150, 50, '채소', 'APPROVED'],
            ['시금치 나물', 100, 40, '채소', 'APPROVED'],
            ['사과 1개', 150, 95, '과일', 'APPROVED'],
            ['블루베리 1컵', 150, 85, '과일', 'APPROVED'],
            ['그릭 요거트', 150, 130, '유제품', 'APPROVED'],
            ['저지방 우유', 200, 100, '유제품', 'APPROVED'],
            ['프로틴 쉐이크', 250, 120, '보충제', 'APPROVED'],
            ['프로틴 바', 60, 200, '보충제', 'APPROVED'],
            ['김치찌개', 300, 250, '한식', 'APPROVED'],
            ['된장찌개', 300, 180, '한식', 'APPROVED'],
            ['비빔밥', 400, 550, '한식', 'APPROVED']
        ];

        let insertCount = 0;
        for (const [name, serving_size, calories, category, status] of newFoods) {
            try {
                await connection.query(
                    'INSERT INTO FoodList (name, serving_size_g, calories_per_serving, category, status) VALUES (?, ?, ?, ?, ?)',
                    [name, serving_size, calories, category, status]
                );
                insertCount++;
            } catch (error) {
                // 중복 키 에러는 무시 (이미 존재하는 음식)
                if (error.code !== 'ER_DUP_ENTRY') {
                    console.error(`음식 추가 실패 (${name}):`, error.message);
                }
            }
        }
        results.push(`✅ ${insertCount}개의 새 음식 추가 완료`);

        res.json({
            success: true,
            message: '운동/음식 리스트 초기화 완료',
            results: results
        });
    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            results: results
        });
    } finally {
        connection.release();
    }
});

// 중복 운동/음식 제거
router.post('/remove-duplicates', async (req, res) => {
    const connection = await pool.getConnection();
    const results = [];

    try {
        console.log('🔧 중복 데이터 제거 시작...');

        // ExerciseList 중복 제거
        const [exercises] = await connection.query(
            'SELECT name, MIN(exercise_id) as keep_id, GROUP_CONCAT(exercise_id) as all_ids FROM ExerciseList GROUP BY name HAVING COUNT(*) > 1'
        );

        for (const exercise of exercises) {
            const duplicateIds = exercise.all_ids.split(',').filter(id => id != exercise.keep_id);

            // 먼저 ExerciseLog의 외래 키를 keep_id로 업데이트
            for (const dupId of duplicateIds) {
                await connection.query(
                    'UPDATE ExerciseLog SET exercise_id = ? WHERE exercise_id = ?',
                    [exercise.keep_id, dupId]
                );
            }

            // 이제 중복 제거
            const [result] = await connection.query(
                'DELETE FROM ExerciseList WHERE name = ? AND exercise_id != ?',
                [exercise.name, exercise.keep_id]
            );
            if (result.affectedRows > 0) {
                results.push(`✅ ${exercise.name}: ${result.affectedRows}개 중복 제거`);
            }
        }

        // FoodList 중복 제거
        const [foods] = await connection.query(
            'SELECT name, MIN(food_id) as keep_id, GROUP_CONCAT(food_id) as all_ids FROM FoodList GROUP BY name HAVING COUNT(*) > 1'
        );

        for (const food of foods) {
            const duplicateIds = food.all_ids.split(',').filter(id => id != food.keep_id);

            // 먼저 DietLog의 외래 키를 keep_id로 업데이트
            for (const dupId of duplicateIds) {
                await connection.query(
                    'UPDATE DietLog SET food_id = ? WHERE food_id = ?',
                    [food.keep_id, dupId]
                );
            }

            // 이제 중복 제거
            const [result] = await connection.query(
                'DELETE FROM FoodList WHERE name = ? AND food_id != ?',
                [food.name, food.keep_id]
            );
            if (result.affectedRows > 0) {
                results.push(`✅ ${food.name}: ${result.affectedRows}개 중복 제거`);
            }
        }

        // 최종 카운트
        const [exerciseCount] = await connection.query('SELECT COUNT(*) as count FROM ExerciseList');
        const [foodCount] = await connection.query('SELECT COUNT(*) as count FROM FoodList');

        results.push(`📊 최종 운동 개수: ${exerciseCount[0].count}개`);
        results.push(`📊 최종 음식 개수: ${foodCount[0].count}개`);

        res.json({
            success: true,
            message: '중복 데이터 제거 완료',
            results: results
        });
    } catch (error) {
        console.error('❌ 중복 제거 실패:', error);
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
