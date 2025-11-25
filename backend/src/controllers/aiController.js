import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { generateAiTags, interpretSearchQuery } from '../services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const includeTagRelation = {
  imageTags: {
    include: {
      tag: true
    }
  }
};

const mapImageWithTags = (image) => {
  if (!image) return image;
  return {
    ...image,
    tags: image.imageTags?.map((it) => it.tag) || [],
    imageTags: undefined
  };
};

export const generateAiTagsForImage = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);
    const imageId = BigInt(req.params.id);
    const { prompt, maxTags } = req.body || {};

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      throw new AppError('图片不存在', 404);
    }

    const imagePath = path.join(__dirname, '../..', image.storedPath);
    const aiTags = await generateAiTags(imagePath, {
      prompt,
      maxTags,
      filename: image.originalFilename
    });

    if (!aiTags || aiTags.length === 0) {
      throw new AppError('AI 未能生成有效标签', 502);
    }

    const newlyAttached = [];

    for (const rawTag of aiTags) {
      const tagName = rawTag.trim();
      if (!tagName) continue;

      let tag = await prisma.tag.findUnique({
        where: { name: tagName }
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagName,
            type: 3
          }
        });
      }

      try {
        await prisma.imageTagRelation.create({
          data: {
            imageId,
            tagId: tag.id
          }
        });
        newlyAttached.push(tagName);
      } catch (error) {
        if (error.code !== 'P2002') {
          throw error;
        }
      }
    }

    const updatedImage = await prisma.image.findUnique({
      where: { id: imageId },
      include: includeTagRelation
    });

    res.json({
      success: true,
      message: newlyAttached.length ? 'AI 标签生成成功' : '标签已存在，无需重复添加',
      data: mapImageWithTags(updatedImage),
      meta: {
        generatedTags: aiTags,
        newlyAttached
      }
    });
  } catch (error) {
    next(error);
  }
};

export const searchByDialog = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);
    const { query, page = 1, limit = 20 } = req.body || {};

    if (!query || !query.trim()) {
      throw new AppError('请提供检索描述', 400);
    }

    const interpreted = await interpretSearchQuery(query);

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNumber - 1) * take;

    const where = {
      userId,
      AND: []
    };

    if (interpreted.keyword) {
      where.AND.push({
        OR: [
          {
            originalFilename: {
              contains: interpreted.keyword
            }
          },
          {
            deviceInfo: {
              contains: interpreted.keyword
            }
          },
          {
            location: {
              contains: interpreted.keyword
            }
          }
        ]
      });
    }

    if (interpreted.location) {
      where.AND.push({
        location: {
          contains: interpreted.location
        }
      });
    }

    if (interpreted.dateRange) {
      const dateFilter = {};
      if (interpreted.dateRange.start) {
        dateFilter.gte =
          interpreted.dateRange.start instanceof Date
            ? interpreted.dateRange.start
            : new Date(interpreted.dateRange.start);
      }
      if (interpreted.dateRange.end) {
        dateFilter.lte =
          interpreted.dateRange.end instanceof Date
            ? interpreted.dateRange.end
            : new Date(interpreted.dateRange.end);
      }
      if (Object.keys(dateFilter).length > 0) {
        where.AND.push({
          OR: [
            { shootingTime: dateFilter },
            { createdAt: dateFilter }
          ]
        });
      }
    }

    if (interpreted.tags && interpreted.tags.length > 0) {
      where.AND.push({
        imageTags: {
          some: {
            tag: {
              name: {
                in: interpreted.tags
              }
            }
          }
        }
      });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    const [total, images] = await Promise.all([
      prisma.image.count({ where }),
      prisma.image.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc'
        },
        include: includeTagRelation
      })
    ]);

    const filtersForResponse = {
      rawQuery: query,
      interpreted: {
        ...interpreted,
        dateRange: interpreted.dateRange
          ? {
              start: interpreted.dateRange.start
                ? new Date(interpreted.dateRange.start).toISOString()
                : null,
              end: interpreted.dateRange.end
                ? new Date(interpreted.dateRange.end).toISOString()
                : null
            }
          : null
      }
    };

    res.json({
      success: true,
      data: images.map(mapImageWithTags),
      filters: filtersForResponse,
      pagination: {
        page: pageNumber,
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    next(error);
  }
};


