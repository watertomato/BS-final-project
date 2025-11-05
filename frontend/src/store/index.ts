import { makeAutoObservable } from 'mobx';
import type { UserInfo, ImageInfo } from '../types';
import { userApi, imageApi } from '../api';

class AppStore {
  userInfo: UserInfo | null = null;
  images: ImageInfo[] = [];
  loading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
    this.loadUserInfo();
    this.loadImages();
  }

  // 加载用户信息
  async loadUserInfo() {
    try {
      this.loading = true;
      const response = await userApi.getUserInfo();
      if (response.success && response.data) {
        this.userInfo = response.data;
      }
    } catch (error: any) {
      this.error = error.message || '加载用户信息失败';
    } finally {
      this.loading = false;
    }
  }

  // 更新用户信息
  async updateUserInfo(data: Partial<UserInfo>) {
    try {
      this.loading = true;
      const response = await userApi.updateUserInfo(data);
      if (response.success && response.data) {
        this.userInfo = { ...this.userInfo!, ...response.data };
      }
      return response;
    } catch (error: any) {
      this.error = error.message || '更新用户信息失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 上传头像
  async uploadAvatar(file: File) {
    try {
      this.loading = true;
      const response = await userApi.uploadAvatar(file);
      if (response.success && response.data) {
        this.userInfo = { ...this.userInfo!, avatar: response.data.url };
      }
      return response;
    } catch (error: any) {
      this.error = error.message || '上传头像失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 加载所有图片
  async loadImages() {
    try {
      this.loading = true;
      const response = await imageApi.getAllImages();
      if (response.success && response.data) {
        this.images = response.data;
      }
    } catch (error: any) {
      this.error = error.message || '加载图片列表失败';
    } finally {
      this.loading = false;
    }
  }

  // 上传图片
  async uploadImage(file: File) {
    try {
      this.loading = true;
      const response = await imageApi.uploadImage(file);
      if (response.success) {
        await this.loadImages(); // 重新加载图片列表
      }
      return response;
    } catch (error: any) {
      this.error = error.message || '上传图片失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 删除图片
  async deleteImage(imageId: string) {
    try {
      this.loading = true;
      const response = await imageApi.deleteImage(imageId);
      if (response.success) {
        this.images = this.images.filter((img) => img.id !== imageId);
      }
      return response;
    } catch (error: any) {
      this.error = error.message || '删除图片失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  // 清除错误
  clearError() {
    this.error = null;
  }
}

export const appStore = new AppStore();

