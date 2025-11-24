// 用户信息类型
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

// 图片上传响应类型
export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    imageId: string;
    url: string;
    filename: string;
  };
}

// 标签类型
export type TagType = 'custom' | 'exif' | 'ai';

// 标签信息
export interface Tag {
  id: string;
  name: string;
  type: TagType;
}

// EXIF 信息
export interface ExifInfo {
  location?: string;
  device?: string;
  dateTime?: string;
  width?: number;
  height?: number;
}

// 图片信息类型
export interface ImageInfo {
  id: string;
  filename: string;
  url: string;
  uploadTime: string;
  size?: number;
  tags?: Tag[];
  exif?: ExifInfo;
}

// API 响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

