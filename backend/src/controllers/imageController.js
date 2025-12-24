import prisma from '../utils/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { processImage } from '../services/imageService.js';
import { extractExif } from '../services/exifService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

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

    // 文件名编码已在中间件中处理
    const originalFilename = file.originalname;

    // 保存图片信息到数据库
    const image = await prisma.image.create({
      data: {
        userId,
        originalFilename: originalFilename,
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

    // 格式化返回数据，处理 BigInt
    const formattedImage = {
      id: imageWithTags.id.toString(),
      userId: imageWithTags.userId.toString(),
      originalFilename: imageWithTags.originalFilename,
      storedPath: imageWithTags.storedPath,
      thumbnailPath: imageWithTags.thumbnailPath,
      fileSize: imageWithTags.fileSize ? imageWithTags.fileSize.toString() : null,
      resolution: imageWithTags.resolution,
      shootingTime: imageWithTags.shootingTime,
      location: imageWithTags.location,
      deviceInfo: imageWithTags.deviceInfo,
      createdAt: imageWithTags.createdAt,
      tags: imageWithTags.imageTags.map(it => ({
        id: it.tag.id.toString(),
        name: it.tag.name,
        type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai',
        createdAt: it.tag.createdAt,
      })),
    };

    res.status(201).json({
      success: true,
      message: '图片上传成功',
      data: formattedImage
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

    // 标签过滤（AND 逻辑：图片必须同时包含所有指定的标签）
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      if (tagArray.length > 0) {
        // 为每个标签创建一个条件，使用 AND 连接
        const tagConditions = tagArray.map(tagName => ({
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
      }
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

    // 格式化返回数据，处理 BigInt
    const formattedImages = images.map(image => ({
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
      tags: image.imageTags.map(it => ({
        id: it.tag.id.toString(),
        name: it.tag.name,
        type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai',
        createdAt: it.tag.createdAt,
      })),
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

    // 格式化返回数据，处理 BigInt
    const formattedImage = {
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
      tags: image.imageTags.map(it => ({
        id: it.tag.id.toString(),
        name: it.tag.name,
        type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai',
        createdAt: it.tag.createdAt,
      })),
    };

    res.json({
      success: true,
      data: formattedImage
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

    // 格式化返回数据，处理 BigInt
    const formattedImage = {
      id: updatedImage.id.toString(),
      userId: updatedImage.userId.toString(),
      originalFilename: updatedImage.originalFilename,
      storedPath: updatedImage.storedPath,
      thumbnailPath: updatedImage.thumbnailPath,
      fileSize: updatedImage.fileSize ? updatedImage.fileSize.toString() : null,
      resolution: updatedImage.resolution,
      shootingTime: updatedImage.shootingTime,
      location: updatedImage.location,
      deviceInfo: updatedImage.deviceInfo,
      createdAt: updatedImage.createdAt,
      tags: updatedImage.imageTags.map(it => ({
        id: it.tag.id.toString(),
        name: it.tag.name,
        type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai',
        createdAt: it.tag.createdAt,
      })),
    };

    res.json({
      success: true,
      message: '图片信息更新成功',
      data: formattedImage
    });
  } catch (error) {
    next(error);
  }
};

// 替换图片文件（用于编辑后保存）
export const replaceImageFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('请选择要上传的图片', 400);
    }

    const userId = BigInt(req.user.userId);
    const imageId = BigInt(req.params.id);
    const file = req.file;

    // 验证图片是否属于当前用户
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        userId
      }
    });

    if (!image) {
      // 删除上传的文件
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.error('删除文件失败:', err);
      }
      throw new AppError('图片不存在', 404);
    }

    // 删除旧文件
    const oldOriginalPath = path.join(__dirname, '../..', image.storedPath);
    const oldThumbnailPath = path.join(__dirname, '../..', image.thumbnailPath);
    try {
      await fs.unlink(oldOriginalPath);
      await fs.unlink(oldThumbnailPath);
    } catch (err) {
      console.error('删除旧文件失败:', err);
    }

    // 生成新的缩略图
    const thumbnailPath = await processImage(file.path, file.filename);

    // 文件名编码已在中间件中处理
    const originalFilename = file.originalname;

    // 更新数据库
    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: {
        originalFilename: originalFilename,
        storedPath: `uploads/originals/${file.filename}`,
        thumbnailPath: `uploads/thumbnails/${thumbnailPath}`,
        fileSize: BigInt(file.size),
      },
      include: {
        imageTags: {
          include: {
            tag: true
          }
        }
      }
    });

    // 格式化返回数据，处理 BigInt
    const formattedImage = {
      id: updatedImage.id.toString(),
      userId: updatedImage.userId.toString(),
      originalFilename: updatedImage.originalFilename,
      storedPath: updatedImage.storedPath,
      thumbnailPath: updatedImage.thumbnailPath,
      fileSize: updatedImage.fileSize ? updatedImage.fileSize.toString() : null,
      resolution: updatedImage.resolution,
      shootingTime: updatedImage.shootingTime,
      location: updatedImage.location,
      deviceInfo: updatedImage.deviceInfo,
      createdAt: updatedImage.createdAt,
      tags: updatedImage.imageTags.map(it => ({
        id: it.tag.id.toString(),
        name: it.tag.name,
        type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai',
        createdAt: it.tag.createdAt,
      })),
    };

    res.json({
      success: true,
      message: '图片替换成功',
      data: formattedImage
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

    // 格式化返回数据，处理 BigInt
    const formattedImage = {
      id: updatedImage.id.toString(),
      userId: updatedImage.userId.toString(),
      originalFilename: updatedImage.originalFilename,
      storedPath: updatedImage.storedPath,
      thumbnailPath: updatedImage.thumbnailPath,
      fileSize: updatedImage.fileSize ? updatedImage.fileSize.toString() : null,
      resolution: updatedImage.resolution,
      shootingTime: updatedImage.shootingTime,
      location: updatedImage.location,
      deviceInfo: updatedImage.deviceInfo,
      createdAt: updatedImage.createdAt,
      tags: updatedImage.imageTags.map(it => ({
        id: it.tag.id.toString(),
        name: it.tag.name,
        type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai',
        createdAt: it.tag.createdAt,
      })),
    };

    res.json({
      success: true,
      message: '标签添加成功',
      data: formattedImage
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

// 下载图片
export const downloadImage = async (req, res, next) => {
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

    // 构建文件绝对路径
    const filePath = path.resolve(__dirname, '../..', image.storedPath);

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      throw new AppError('文件不存在', 404);
    }

    // 设置响应头，强制下载
    // 使用 RFC 5987 编码处理中文文件名
    // Sanitize filename to avoid invalid characters in header (CRLF, quotes, etc.)
    const rawFilename = image.originalFilename || 'download';
    const sanitizedFilename = rawFilename.replace(/[\r\n"]/g, '').trim() || 'download';
    const encodedFilename = encodeURIComponent(sanitizedFilename);
    // Use only the RFC5987 encoded filename* to avoid invalid characters in the simple filename parameter
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 发送文件
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

