import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { processImage } from '../services/imageService.js';
import { extractExif } from '../services/exifService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 上传图片
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('请选择要上传的图片', 400);
    }

    const userId = BigInt(req.user.userId);
    const file = req.file;

    // 生成缩略图
    const thumbnailPath = await processImage(file.path, file.filename);

    // 提取 EXIF 信息
    const exifData = await extractExif(file.path);

    // 保存图片信息到数据库
    const image = await prisma.image.create({
      data: {
        userId,
        originalFilename: file.originalname,
        storedPath: `uploads/originals/${file.filename}`,
        thumbnailPath: `uploads/thumbnails/${thumbnailPath}`,
        fileSize: BigInt(file.size),
        resolution: exifData.resolution,
        shootingTime: exifData.shootingTime,
        location: exifData.location,
        deviceInfo: exifData.deviceInfo,
      }
    });

    // 如果有 EXIF 标签，自动创建并关联
    if (exifData.tags && exifData.tags.length > 0) {
      for (const tagName of exifData.tags) {
        // 查找或创建标签
        let tag = await prisma.tag.findUnique({
          where: { name: tagName }
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: tagName,
              type: 2, // EXIF 标签
            }
          });
        }

        // 创建关联
        await prisma.imageTagRelation.create({
          data: {
            imageId: image.id,
            tagId: tag.id,
          }
        });
      }
    }

    // 获取完整的图片信息（包含标签）
    const imageWithTags = await prisma.image.findUnique({
      where: { id: image.id },
      include: {
        imageTags: {
          include: {
            tag: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: '图片上传成功',
      data: {
        ...imageWithTags,
        tags: imageWithTags.imageTags.map(it => it.tag)
      }
    });
  } catch (error) {
    // 如果出错，删除已上传的文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('删除文件失败:', err);
      }
    }
    next(error);
  }
};

// 获取图片列表
export const getImages = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);
    const {
      page = 1,
      limit = 20,
      keyword,
      startDate,
      endDate,
      tags,
      location,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // 构建查询条件
    const where = {
      userId,
      AND: []
    };

    // 关键词搜索（文件名）
    if (keyword) {
      where.AND.push({
        originalFilename: {
          contains: keyword
        }
      });
    }

    // 时间范围
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      where.AND.push({
        createdAt: dateFilter
      });
    }

    // 拍摄地点
    if (location) {
      where.AND.push({
        location: {
          contains: location
        }
      });
    }

    // 标签过滤
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.AND.push({
        imageTags: {
          some: {
            tag: {
              name: {
                in: tagArray
              }
            }
          }
        }
      });
    }

    // 如果没有任何条件，删除 AND
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // 查询总数
    const total = await prisma.image.count({ where });

    // 查询图片列表
    const images = await prisma.image.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        imageTags: {
          include: {
            tag: true
          }
        }
      }
    });

    // 格式化返回数据
    const formattedImages = images.map(image => ({
      ...image,
      tags: image.imageTags.map(it => it.tag),
      imageTags: undefined
    }));

    res.json({
      success: true,
      data: {
        images: formattedImages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取单张图片详情
export const getImageById = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);
    const imageId = BigInt(req.params.id);

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      },
      include: {
        imageTags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!image) {
      throw new AppError('图片不存在', 404);
    }

    res.json({
      success: true,
      data: {
        ...image,
        tags: image.imageTags.map(it => it.tag),
        imageTags: undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// 更新图片信息
export const updateImage = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);
    const imageId = BigInt(req.params.id);
    const { originalFilename } = req.body;

    // 验证图片是否属于当前用户
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      throw new AppError('图片不存在', 404);
    }

    // 更新图片信息
    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: {
        originalFilename: originalFilename || image.originalFilename,
      },
      include: {
        imageTags: {
          include: {
            tag: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: '图片信息更新成功',
      data: {
        ...updatedImage,
        tags: updatedImage.imageTags.map(it => it.tag),
        imageTags: undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// 删除图片
export const deleteImage = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);
    const imageId = BigInt(req.params.id);

    // 验证图片是否属于当前用户
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      throw new AppError('图片不存在', 404);
    }

    // 删除物理文件
    const originalPath = path.join(__dirname, '../..', image.storedPath);
    const thumbnailPath = path.join(__dirname, '../..', image.thumbnailPath);

    try {
      await fs.unlink(originalPath);
      await fs.unlink(thumbnailPath);
    } catch (err) {
      console.error('删除文件失败:', err);
    }

    // 删除数据库记录（级联删除标签关联）
    await prisma.image.delete({
      where: { id: imageId }
    });

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 为图片添加标签
export const addImageTags = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);
    const imageId = BigInt(req.params.id);
    const { tags } = req.body; // tags 是字符串数组

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      throw new AppError('请提供标签列表', 400);
    }

    // 验证图片是否属于当前用户
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      throw new AppError('图片不存在', 404);
    }

    // 为每个标签创建或查找，并建立关联
    for (const tagName of tags) {
      // 查找或创建标签
      let tag = await prisma.tag.findUnique({
        where: { name: tagName }
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagName,
            type: 1, // 用户自定义标签
          }
        });
      }

      // 创建关联（如果已存在则忽略）
      try {
        await prisma.imageTagRelation.create({
          data: {
            imageId,
            tagId: tag.id,
          }
        });
      } catch (error) {
        // 忽略重复关联错误
        if (error.code !== 'P2002') {
          throw error;
        }
      }
    }

    // 获取更新后的图片信息
    const updatedImage = await prisma.image.findUnique({
      where: { id: imageId },
      include: {
        imageTags: {
          include: {
            tag: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: '标签添加成功',
      data: {
        ...updatedImage,
        tags: updatedImage.imageTags.map(it => it.tag),
        imageTags: undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

// 移除图片标签
export const removeImageTag = async (req, res, next) => {
  try {
    const userId = BigInt(req.user.userId);
    const imageId = BigInt(req.params.id);
    const tagId = BigInt(req.params.tagId);

    // 验证图片是否属于当前用户
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      throw new AppError('图片不存在', 404);
    }

    // 删除关联
    await prisma.imageTagRelation.deleteMany({
      where: {
        imageId,
        tagId
      }
    });

    res.json({
      success: true,
      message: '标签移除成功'
    });
  } catch (error) {
    next(error);
  }
};

