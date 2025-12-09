import axios from 'axios';
import type { AxiosProgressEvent } from 'axios';
import type { UserInfo, UploadResponse, ImageInfo, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 401 错误处理：只有在已登录状态下访问受保护资源时才重定向
    // 登录接口的 401 错误不应该重定向，应该让组件处理错误消息
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      // 如果有 token 但请求失败，说明 token 过期或无效，需要重新登录
      if (token && !error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    // 返回错误对象，让调用方可以访问 error.response.data
    return Promise.reject(error);
  }
);

type LoginPayload = {
  username: string;
  password: string;
};

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

// 认证相关 API
export const authApi = {
  login: (data: LoginPayload): Promise<ApiResponse<{ token: string; user: UserInfo }>> => {
    return api.post('/auth/login', data);
  },
  register: (data: RegisterPayload): Promise<ApiResponse<UserInfo>> => {
    return api.post('/auth/register', data);
  },
  getCurrentUser: (): Promise<ApiResponse<UserInfo>> => {
    return api.get('/auth/me');
  },
};

// 用户相关 API（预留未来的资料编辑能力）
export const userApi = {
  // 获取用户信息
  getUserInfo: (): Promise<ApiResponse<UserInfo>> => {
    return authApi.getCurrentUser();
  },

  // 更新用户信息
  updateUserInfo: (data: Partial<UserInfo>): Promise<ApiResponse<UserInfo>> => {
    return api.put('/user/info', data);
  },

  // 上传头像
  uploadAvatar: (file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// 图片查询参数
type ImageQueryParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  tags?: string | string[];
  location?: string;
};

// 图片列表响应
type ImageListResponse = {
  images: ImageInfo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// 图片相关 API
export const imageApi = {
  // 上传图片
  uploadImage: (
    file: File,
    onUploadProgress?: (event: AxiosProgressEvent) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },

  // 获取图片列表（支持查询参数）
  getImages: (params?: ImageQueryParams): Promise<ApiResponse<ImageListResponse>> => {
    return api.get('/images', { params });
  },

  // 获取单个图片信息
  getImageInfo: (imageId: string): Promise<ApiResponse<ImageInfo>> => {
    return api.get(`/images/${imageId}`);
  },

  // 下载图片
  downloadImage: (imageId: string): Promise<Blob> => {
    return api.get(`/images/${imageId}/download`, {
      responseType: 'blob',
    });
  },

  // 删除图片
  deleteImage: (imageId: string): Promise<ApiResponse<void>> => {
    return api.delete(`/images/${imageId}`);
  },

  // 更新图片信息
  updateImage: (imageId: string, data: { originalFilename?: string }): Promise<ApiResponse<ImageInfo>> => {
    return api.put(`/images/${imageId}`, data);
  },

  // 替换图片文件（用于编辑后保存）
  replaceImageFile: (imageId: string, file: File): Promise<ApiResponse<ImageInfo>> => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/images/${imageId}/replace`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 为图片添加标签
  addImageTags: (imageId: string, tags: string[]): Promise<ApiResponse<ImageInfo>> => {
    return api.post(`/images/${imageId}/tags`, { tags });
  },

  // 移除图片标签
  removeImageTag: (imageId: string, tagId: string): Promise<ApiResponse<void>> => {
    return api.delete(`/images/${imageId}/tags/${tagId}`);
  },

  // AI 自动生成标签
  generateAiTags: (imageId: string, options?: { prompt?: string; maxTags?: number }): Promise<ApiResponse<ImageInfo>> => {
    return api.post(`/images/${imageId}/ai-tags`, options || {});
  },

  // AI 对话式搜索
  searchByDialog: (params: { query: string; page?: number; limit?: number }): Promise<ApiResponse<{
    images: ImageInfo[];
    filters: {
      rawQuery: string;
      interpreted: {
        tags: string[];
        location: string | null;
        dateRange: {
          start: string | null;
          end: string | null;
        } | null;
      };
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> => {
    return api.post('/images/search/dialog', params);
  },
};

export default api;

