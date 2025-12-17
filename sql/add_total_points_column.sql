-- Member 테이블에 total_points 컬럼 추가
-- Railway 데이터베이스에서 실행하세요

-- 1. total_points 컬럼이 없으면 추가
ALTER TABLE `Member` 
ADD COLUMN IF NOT EXISTS `total_points` INT DEFAULT 0 COMMENT '현재 보유 총 포인트';

-- 2. 기존 회원들의 total_points 계산 (AchievementLog 기반)
UPDATE `Member` m
SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM AchievementLog
    WHERE member_id = m.member_id
) - (
    SELECT COALESCE(SUM(used_points), 0)
    FROM PointExchange
    WHERE member_id = m.member_id
);

-- 3. 확인
SELECT member_id, name, total_points FROM `Member`;
