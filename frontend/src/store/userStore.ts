import { makeAutoObservable } from 'mobx';
import { userApi } from '../api';
import type { UserInfo } from '../types';

export class UserStore {
  user: UserInfo | null = null;
  token: string | null = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  loading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    if (this.token) {
      this.fetchUser();
    }
  }

  get isLoggedIn() {
    return Boolean(this.token);
  }

  private setToken(token: string | null) {
    this.token = token;
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  private setLoading(status: boolean) {
    this.loading = status;
  }

  private setError(message: string | null) {
    this.error = message;
  }

  async fetchUser() {
    try {
      this.setLoading(true);
      const response = await userApi.getUserInfo();
      if (response.success && response.data) {
        this.user = response.data;
      }
      this.setError(null);
    } catch (error: any) {
      this.setError(error?.message || '获取用户信息失败');
    } finally {
      this.setLoading(false);
    }
  }

  async updateUserInfo(data: Partial<UserInfo>) {
    try {
      this.setLoading(true);
      const response = await userApi.updateUserInfo(data);
      if (response.success && response.data) {
        this.user = { ...this.user, ...response.data } as UserInfo;
      }
      this.setError(null);
      return response;
    } catch (error: any) {
      this.setError(error?.message || '更新用户信息失败');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async uploadAvatar(file: File) {
    try {
      this.setLoading(true);
      const response = await userApi.uploadAvatar(file);
      if (response.success && response.data && this.user) {
        this.user = { ...this.user, avatar: response.data.url };
      }
      this.setError(null);
      return response;
    } catch (error: any) {
      this.setError(error?.message || '上传头像失败');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  login(token: string) {
    this.setToken(token);
    return this.fetchUser();
  }

  logout() {
    this.setToken(null);
    this.user = null;
  }
}


