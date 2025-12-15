# 데이터베이스 설정 가이드

## 1. 데이터베이스 생성 및 스키마 적용

```bash
# MySQL 접속
mysql -u root -p

# 데이터베이스 생성
CREATE DATABASE hs_health CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hs_health;

# 스키마 적용
source HS_Health.sql;
```

## 2. 더미 데이터 삽입

```bash
# MySQL에서 실행
USE hs_health;
source insert_dummy_data.sql;
```

## 3. 데이터 확인

```sql
-- 회원 확인
SELECT * FROM Member;

-- 운동 기록 확인
SELECT 
  el.exercise_log_id,
  m.name AS member_name,
  ex.name AS exercise_name,
  el.duration_minutes,
  el.performed_at
FROM ExerciseLog el
JOIN Member m ON el.member_id = m.member_id
JOIN ExerciseList ex ON el.exercise_id = ex.exercise_id
ORDER BY el.performed_at DESC
LIMIT 10;

-- 식단 기록 확인
SELECT 
  dl.diet_log_id,
  m.name AS member_name,
  f.name AS food_name,
  dl.meal_type,
  f.calories,
  dl.ate_at
FROM DietLog dl
JOIN Member m ON dl.member_id = m.member_id
JOIN FoodList f ON dl.food_id = f.food_id
ORDER BY dl.ate_at DESC
LIMIT 10;

-- 건강 기록 확인
SELECT 
  hr.record_id,
  m.name AS member_name,
  hr.measured_at,
  hr.weight_kg,
  hr.muscle_mass_kg,
  hr.fat_mass_kg,
  hr.bmi
FROM HealthRecord hr
JOIN Member m ON hr.member_id = m.member_id
ORDER BY hr.measured_at DESC;

-- 출석 기록 확인
SELECT 
  a.attendance_id,
  m.name AS member_name,
  a.entered_at,
  a.left_at,
  a.attendance_type
FROM Attendance a
JOIN Member m ON a.member_id = m.member_id
ORDER BY a.entered_at DESC
LIMIT 10;
```

## 4. 주요 테이블 설명

### Member (회원)
- 회원의 기본 정보 및 포인트 관리
- `total_points`: 현재 보유 포인트 (캐싱)

### ExerciseList (운동 리스트)
- 승인된 운동 목록
- 카테고리별로 분류 (가슴, 등, 하체, 어깨, 팔, 복근, 유산소)

### FoodList (음식 리스트)
- 승인된 음식 목록
- 카테고리별로 분류 (단백질, 탄수화물, 채소, 과일, 유제품, 보충제, 한식)

### ExerciseLog (운동 로그)
- 회원의 운동 기록
- `achievement_id`: 보상 획득 여부 (NULL이면 미보상)

### DietLog (식단 로그)
- 회원의 식단 기록
- `meal_type`: 아침, 점심, 저녁, 간식

### HealthRecord (건강 기록)
- 회원의 신체 측정 기록
- 체중, 근육량, 체지방, BMI 등

### Attendance (출석)
- 헬스장 입/퇴장 기록
- `left_at`이 NULL이면 현재 이용 중

### AchievementLog (성취 로그)
- 보상 획득 내역
- `points_earned`: 획득한 포인트
- `points_snapshot`: 획득 당시 보유 포인트

### IncentivePolicy (보상 정책)
- 운동, 식단, 출석, 목표 달성 시 보상 정책

## 5. 트리거 설명

### TRG_Achievement_Point_Earn
- AchievementLog 생성 시 Member.total_points 자동 증가

### TRG_Exchange_Point_Use
- PointExchange 생성 시 Member.total_points 자동 감소

### TRG_Exercise_Batch_Reward
- 운동 기록 N개 달성 시 자동 보상

### TRG_Diet_Batch_Reward
- 식단 기록 N개 달성 시 자동 보상

### TRG_Attendance_Batch_Reward
- 출석 N회 달성 시 자동 보상

### TRG_Goal_Batch_Reward
- 목표 N개 달성 시 자동 보상

## 6. 유용한 VIEW

### view_current_crowd
- 현재 헬스장 이용 인원 및 남은 자리

### view_current_users
- 현재 이용 중인 회원 목록
