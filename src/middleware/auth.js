const jwt = require('jsonwebtoken');

// JWT 인증 미들웨어
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hansung_gym_secret_key_2025');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다.' });
    }
    return res.status(500).json({ error: error.message });
  }
};

// 관리자 권한 체크 미들웨어
const authorizeAdmin = (req, res, next) => {
  if (req.user.role_type !== 'INSTRUCTOR') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
};

module.exports = { authenticate, authorizeAdmin };
