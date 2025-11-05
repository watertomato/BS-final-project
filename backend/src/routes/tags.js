import express from 'express';
import { getAllTags, getTagsByType } from '../controllers/tagController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// 所有标签路由都需要认证
router.use(authenticateToken);

// 获取所有标签
router.get('/', getAllTags);

// 按类型获取标签
router.get('/type/:type', getTagsByType);

export default router;

