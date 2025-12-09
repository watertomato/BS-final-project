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
  
  // 格式化返回数据，处理 BigInt
  return {
    id: image.id.toString(),
    userId: image.userId.toString(),
    originalFilename: image.originalFilename,
    storedPath: image.storedPath,
    thumbnailPath: image.thumbnailPath,
    fileSize: image.fileSize ? image.fileSize.toString() : null,
    resolution: image.resolution,
    shootingTime: image.shootingTime,
    location: image.location,
    deviceInfo: image.deviceInfo,
    createdAt: image.createdAt,
    tags: image.imageTags?.map((it) => ({
      id: it.tag.id.toString(),
      name: it.tag.name,
      type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai',
      createdAt: it.tag.createdAt,
    })) || [],
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

    // 获取系统中所有已有的标签，让 LLM 优先从这些标签中选择
    // 限制最多 200 个标签，避免 prompt 过长
    const existingTags = await prisma.tag.findMany({
      select: {
        name: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 200
    });
    const existingTagNames = existingTags.map(tag => tag.name);

    const imagePath = path.join(__dirname, '../..', image.storedPath);
    const aiTags = await generateAiTags(imagePath, {
      prompt,
      maxTags,
      filename: image.originalFilename,
      existingTags: existingTagNames
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

    // 获取所有可用的标签和地点，供 LLM 选择
    const [allTags, allImages] = await Promise.all([
      prisma.tag.findMany({
        select: { name: true },
        orderBy: { createdAt: 'desc' },
        take: 200 // 限制数量，避免 prompt 过长
      }),
      prisma.image.findMany({
        where: { userId },
        select: { location: true },
        distinct: ['location']
      })
    ]);

    const availableTags = allTags.map(tag => tag.name);
    const availableLocations = allImages
      .map(img => img.location)
      .filter(loc => loc && loc.trim())
      .slice(0, 100); // 限制地点数量

    const interpreted = await interpretSearchQuery(query, {
      availableTags,
      availableLocations
    });

    console.log('=== AI 搜索查询构建 ===');
    console.log('解析后的搜索条件:', JSON.stringify(interpreted, null, 2));

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNumber - 1) * take;

    const where = {
      userId,
      AND: []
    };

    if (interpreted.location) {
      where.AND.push({
        location: {
          contains: interpreted.location
        }
      });
      console.log('添加地点条件:', interpreted.location);
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
        console.log('添加日期范围条件:', dateFilter);
      }
    }

    if (interpreted.tags && interpreted.tags.length > 0) {
      console.log('添加标签条件，标签列表:', interpreted.tags);
      // 检查数据库中是否存在这些标签
      const existingTagsInDb = await prisma.tag.findMany({
        where: {
          name: {
            in: interpreted.tags
          }
        },
        select: { name: true }
      });
      const existingTagNames = existingTagsInDb.map(t => t.name);
      console.log('数据库中实际存在的标签:', existingTagNames);
      console.log('不存在的标签:', interpreted.tags.filter(t => !existingTagNames.includes(t)));
      
      if (existingTagNames.length > 0) {
        // 使用 AND 逻辑：图片必须同时包含所有指定的标签
        // 为每个标签创建一个条件，使用 AND 连接
        const tagConditions = existingTagNames.map(tagName => ({
          imageTags: {
            some: {
              tag: {
                name: tagName
              }
            }
          }
        }));
        
        // 如果只有一个标签，直接添加；如果有多个标签，需要确保图片同时包含所有标签
        if (tagConditions.length === 1) {
          where.AND.push(tagConditions[0]);
        } else {
          // 多个标签：图片必须同时包含所有标签
          where.AND.push({
            AND: tagConditions
          });
        }
        console.log('使用标签条件进行查询（AND 逻辑：必须同时包含所有标签）');
      } else {
        console.log('警告：所有标签在数据库中都不存在，无法进行标签筛选');
      }
    }

    // 转换 BigInt 为字符串以便序列化
    const whereForLog = {
      userId: where.userId.toString(),
      AND: where.AND
    };
    console.log('构建的查询条件:', JSON.stringify(whereForLog, null, 2));
    
    if (where.AND.length === 0) {
      console.log('警告：没有有效的搜索条件，将返回所有图片');
      delete where.AND;
    }
    
    // 再次检查 where 对象，确保它没有被意外修改
    console.log('最终 where 对象检查:');
    console.log('- userId:', where.userId.toString());
    console.log('- AND 存在:', where.AND !== undefined);
    console.log('- AND 长度:', where.AND?.length || 0);
    console.log('=== AI 搜索查询构建结束 ===\n');

    console.log('=== 执行查询 ===');
    console.log('查询条件 where:', JSON.stringify({
      userId: where.userId.toString(),
      AND: where.AND
    }, null, 2));
    
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
    
    console.log('查询结果总数:', total);
    console.log('返回图片数量:', images.length);
    if (images.length > 0) {
      console.log('第一张图片的标签:', images[0].imageTags?.map(it => it.tag.name) || []);
    }
    console.log('=== 查询执行结束 ===\n');

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
      data: {
        images: images.map(mapImageWithTags),
        filters: filtersForResponse,
        pagination: {
          page: pageNumber,
          limit: take,
          total,
          totalPages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};


