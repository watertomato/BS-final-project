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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
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

