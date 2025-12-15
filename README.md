# Hansung Gym Management System - Backend API

> 한성대학교 헬스장 통합 관리 시스템 백엔드
> Express.js + MySQL 기반 REST API 서버

---

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [API 엔드포인트](#api-엔드포인트)
- [데이터베이스 설정](#데이터베이스-설정)
- [환경 변수](#환경-변수)
- [배포](#배포)

---

## 🎯 프로젝트 개요

한성대학교 헬스장 회원 관리, 운동 기록, 식단 관리, 포인트 시스템, 멘토링 매칭 등을 제공하는 RESTful API 서버입니다.

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.18.2 |
| **Database** | MySQL 5.7+ / 8.0+ |
| **ORM/Driver** | MySQL2 (Promise-based) |
| **환경 변수** | dotenv |
| **CORS** | cors |

---

## 📁 프로젝트 구조

```
BE/
├── src/
│   ├── config/
│   │   └── database.js         # MySQL 연결 설정
│   ├── routes/                 # API 라우트
│   │   ├── members.js          # 회원 관리
│   │   ├── exercises.js        # 운동 기록
│   │   ├── diet.js             # 식단 기록
│   │   ├── attendance.js       # 출석 관리
│   │   ├── points.js           # 포인트 시스템
│   │   ├── goals.js            # 목표 관리
│   │   ├── classes.js          # 교양수업 시간표
│   │   ├── mentoring.js        # 멘토링 매칭
│   │   └── rewards.js          # 보상 교환
│   └── app.js                  # Express 앱 진입점
├── sql/
│   ├── HS_Health.sql           # 데이터베이스 스키마
│   ├── insert_dummy_data.sql   # 더미 데이터
│   ├── insert_class_data.sql   # 수업 데이터
│   └── README.md               # SQL 가이드
├── .env.example                # 환경 변수 예시
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/hsugym/BE.git
cd BE
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 수정:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hs_health

FRONTEND_URL=http://localhost:3000
```

### 4. 데이터베이스 설정

MySQL에 접속하여 데이터베이스 생성 및 스키마 적용:

```bash
# MySQL 접속
mysql -u root -p

# 데이터베이스 생성
CREATE DATABASE hs_health CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hs_health;

# 스키마 적용
source sql/HS_Health.sql;

# 더미 데이터 삽입
source sql/insert_dummy_data.sql;
source sql/insert_class_data.sql;
```

### 5. 서버 실행

**개발 모드 (nodemon):**
```bash
npm run dev
```

**프로덕션 모드:**
```bash
npm start
```

서버가 실행되면 다음과 같이 표시됩니다:
```
✅ MySQL 데이터베이스 연결 성공!
🚀 서버가 포트 5000에서 실행 중입니다.
📍 http://localhost:5000
🌍 환경: development
```

---

## 📡 API 엔드포인트

### 기본

- `GET /` - API 정보 조회
- `GET /health` - 헬스 체크

### 회원 (Members)

- `GET /api/members` - 모든 회원 조회
- `GET /api/members/:id` - 특정 회원 조회
- `POST /api/members` - 회원 생성
- `PUT /api/members/:id` - 회원 정보 수정
- `DELETE /api/members/:id` - 회원 삭제

### 운동 (Exercises)

- `GET /api/exercises/list` - 운동 리스트 조회
- `GET /api/exercises/list/category/:category` - 카테고리별 운동 조회
- `GET /api/exercises/logs/:memberId` - 회원의 운동 기록 조회
- `GET /api/exercises/logs/:memberId/date/:date` - 특정 날짜 운동 기록
- `POST /api/exercises/logs` - 운동 기록 추가
- `DELETE /api/exercises/logs/:logId` - 운동 기록 삭제

### 식단 (Diet)

- `GET /api/diet/list` - 음식 리스트 조회
- `GET /api/diet/list/category/:category` - 카테고리별 음식 조회
- `GET /api/diet/logs/:memberId` - 회원의 식단 기록 조회
- `GET /api/diet/logs/:memberId/date/:date` - 특정 날짜 식단 기록
- `POST /api/diet/logs` - 식단 기록 추가
- `DELETE /api/diet/logs/:logId` - 식단 기록 삭제

### 출석 (Attendance)

- `GET /api/attendance/:memberId` - 회원의 출석 기록 조회
- `GET /api/attendance/:memberId/date/:date` - 특정 날짜 출석 기록
- `GET /api/attendance/current/users` - 현재 이용 중인 회원 조회
- `GET /api/attendance/current/crowd` - 헬스장 혼잡도 조회
- `POST /api/attendance/check-in` - 입장 체크
- `PUT /api/attendance/check-out/:attendanceId` - 퇴장 체크

### 포인트 (Points)

- `GET /api/points/:memberId` - 회원 포인트 조회
- `GET /api/points/achievements/:memberId` - 성취 로그 조회
- `GET /api/points/policies/all` - 모든 보상 정책 조회
- `GET /api/points/policies/:type` - 특정 타입 보상 정책 조회
- `POST /api/points/grant` - 포인트 수동 지급 (관리자)

### 목표 (Goals)

- `GET /api/goals/:memberId` - 회원의 목표 조회
- `POST /api/goals` - 목표 생성
- `PUT /api/goals/:goalId` - 목표 수정
- `PUT /api/goals/:goalId/achieve` - 목표 달성 처리
- `DELETE /api/goals/:goalId` - 목표 삭제

### 교양수업 (Classes)

- `GET /api/classes` - 모든 교양수업 조회
- `GET /api/classes/:classId/schedules` - 특정 수업 시간표 조회
- `GET /api/classes/schedules/all` - 모든 수업 시간표 조회
- `POST /api/classes` - 교양수업 생성
- `POST /api/classes/:classId/schedules` - 수업 시간표 추가
- `PUT /api/classes/:classId` - 수업 정보 수정
- `DELETE /api/classes/:classId` - 수업 삭제

### 멘토링 (Mentoring)

- `GET /api/mentoring` - 모든 멘토링 매칭 조회
- `GET /api/mentoring/member/:memberId` - 회원의 멘토링 정보 조회
- `GET /api/mentoring/active` - 활성 멘토링 조회
- `POST /api/mentoring` - 멘토링 매칭 생성
- `PUT /api/mentoring/:mentoringId/end` - 멘토링 종료

### 보상 (Rewards)

- `GET /api/rewards` - 모든 보상 상품 조회
- `GET /api/rewards/:rewardId` - 특정 보상 상품 조회
- `GET /api/rewards/exchanges/:memberId` - 회원의 교환 내역 조회
- `POST /api/rewards` - 보상 상품 생성 (관리자)
- `POST /api/rewards/exchange` - 보상 교환
- `PUT /api/rewards/:rewardId/stock` - 재고 업데이트 (관리자)

---

## 🗄️ 데이터베이스 설정

### 주요 테이블

- **Member** - 회원 정보
- **ExerciseList** - 운동 목록
- **FoodList** - 음식 목록
- **ExerciseLog** - 운동 기록
- **DietLog** - 식단 기록
- **HealthRecord** - 건강 기록
- **Attendance** - 출석 기록
- **AchievementLog** - 성취 로그
- **IncentivePolicy** - 보상 정책
- **Goal** - 목표
- **Class** - 교양수업
- **Class_Schedule** - 수업 시간표
- **Mentoring** - 멘토링 매칭
- **Reward** - 보상 상품
- **PointExchange** - 포인트 교환 내역

자세한 스키마 정보는 [sql/README.md](sql/README.md)를 참조하세요.

---

## 🌍 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | 5000 |
| `NODE_ENV` | 실행 환경 | development |
| `DB_HOST` | MySQL 호스트 | localhost |
| `DB_PORT` | MySQL 포트 | 3306 |
| `DB_USER` | MySQL 사용자 | root |
| `DB_PASSWORD` | MySQL 비밀번호 | - |
| `DB_NAME` | 데이터베이스 이름 | hs_health |
| `FRONTEND_URL` | 프론트엔드 URL (CORS) | http://localhost:3000 |

---

## 🚢 배포

### Railway 배포 (추천)

1. [Railway](https://railway.app) 계정 생성
2. GitHub 저장소 연동
3. 환경 변수 설정
4. MySQL 플러그인 추가
5. 자동 배포

### Render 배포

1. [Render](https://render.com) 계정 생성
2. Web Service 생성
3. GitHub 저장소 연동
4. 환경 변수 설정
5. 빌드 및 배포

### PlanetScale (MySQL)

무료 MySQL 호스팅:

1. [PlanetScale](https://planetscale.com) 계정 생성
2. 데이터베이스 생성
3. 연결 문자열 복사
4. `.env`에 설정

---

## 🔧 개발

### API 테스트

```bash
# 서버 상태 확인
curl http://localhost:5000/health

# 모든 회원 조회
curl http://localhost:5000/api/members

# 특정 회원 조회
curl http://localhost:5000/api/members/1
```

### 로그 확인

모든 API 요청은 콘솔에 로그가 출력됩니다:

```
2025-01-23T10:30:15.123Z - GET /api/members
2025-01-23T10:30:16.456Z - POST /api/exercises/logs
```

---

## 📝 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.

---

## 👥 개발팀

**Hansung University Gym Team**

- Frontend: [https://github.com/hsugym/FE](https://github.com/hsugym/FE)
- Backend: [https://github.com/hsugym/BE](https://github.com/hsugym/BE)

---

## 📞 문의

프로젝트 관련 문의: gym@hansung.ac.kr