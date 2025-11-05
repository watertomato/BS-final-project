export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 已知错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Prisma 错误
  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      message: '该数据已存在',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: '数据不存在',
    });
  }

  // 默认错误
  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误',
  });
};

// 自定义错误类
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

