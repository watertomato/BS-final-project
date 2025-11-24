import type { ImageInfo } from '../types';

export const generateMockImages = (): ImageInfo[] => {
  return Array.from({ length: 30 }, (_, i) => {
    const imageId = `img-${i + 1}`;
    return {
      id: imageId,
      filename: `image-${i + 1}.jpg`,
      url: `https://picsum.photos/1600/900?random=${i + 1}`,
      uploadTime: new Date().toISOString(),
      size: 2500000 + Math.floor(Math.random() * 2000000),
      tags: [
        { id: '1', name: '风景', type: 'custom' },
        { id: '2', name: '旅行', type: 'custom' },
        { id: '3', name: 'iPhone 14 Pro', type: 'exif' },
      ],
      exif: {
        location: '北京',
        device: 'iPhone 14 Pro',
        dateTime: new Date().toISOString(),
        width: 1920 + Math.floor(Math.random() * 1000),
        height: 1080 + Math.floor(Math.random() * 1000),
      },
    };
  });
};

export const getMockImageById = (id: string): ImageInfo => {
  return {
    id,
    filename: `image-${id}.jpg`,
    url: `https://picsum.photos/1600/900?random=${id}`,
    uploadTime: new Date().toISOString(),
    size: 2500000,
    tags: [
      { id: '1', name: '风景', type: 'custom' },
      { id: '2', name: '旅行', type: 'custom' },
      { id: '3', name: 'iPhone 14 Pro', type: 'exif' },
    ],
    exif: {
      location: '上海',
      device: 'Canon EOS R5',
      dateTime: new Date().toISOString(),
      width: 2048,
      height: 1365,
    },
  };
};

