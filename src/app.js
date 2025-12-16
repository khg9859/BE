const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 라우트 import
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const exerciseRoutes = require('./routes/exercises');
const dietRoutes = require('./routes/diet');
const attendanceRoutes = require('./routes/attendance');
const pointRoutes = require('./routes/points');
const goalRoutes = require('./routes/goals');
const classRoutes = require('./routes/classes');
const mentoringRoutes = require('./routes/mentoring');
const rewardRoutes = require('./routes/rewards');
const badgeRoutes = require('./routes/badges');
const questRoutes = require('./routes/quests');
const guideRoutes = require('./routes/guide');

// API 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/mentoring', mentoringRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/guide', guideRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: '🏋️ Hansung Gym Management System API',
    version: '1.0.0',
    endpoints: {
      members: '/api/members',
      exercises: '/api/exercises',
      diet: '/api/diet',
      attendance: '/api/attendance',
      points: '/api/points',
      goals: '/api/goals',
      classes: '/api/classes',
      mentoring: '/api/mentoring',
      rewards: '/api/rewards'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 에러 핸들러
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 연결 테스트
    await testConnection();

    // 서버 시작
    app.listen(PORT, () => {
      console.log(`✨ 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`✨ http://localhost:${PORT}`);
      console.log(`✨ 환경: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
 

