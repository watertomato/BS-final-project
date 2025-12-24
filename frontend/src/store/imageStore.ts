import { autorun, makeAutoObservable } from 'mobx';
import { imageApi } from '../api';
import type { ImageInfo, Tag, TagType } from '../types';
import type { UserStore } from './userStore';

export type DateRange = [string | null, string | null] | null;

export interface ImageSearchParams {
  keyword: string;
  tagIds: string[];
  tagType: TagType | 'all';
  dateRange: DateRange;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface TagCloudItem extends Tag {
  count: number;
}

type TagsByType = Record<TagType, Tag[]>;

export class ImageStore {
  private readonly userStore: UserStore;
  images: ImageInfo[] = [];
  currentImage: ImageInfo | null = null;
  selectedImages: string[] = [];
  searchParams: ImageSearchParams = {
    keyword: '',
    tagIds: [],
    tagType: 'all',
    dateRange: null,
  };
  pagination: PaginationState = {
    page: 1,
    pageSize: 24,
    total: 0,
  };
  loading = false;
  error: string | null = null;
  selectionMode = false;

  constructor(userStore: UserStore) {
    this.userStore = userStore;
    makeAutoObservable(this, {}, { autoBind: true });

    autorun(() => {
      if (this.userStore.isLoggedIn) {
        void this.loadImages();
      } else {
        this.resetImagesState();
      }
    });
  }

  get filteredImages() {
    const { keyword, tagIds, tagType, dateRange } = this.searchParams;
    return this.images.filter((image) => {
      const keywordMatch =
        !keyword ||
        image.filename.toLowerCase().includes(keyword.toLowerCase()) ||
        image.tags?.some((tag) => tag.name.toLowerCase().includes(keyword.toLowerCase()));

      const tagMatch =
        tagIds.length === 0 ||
        image.tags?.some((tag) => tagIds.includes(tag.id)) ||
        false;

      const typeMatch =
        tagType === 'all' ||
        image.tags?.some((tag) => tag.type === tagType);

      const rangeMatch = (() => {
        if (!dateRange || (!dateRange[0] && !dateRange[1])) return true;
        const uploadTime = new Date(image.uploadTime).getTime();
        const [start, end] = dateRange;
        const startTime = start ? new Date(start).getTime() : null;
        const endTime = end ? new Date(end).getTime() : null;
        if (startTime && uploadTime < startTime) return false;
        if (endTime && uploadTime > endTime) return false;
        return true;
      })();

      return keywordMatch && tagMatch && typeMatch && rangeMatch;
    });
  }

  get pagedImages() {
    const { page, pageSize } = this.pagination;
    const start = (page - 1) * pageSize;
    return this.filteredImages.slice(start, start + pageSize);
  }

  get allTags(): Tag[] {
    const map = new Map<string, Tag>();
    this.images.forEach((image) => {
      image.tags?.forEach((tag) => {
        if (!map.has(tag.id)) {
          map.set(tag.id, tag);
        }
      });
    });
    return Array.from(map.values());
  }

  get tagsByType(): TagsByType {
    const grouped: TagsByType = {
      custom: [],
      exif: [],
      ai: [],
    };
    this.allTags.forEach((tag) => {
      grouped[tag.type].push(tag);
    });
    return grouped;
  }

  get tagCloud(): TagCloudItem[] {
    const counts = new Map<string, number>();
    this.images.forEach((image) => {
      image.tags?.forEach((tag) => {
        counts.set(tag.id, (counts.get(tag.id) || 0) + 1);
      });
    });
    return this.allTags.map((tag) => ({
      ...tag,
      count: counts.get(tag.id) || 0,
    }));
  }

  setSearchParams(params: Partial<ImageSearchParams>) {
    this.searchParams = { ...this.searchParams, ...params };
    this.setPagination({ page: 1 });
    this.refreshPaginationTotal();
  }

  setPagination(pagination: Partial<PaginationState>) {
    this.pagination = { ...this.pagination, ...pagination };
  }

  toggleSelectionMode(force?: boolean) {
    const value = typeof force === 'boolean' ? force : !this.selectionMode;
    this.selectionMode = value;
    if (!value) {
      this.selectedImages = [];
    }
  }

  selectImage(imageId: string) {
    if (!this.selectionMode) {
      this.selectionMode = true;
    }
    if (this.selectedImages.includes(imageId)) {
      this.selectedImages = this.selectedImages.filter((id) => id !== imageId);
    } else {
      this.selectedImages = [...this.selectedImages, imageId];
    }
  }

  setSelectedImages(imageIds: string[]) {
    this.selectedImages = Array.from(new Set(imageIds));
  }

  clearSelection() {
    this.selectedImages = [];
  }

  setCurrentImage(image: ImageInfo | null) {
    this.currentImage = image;
  }

  async loadImages() {
    if (!this.userStore.isLoggedIn) {
      this.resetImagesState();
      return;
    }
    try {
      this.loading = true;
      const response = await imageApi.getImages({ limit: 1000 });
      if (response.success && response.data) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const imgs = response.data.images || [];
        this.images = imgs.map((img: any) => ({
          id: img.id.toString(),
          filename: img.originalFilename,
          url: `${API_BASE_URL}/${img.storedPath}`,
          uploadTime: img.createdAt,
          size: img.fileSize ? parseInt(img.fileSize) : undefined,
          tags: img.tags?.map((t: any) => ({
            id: t.id.toString(),
            name: t.name,
            type: t.type === 1 ? 'custom' : t.type === 2 ? 'exif' : 'ai',
          })) || [],
          exif: {
            location: img.location || undefined,
            device: img.deviceInfo || undefined,
            dateTime: img.shootingTime || undefined,
            width: img.resolution ? parseInt(img.resolution.split('x')[0]) : undefined,
            height: img.resolution ? parseInt(img.resolution.split('x')[1]) : undefined,
          },
        }));
        this.refreshPaginationTotal();
      }
      this.error = null;
    } catch (error: any) {
      this.error = error?.message || '加载图片列表失败';
    } finally {
      this.loading = false;
    }
  }

  async fetchImageDetail(imageId: string) {
    try {
      this.loading = true;
      const response = await imageApi.getImageInfo(imageId);
      if (response.success && response.data) {
        this.currentImage = response.data;
      }
      this.error = null;
    } catch (error: any) {
      this.error = error?.message || '获取图片信息失败';
    } finally {
      this.loading = false;
    }
  }

  async uploadImage(file: File) {
    try {
      this.loading = true;
      const response = await imageApi.uploadImage(file);
      if (response.success) {
        await this.loadImages();
      }
      this.error = null;
      return response;
    } catch (error: any) {
      this.error = error?.message || '上传图片失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async deleteImage(imageId: string) {
    try {
      this.loading = true;
      const response = await imageApi.deleteImage(imageId);
      if (response.success) {
        this.images = this.images.filter((image) => image.id !== imageId);
        this.selectedImages = this.selectedImages.filter((id) => id !== imageId);
        if (this.currentImage?.id === imageId) {
          this.currentImage = null;
        }
        this.refreshPaginationTotal();
      }
      this.error = null;
      return response;
    } catch (error: any) {
      this.error = error?.message || '删除图片失败';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  private refreshPaginationTotal() {
    this.pagination = {
      ...this.pagination,
      total: this.filteredImages.length,
    };
  }

  private resetImagesState() {
    this.images = [];
    this.currentImage = null;
    this.selectedImages = [];
    this.pagination = { ...this.pagination, page: 1, total: 0 };
  }
}


