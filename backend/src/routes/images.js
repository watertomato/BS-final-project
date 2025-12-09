import express from 'express';
import {
  uploadImage,
  getImages,
  getImageById,
  updateImage,
  replaceImageFile,
  deleteImage,
  addImageTags,
  removeImageTag,
  downloadImage,
} from '../controllers/imageController.js';
import {
  generateAiTagsForImage,
  searchByDialog,
} from '../controllers/aiController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { fixFilenameEncoding } from '../middlewares/filenameEncoding.js';

const router = express.Router();

// 所有图片路由都需要认证
router.use(authenticateToken);

// 上传图片
router.post('/upload', upload.single('image'), fixFilenameEncoding, uploadImage);

// 获取图片列表（支持查询）
router.get('/', getImages);

// 对话式检索图片（AI 解析意图）
router.post('/search/dialog', searchByDialog);

// 下载图片（必须在 /:id 之前，否则会被 /:id 匹配）
router.get('/:id/download', downloadImage);

// 获取单张图片详情
router.get('/:id', getImageById);

// 更新图片信息
router.put('/:id', updateImage);

// 替换图片文件（用于编辑后保存）
router.post('/:id/replace', upload.single('image'), fixFilenameEncoding, replaceImageFile);

// 删除图片
router.delete('/:id', deleteImage);

// 为图片添加标签
router.post('/:id/tags', addImageTags);

// AI 自动生成标签
router.post('/:id/ai-tags', generateAiTagsForImage);

// 移除图片标签
router.delete('/:id/tags/:tagId', removeImageTag);

export default router;

