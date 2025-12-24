import jwt from 'jsonwebtoken';

export const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'devsecret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'devsecret';
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

