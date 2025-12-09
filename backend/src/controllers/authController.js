import prisma from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middlewares/errorHandler.js';

// 用户注册
export const register = async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    // 验证必填字段
    if (!username || !password || !email) {
      throw new AppError('用户名、密码和邮箱为必填项', 400);
    }

    // 验证用户名长度
    if (username.length < 6) {
      throw new AppError('用户名至少需要6个字符', 400);
    }

    // 验证密码长度
    if (password.length < 6) {
      throw new AppError('密码至少需要6个字符', 400);
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('邮箱格式不正确', 400);
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    if (existingUser) {
      throw new AppError('用户名已存在', 400);
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });
    if (existingEmail) {
      throw new AppError('邮箱已被注册', 400);
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      }
    });

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 用户登录
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      throw new AppError('用户名和密码为必填项', 400);
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      throw new AppError('用户名或密码错误', 401);
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('用户名或密码错误', 401);
    }

    // 生成 token
    const token = generateToken({
      userId: user.id.toString(),
      username: user.username,
    });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取当前用户信息
export const getCurrentUser = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    res.json({
      success: true,
      data: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

