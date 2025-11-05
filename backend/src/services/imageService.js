import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 生成缩略图
export const processImage = async (imagePath, filename) => {
  try {
    const thumbnailFilename = `thumb_${filename}`;
    const thumbnailPath = path.join(__dirname, '../../uploads/thumbnails', thumbnailFilename);

    // 生成 300x300 的缩略图
    await sharp(imagePath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return thumbnailFilename;
  } catch (error) {
    console.error('生成缩略图失败:', error);
    throw new Error('图片处理失败');
  }
};

// 获取图片尺寸
export const getImageDimensions = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      resolution: `${metadata.width}x${metadata.height}`
    };
  } catch (error) {
    console.error('获取图片尺寸失败:', error);
    return null;
  }
};

