-- USE hs_health;

/* ============================================================
   헬스장 통합 관리 시스템 - 통합 SQL 스키마
   ============================================================ */

/* ============================================================
   [Part 1] 기본 테이블 생성
   ============================================================ */

-- 1. 회원 (Member)
CREATE TABLE `Member` (
  `member_id` INT PRIMARY KEY AUTO_INCREMENT,
  `student_no` CHAR(8) UNIQUE NOT NULL,
  `name` VARCHAR(30) NOT NULL,
  `contact` CHAR(13) UNIQUE,
  `department` VARCHAR(50) NOT NULL,
  `grade` INT CHECK (grade BETWEEN 1 AND 4),
  `status` ENUM('재학','휴학','졸업') NOT NULL DEFAULT '재학',
  `role_type` ENUM('GENERAL','INSTRUCTOR','MENTOR','MENTEE') NOT NULL DEFAULT 'GENERAL',
  `matching_status` ENUM('INACTIVE','SEEKING','MATCHED') NOT NULL DEFAULT 'INACTIVE',
  `partner_id` INT UNIQUE,
  
  -- [포인트 캐싱]
  `total_points` INT DEFAULT 0 COMMENT '현재 보유 총 포인트',
  `last_active_at` DATETIME,
  `allow_push_notify` TINYINT(1) DEFAULT 1,
  
  CONSTRAINT FK_Member_Partner FOREIGN KEY (`partner_id`) REFERENCES `Member` (`member_id`)
);

-- 2. 보상 정책 (IncentivePolicy)
CREATE TABLE `IncentivePolicy` (
  `policy_id` INT PRIMARY KEY AUTO_INCREMENT,
  `policy_name` VARCHAR(100) NOT NULL,
  `policy_type` ENUM('EXERCISE','DIET','GOAL','ATTENDANCE') NOT NULL COMMENT 'EXERCISE, DIET, GOAL, ATTENDANCE',
  `condition_value` INT NOT NULL COMMENT 'N개 달성 시 보상 (예: 5)',
  `points_awarded` INT NOT NULL DEFAULT 0 COMMENT '지급 포인트',
  `policy_frequency` ENUM('ONCE','CUMULATIVE','MONTHLY','WEEKLY') NOT NULL DEFAULT 'CUMULATIVE'
);

-- 3. 성취/업적 로그 (AchievementLog)
-- [수정] 포인트 증감 속성 추가
CREATE TABLE `AchievementLog` (
  `achievement_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `policy_id` INT,
  `source_type` ENUM('GOAL','EXERCISE','DIET','ATTENDANCE','ETC') NOT NULL DEFAULT 'ETC',
  
  `points_earned` INT NOT NULL DEFAULT 0 COMMENT '획득 포인트',
  `points_snapshot` INT COMMENT '포인트 지급 당시의 회원 보유 포인트',
  `achieved_at` DATETIME NOT NULL DEFAULT NOW(),
  
  CONSTRAINT FK_Achievement_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`),
  CONSTRAINT FK_Achievement_Policy FOREIGN KEY (`policy_id`) REFERENCES `IncentivePolicy` (`policy_id`)
);

-- 4. 목표 (Goal)
-- [수정] achievement_id 참조 속성 추가 (다대일)
CREATE TABLE `Goal` (
  `goal_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `policy_id` INT NOT NULL,
  `goal_content` VARCHAR(100) NOT NULL,
  `target_date` DATE,
  `is_achieved` TINYINT(1) DEFAULT 0,
  
  `achievement_id` INT DEFAULT NULL COMMENT '보상 전 NULL, 보상 후 ID 연결',
  
  CONSTRAINT FK_Goal_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`),
  CONSTRAINT FK_Goal_Policy FOREIGN KEY (`policy_id`) REFERENCES `IncentivePolicy` (`policy_id`),
  CONSTRAINT FK_Goal_Achievement FOREIGN KEY (`achievement_id`) REFERENCES `AchievementLog` (`achievement_id`)
);

-- 5. 출석 (Attendance)
-- [수정] achievement_id 참조 속성 추가 (다대일)
CREATE TABLE `Attendance` (
  `attendance_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `entered_at` DATETIME NOT NULL DEFAULT NOW(),
  `left_at` DATETIME,
  `attendance_type` ENUM('수업','헬스장') DEFAULT '헬스장',
  
  `achievement_id` INT DEFAULT NULL COMMENT '보상 전 NULL, 보상 후 ID 연결',
  
  CONSTRAINT FK_Attendance_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`),
  CONSTRAINT FK_Attendance_Achievement FOREIGN KEY (`achievement_id`) REFERENCES `AchievementLog` (`achievement_id`),
  INDEX idx_left_at (`left_at`)
);

-- 6. 운동 리스트 (ExerciseList)
CREATE TABLE `ExerciseList` (
  `exercise_id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `calories_per_hour` INT,
  `created_by` INT,
  `status` ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  CONSTRAINT FK_ExList_Creator FOREIGN KEY (`created_by`) REFERENCES `Member` (`member_id`)
);

-- 7. 운동 로그 (ExerciseLog)
-- [수정] achievement_id 참조 속성 추가 (다대일)
CREATE TABLE `ExerciseLog` (
  `exercise_log_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `exercise_id` INT NOT NULL,
  `performed_at` DATETIME NOT NULL DEFAULT NOW(),
  `duration_minutes` INT,
  
  `achievement_id` INT DEFAULT NULL COMMENT '보상 전 NULL, 보상 후 ID 연결',
  
  CONSTRAINT FK_ExLog_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`),
  CONSTRAINT FK_ExLog_ExList FOREIGN KEY (`exercise_id`) REFERENCES `ExerciseList` (`exercise_id`),
  CONSTRAINT FK_ExLog_Achievement FOREIGN KEY (`achievement_id`) REFERENCES `AchievementLog` (`achievement_id`)
);

-- 8. 음식 리스트 (FoodList)
CREATE TABLE `FoodList` (
  `food_id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `calories` INT,
  `created_by` INT,
  `status` ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  CONSTRAINT FK_FoodList_Creator FOREIGN KEY (`created_by`) REFERENCES `Member` (`member_id`)
);

-- 9. 식단 로그 (DietLog)
-- [수정] achievement_id 참조 속성 추가 (다대일)
CREATE TABLE `DietLog` (
  `diet_log_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `food_id` INT,
  `ate_at` DATETIME NOT NULL DEFAULT NOW(),
  `meal_type` ENUM('아침','점심','저녁','간식'),
  
  `achievement_id` INT DEFAULT NULL COMMENT '보상 전 NULL, 보상 후 ID 연결',
  
  CONSTRAINT FK_DietLog_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`),
  CONSTRAINT FK_DietLog_Food FOREIGN KEY (`food_id`) REFERENCES `FoodList` (`food_id`),
  CONSTRAINT FK_DietLog_Achievement FOREIGN KEY (`achievement_id`) REFERENCES `AchievementLog` (`achievement_id`)
);

-- 10. 보상 상품 (Reward)
CREATE TABLE `Reward` (
  `reward_id` INT PRIMARY KEY AUTO_INCREMENT,
  `reward_name` VARCHAR(100) NOT NULL,
  `required_points` INT NOT NULL,
  `stock_quantity` INT DEFAULT 0
);

-- 11. 포인트 교환 (PointExchange)
-- [수정] 포인트 차감 속성 추가
CREATE TABLE `PointExchange` (
  `exchange_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `reward_id` INT NOT NULL,
  `used_points` INT NOT NULL COMMENT '사용된 포인트 (차감)',
  `exchanged_at` DATETIME NOT NULL DEFAULT NOW(),
  
  CONSTRAINT FK_Exchange_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`),
  CONSTRAINT FK_Exchange_Reward FOREIGN KEY (`reward_id`) REFERENCES `Reward` (`reward_id`)
);

-- 12. 뱃지 (Badge)
CREATE TABLE `Badge` (
  `badge_id` INT PRIMARY KEY AUTO_INCREMENT,
  `badge_name` VARCHAR(100) NOT NULL
);

-- 13. 회원 뱃지 (MemberBadge) - N:M 해소
CREATE TABLE `MemberBadge` (
  `member_badge_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `badge_id` INT NOT NULL,
  `earned_at` DATETIME NOT NULL DEFAULT NOW(),
  
  CONSTRAINT FK_MemberBadge_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`),
  CONSTRAINT FK_MemberBadge_Badge FOREIGN KEY (`badge_id`) REFERENCES `Badge` (`badge_id`),
  UNIQUE KEY unique_member_badge (`member_id`, `badge_id`)
);

-- 14. 수업 (Class)
CREATE TABLE `Class` (
  `class_id` INT PRIMARY KEY AUTO_INCREMENT,
  `class_name` VARCHAR(100) NOT NULL,
  `instructor_id` INT,
  `capacity` INT,
  
  CONSTRAINT FK_Class_Instructor FOREIGN KEY (`instructor_id`) REFERENCES `Member` (`member_id`)
);

-- 15. 수업 시간표 (ClassSchedule)
CREATE TABLE `ClassSchedule` (
  `schedule_id` INT PRIMARY KEY AUTO_INCREMENT,
  `class_id` INT NOT NULL,
  `day_of_week` ENUM('월','화','수','목','금','토','일') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  
  CONSTRAINT FK_ClassSchedule_Class FOREIGN KEY (`class_id`) REFERENCES `Class` (`class_id`)
);

-- 16. 수강신청 (ClassRegistration)
CREATE TABLE `ClassRegistration` (
  `registration_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `registered_at` DATETIME NOT NULL DEFAULT NOW(),
  
  CONSTRAINT FK_ClassReg_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`),
  CONSTRAINT FK_ClassReg_Class FOREIGN KEY (`class_id`) REFERENCES `Class` (`class_id`)
);

-- 17. 신체 기록 (HealthRecord)
CREATE TABLE `HealthRecord` (
  `record_id` INT PRIMARY KEY AUTO_INCREMENT,
  `member_id` INT NOT NULL,
  `measured_at` DATE NOT NULL,
  `height_cm` FLOAT,
  `weight_kg` FLOAT,
  `muscle_mass_kg` FLOAT,
  `fat_mass_kg` FLOAT,
  `bmi` FLOAT,
  
  CONSTRAINT FK_HealthRecord_Member FOREIGN KEY (`member_id`) REFERENCES `Member` (`member_id`)
);


/* ============================================================
   [Part 2] 포인트 연동 트리거
   ============================================================ */

DELIMITER //

-- 1. AchievementLog 생성 시 -> Member.total_points 자동 증가
CREATE TRIGGER TRG_Achievement_Point_Earn
AFTER INSERT ON AchievementLog
FOR EACH ROW
BEGIN
    IF NEW.points_earned > 0 THEN
        UPDATE Member
        SET total_points = total_points + NEW.points_earned
        WHERE member_id = NEW.member_id;
    END IF;
END //

-- 2. PointExchange 생성 시 -> Member.total_points 자동 감소
CREATE TRIGGER TRG_Exchange_Point_Use
AFTER INSERT ON PointExchange
FOR EACH ROW
BEGIN
    UPDATE Member
    SET total_points = total_points - NEW.used_points
    WHERE member_id = NEW.member_id;
END //

DELIMITER ;


/* ============================================================
   [Part 3] 배치 보상 처리 트리거
   설명: 기록 INSERT 후 -> 미보상 기록 개수 확인 -> 조건 충족 시 AchievementLog 생성
   ============================================================ */

DELIMITER //

-- A. 운동 (ExerciseLog) - 배치 보상
CREATE TRIGGER TRG_Exercise_Batch_Reward
AFTER INSERT ON ExerciseLog
FOR EACH ROW
BEGIN
    DECLARE v_policy_id INT;
    DECLARE v_target_count INT;
    DECLARE v_points INT;
    DECLARE v_unrewarded_count INT;
    DECLARE v_new_achievement_id INT;
    
    -- 1. EXERCISE 정책 조회
    SELECT policy_id, condition_value, points_awarded 
    INTO v_policy_id, v_target_count, v_points
    FROM IncentivePolicy WHERE policy_type = 'EXERCISE' LIMIT 1;
    
    IF v_policy_id IS NOT NULL THEN
        -- 2. 아직 achievement_id가 NULL인 기록 개수 계산
        SELECT COUNT(*) INTO v_unrewarded_count
        FROM ExerciseLog
        WHERE member_id = NEW.member_id
          AND achievement_id IS NULL;
        
        -- 3. 목표 달성 여부 확인
        IF v_unrewarded_count >= v_target_count THEN
            -- 3-1. AchievementLog 생성 (points_snapshot 포함)
            INSERT INTO AchievementLog (
              member_id, policy_id, source_type, points_earned,
              points_snapshot
            )
            VALUES (
              NEW.member_id, v_policy_id, 'EXERCISE', v_points,
              (SELECT total_points FROM Member WHERE member_id = NEW.member_id)
            );
            
            SET v_new_achievement_id = LAST_INSERT_ID();
            
            -- 3-2. 가장 오래된 순서대로 N개 기록의 achievement_id 업데이트
            UPDATE ExerciseLog
            SET achievement_id = v_new_achievement_id
            WHERE member_id = NEW.member_id AND achievement_id IS NULL
            ORDER BY performed_at ASC, exercise_log_id ASC
            LIMIT v_target_count;
        END IF;
    END IF;
END //

-- B. 식단 (DietLog) - 배치 보상
CREATE TRIGGER TRG_Diet_Batch_Reward
AFTER INSERT ON DietLog
FOR EACH ROW
BEGIN
    DECLARE v_policy_id INT;
    DECLARE v_target_count INT;
    DECLARE v_points INT;
    DECLARE v_unrewarded_count INT;
    DECLARE v_new_achievement_id INT;
    
    SELECT policy_id, condition_value, points_awarded 
    INTO v_policy_id, v_target_count, v_points
    FROM IncentivePolicy WHERE policy_type = 'DIET' LIMIT 1;
    
    IF v_policy_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_unrewarded_count
        FROM DietLog
        WHERE member_id = NEW.member_id AND achievement_id IS NULL;
        
        IF v_unrewarded_count >= v_target_count THEN
            INSERT INTO AchievementLog (
              member_id, policy_id, source_type, points_earned,
              points_snapshot
            )
            VALUES (
              NEW.member_id, v_policy_id, 'DIET', v_points,
              (SELECT total_points FROM Member WHERE member_id = NEW.member_id)
            );
            
            SET v_new_achievement_id = LAST_INSERT_ID();
            
            UPDATE DietLog
            SET achievement_id = v_new_achievement_id
            WHERE member_id = NEW.member_id AND achievement_id IS NULL
            ORDER BY ate_at ASC, diet_log_id ASC
            LIMIT v_target_count;
        END IF;
    END IF;
END //

-- C. 출석 (Attendance) - 배치 보상
CREATE TRIGGER TRG_Attendance_Batch_Reward
AFTER INSERT ON Attendance
FOR EACH ROW
BEGIN
    DECLARE v_policy_id INT;
    DECLARE v_target_count INT;
    DECLARE v_points INT;
    DECLARE v_unrewarded_count INT;
    DECLARE v_new_achievement_id INT;
    
    SELECT policy_id, condition_value, points_awarded 
    INTO v_policy_id, v_target_count, v_points
    FROM IncentivePolicy WHERE policy_type = 'ATTENDANCE' LIMIT 1;
    
    IF v_policy_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_unrewarded_count
        FROM Attendance
        WHERE member_id = NEW.member_id AND achievement_id IS NULL;
        
        IF v_unrewarded_count >= v_target_count THEN
            INSERT INTO AchievementLog (
              member_id, policy_id, source_type, points_earned,
              points_snapshot
            )
            VALUES (
              NEW.member_id, v_policy_id, 'ATTENDANCE', v_points,
              (SELECT total_points FROM Member WHERE member_id = NEW.member_id)
            );
            
            SET v_new_achievement_id = LAST_INSERT_ID();
            
            UPDATE Attendance
            SET achievement_id = v_new_achievement_id
            WHERE member_id = NEW.member_id AND achievement_id IS NULL
            ORDER BY entered_at ASC, attendance_id ASC
            LIMIT v_target_count;
        END IF;
    END IF;
END //

-- D. 목표 (Goal) - 배치 보상
CREATE TRIGGER TRG_Goal_Batch_Reward
AFTER INSERT ON Goal
FOR EACH ROW
BEGIN
    DECLARE v_policy_id INT;
    DECLARE v_target_count INT;
    DECLARE v_points INT;
    DECLARE v_unrewarded_count INT;
    DECLARE v_new_achievement_id INT;
    
    SELECT policy_id, condition_value, points_awarded 
    INTO v_policy_id, v_target_count, v_points
    FROM IncentivePolicy WHERE policy_type = 'GOAL' LIMIT 1;
    
    IF v_policy_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_unrewarded_count
        FROM Goal
        WHERE member_id = NEW.member_id AND achievement_id IS NULL;
        
        IF v_unrewarded_count >= v_target_count THEN
            INSERT INTO AchievementLog (
              member_id, policy_id, source_type, points_earned,
              points_snapshot
            )
            VALUES (
              NEW.member_id, v_policy_id, 'GOAL', v_points,
              (SELECT total_points FROM Member WHERE member_id = NEW.member_id)
            );
            
            SET v_new_achievement_id = LAST_INSERT_ID();
            
            UPDATE Goal
            SET achievement_id = v_new_achievement_id
            WHERE member_id = NEW.member_id AND achievement_id IS NULL
            ORDER BY goal_id ASC
            LIMIT v_target_count;
        END IF;
    END IF;
END //

DELIMITER ;


/* ============================================================
   [Part 4] 유용한 VIEW 및 쿼리
   ============================================================ */

-- 현재 이용 중인 회원 (혼잡도)
CREATE OR REPLACE VIEW view_current_crowd AS
SELECT
  COUNT(*) AS '현재_인원',
  30 - COUNT(*) AS '남은_자리'
FROM Attendance
WHERE left_at IS NULL;

-- 현재 이용 중인 회원 목록
CREATE OR REPLACE VIEW view_current_users AS
SELECT
  m.member_id,
  m.name AS '이름',
  m.student_no AS '학번',
  a.entered_at AS '입장시간'
FROM Attendance a
JOIN Member m ON a.member_id = m.member_id
WHERE a.left_at IS NULL
ORDER BY a.entered_at ASC;

/* ============================================================
   [Part 5] 테스트 데이터 예시
   ============================================================ */

-- 보상 정책 설정 예시
-- INSERT INTO IncentivePolicy (policy_name, policy_type, condition_value, points_awarded) 
-- VALUES 
--   ('운동 5회 달성', 'EXERCISE', 5, 100),
--   ('식단 기록 3회', 'DIET', 3, 50),
--   ('출석 10회', 'ATTENDANCE', 10, 200),
--   ('목표 설정 2개', 'GOAL', 2, 80);

-- 회원 추가 예시
-- INSERT INTO Member (student_no, name, contact, department, grade)
-- VALUES ('20240001', '홍길동', '010-1234-5678', '컴퓨터공학과', 3);
