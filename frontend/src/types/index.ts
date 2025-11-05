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

// 图片信息类型
export interface ImageInfo {
  id: string;
  filename: string;
  url: string;
  uploadTime: string;
  size?: number;
}

// API 响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

