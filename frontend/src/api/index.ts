import axios from 'axios';
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 用户相关 API
export const userApi = {
  // 获取用户信息
  getUserInfo: (): Promise<ApiResponse<UserInfo>> => {
    return api.get('/user/info');
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

// 图片相关 API
export const imageApi = {
  // 上传图片
  uploadImage: (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 获取所有图片
  getAllImages: (): Promise<ApiResponse<ImageInfo[]>> => {
    return api.get('/images');
  },

  // 获取单个图片信息
  getImageInfo: (imageId: string): Promise<ApiResponse<ImageInfo>> => {
    return api.get(`/images/${imageId}`);
  },

  // 删除图片
  deleteImage: (imageId: string): Promise<ApiResponse<void>> => {
    return api.delete(`/images/${imageId}`);
  },
};

export default api;

