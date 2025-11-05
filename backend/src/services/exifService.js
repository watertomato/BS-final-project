import ExifReader from 'exifreader';
import fs from 'fs/promises';
import { getImageDimensions } from './imageService.js';

// 提取 EXIF 信息
export const extractExif = async (imagePath) => {
  try {
    const fileBuffer = await fs.readFile(imagePath);
    const tags = ExifReader.load(fileBuffer);

    const exifData = {
      resolution: null,
      shootingTime: null,
      location: null,
      deviceInfo: null,
      tags: []
    };

    // 获取图片分辨率
    const dimensions = await getImageDimensions(imagePath);
    if (dimensions) {
      exifData.resolution = dimensions.resolution;
    }

    // 拍摄时间
    if (tags.DateTime || tags.DateTimeOriginal) {
      const dateTimeTag = tags.DateTimeOriginal || tags.DateTime;
      if (dateTimeTag.description) {
        try {
          // EXIF 时间格式: "2023:11:05 14:30:00"
          const dateStr = dateTimeTag.description.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
          exifData.shootingTime = new Date(dateStr);
        } catch (err) {
          console.error('解析拍摄时间失败:', err);
        }
      }
    }

    // 设备信息
    const make = tags.Make?.description;
    const model = tags.Model?.description;
    if (make || model) {
      exifData.deviceInfo = [make, model].filter(Boolean).join(' ');
      exifData.tags.push(exifData.deviceInfo); // 设备信息作为标签
    }

    // GPS 位置信息
    if (tags.GPSLatitude && tags.GPSLongitude) {
      try {
        const lat = tags.GPSLatitude.description;
        const lng = tags.GPSLongitude.description;
        exifData.location = `${lat}, ${lng}`;
        
        // 如果有城市或地区信息
        if (tags.GPSDestLatitude?.description) {
          exifData.tags.push('GPS定位');
        }
      } catch (err) {
        console.error('解析GPS信息失败:', err);
      }
    }

    // 提取其他可能的标签信息
    // 光圈
    if (tags.FNumber?.description) {
      exifData.tags.push(`光圈 ${tags.FNumber.description}`);
    }

    // ISO
    if (tags.ISOSpeedRatings?.description) {
      exifData.tags.push(`ISO ${tags.ISOSpeedRatings.description}`);
    }

    // 焦距
    if (tags.FocalLength?.description) {
      exifData.tags.push(`焦距 ${tags.FocalLength.description}`);
    }

    return exifData;
  } catch (error) {
    console.error('提取EXIF信息失败:', error);
    
    // 即使EXIF提取失败，也要返回基本的分辨率信息
    const dimensions = await getImageDimensions(imagePath);
    return {
      resolution: dimensions?.resolution || null,
      shootingTime: null,
      location: null,
      deviceInfo: null,
      tags: []
    };
  }
};

