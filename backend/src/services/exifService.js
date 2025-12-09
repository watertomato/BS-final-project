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
        // ExifReader 返回的 GPS 坐标可能是数组格式 [度, 分, 秒] 或直接是数值
        let lat, lng;
        
        // 尝试从 description 获取（如果是字符串格式）
        if (tags.GPSLatitude.description && tags.GPSLongitude.description) {
          lat = tags.GPSLatitude.description;
          lng = tags.GPSLongitude.description;
        } 
        // 如果 description 不存在，尝试从 value 获取
        else if (tags.GPSLatitude.value && tags.GPSLongitude.value) {
          // GPS 坐标可能是数组 [度, 分, 秒] 格式
          if (Array.isArray(tags.GPSLatitude.value) && Array.isArray(tags.GPSLongitude.value)) {
            // 转换为十进制度数
            const latDeg = tags.GPSLatitude.value[0] || 0;
            const latMin = tags.GPSLatitude.value[1] || 0;
            const latSec = tags.GPSLatitude.value[2] || 0;
            lat = latDeg + latMin / 60 + latSec / 3600;
            
            const lngDeg = tags.GPSLongitude.value[0] || 0;
            const lngMin = tags.GPSLongitude.value[1] || 0;
            const lngSec = tags.GPSLongitude.value[2] || 0;
            lng = lngDeg + lngMin / 60 + lngSec / 3600;
        
            // 处理南纬和西经
            if (tags.GPSLatitudeRef?.description === 'S') lat = -lat;
            if (tags.GPSLongitudeRef?.description === 'W') lng = -lng;
            
            lat = lat.toFixed(6);
            lng = lng.toFixed(6);
          } else {
            lat = tags.GPSLatitude.value;
            lng = tags.GPSLongitude.value;
          }
        }
        
        if (lat && lng) {
          exifData.location = `${lat}, ${lng}`;
          // 添加 GPS 定位标签
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

