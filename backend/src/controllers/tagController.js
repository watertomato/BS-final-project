import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

// 获取所有标签
export const getAllTags = async (req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            imageTags: true
          }
        }
      }
    });

    // 格式化返回数据，包含使用次数
    const formattedTags = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      createdAt: tag.createdAt,
      count: tag._count.imageTags
    }));

    res.json({
      success: true,
      data: formattedTags
    });
  } catch (error) {
    next(error);
  }
};

// 按类型获取标签
export const getTagsByType = async (req, res, next) => {
  try {
    const type = parseInt(req.params.type);

    if (![1, 2, 3].includes(type)) {
      throw new AppError('标签类型无效，应为 1(用户自定义), 2(EXIF), 3(AI)', 400);
    }

    const tags = await prisma.tag.findMany({
      where: {
        type
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            imageTags: true
          }
        }
      }
    });

    const formattedTags = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      createdAt: tag.createdAt,
      count: tag._count.imageTags
    }));

    res.json({
      success: true,
      data: formattedTags
    });
  } catch (error) {
    next(error);
  }
};

