import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return next(new AppError('未提供认证令牌', 401));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return next(new AppError('令牌无效或已过期', 403));
      }
      req.user = user; // { userId, username }
      next();
    });
  } catch (error) {
    next(error);
  }
};

