import { observer } from 'mobx-react-lite';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Input,
  Button,
  Card,
  Image,
  Tag,
  Dropdown,
  Tabs,
  DatePicker,
  Grid,
  Space,
  message,
  Popconfirm,
  Modal,
  Row,
  Col,
  Avatar,
  Select,
  Drawer,
  Pagination,
  Slider,
  Tooltip,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  UploadOutlined,
  UserOutlined,
  FilterOutlined,
  SelectOutlined,
  LogoutOutlined,
  CheckSquareOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  PlayCircleOutlined,
  PauseCircleOutlined,
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  SettingOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ImageInfo, Tag as TagType } from '../../types';
import { formatDateTime, formatFileSize } from '../../utils';
import { userStore } from '../../store';
import { imageApi } from '../../api';
import { Dayjs } from 'dayjs';
import PageHeaderBar from '../common/PageHeaderBar';

const { Sider, Content } = Layout;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

 

// 将后端数据格式转换为前端格式
const transformImageData = (image: any): ImageInfo => {
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/api\/?$/i, '');
  
  return {
    id: image.id,
    filename: image.originalFilename,
    url: `${API_BASE_URL}/${image.storedPath}`,
    uploadTime: image.createdAt,
    size: image.fileSize ? parseInt(image.fileSize) : undefined,
    tags: image.tags?.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
    })) || [],
    exif: {
      location: image.location || undefined,
      device: image.deviceInfo || undefined,
      dateTime: image.shootingTime || undefined,
      width: image.resolution ? parseInt(image.resolution.split('x')[0]) : undefined,
      height: image.resolution ? parseInt(image.resolution.split('x')[1]) : undefined,
    },
  };
};

const HomeComponent = observer(() => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens?.md;
  const [collapsed, setCollapsed] = useState(false);
  const [searchMode, setSearchMode] = useState<'quick' | 'advanced'>('quick');
  const [advancedTab, setAdvancedTab] = useState<'condition' | 'ai'>('condition');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageInfo | null>(null);
  const [carouselVisible, setCarouselVisible] = useState(false);
  const [carouselImages, setCarouselImages] = useState<ImageInfo[]>([]);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [carouselAutoPlay, setCarouselAutoPlay] = useState(false);
  const [carouselSpeed, setCarouselSpeed] = useState(3); // 秒
  const [carouselSettingsVisible, setCarouselSettingsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [loading, setLoading] = useState(false);
  const [totalImages, setTotalImages] = useState(0);
  const [editFilenameVisible, setEditFilenameVisible] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [batchTagModalVisible, setBatchTagModalVisible] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');

  // 搜索和筛选状态
  const [quickSearch, setQuickSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [advancedSearch, setAdvancedSearch] = useState({
    filename: '',
    tags: [] as string[],
    dateRange: null as [Dayjs | null, Dayjs | null] | null,
    location: '',
    device: '',
  });
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isAiSearchActive, setIsAiSearchActive] = useState(false);

  // Mobile full-screen filter drawer states (temps used so confirm/cancel can be handled)
  const [mobileFilterVisible, setMobileFilterVisible] = useState(false);
  const [tempSearchMode, setTempSearchMode] = useState<'quick' | 'advanced'>('quick');
  const [tempAdvancedTab, setTempAdvancedTab] = useState<'condition' | 'ai'>('condition');
  const [tempQuickSearch, setTempQuickSearch] = useState('');
  const [tempSelectedTags, setTempSelectedTags] = useState<Set<string>>(new Set());
  const [tempDateRange, setTempDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [tempAdvancedSearch, setTempAdvancedSearch] = useState({
    filename: '',
    tags: [] as string[],
    dateRange: null as [Dayjs | null, Dayjs | null] | null,
    location: '',
    device: '',
  });
  const [tempAiSearchQuery, setTempAiSearchQuery] = useState('');
  // Mobile search modal
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  // 真实数据
  const [allImages, setAllImages] = useState<ImageInfo[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageInfo[]>([]);

  // 从 API 加载图片
  const loadImages = async () => {
    try {
      setLoading(true);
      
      // 如果正在进行 AI 搜索，使用 AI 搜索接口
      if (isAiSearchActive && aiSearchQuery.trim()) {
        const response = await imageApi.searchByDialog({ 
          query: aiSearchQuery, 
          page: currentPage, 
          limit: pageSize 
        });
        
        if (response.success && response.data) {
          const images = response.data.images || [];
          const transformedImages = images.map(transformImageData);
          const pagination = response.data.pagination || {
            total: transformedImages.length,
            page: currentPage,
            limit: pageSize,
            totalPages: Math.ceil(transformedImages.length / pageSize)
          };
          
          console.log('loadImages - AI 搜索结果:', {
            total: pagination.total,
            returned: images.length,
            transformed: transformedImages.length
          });
          setAllImages(transformedImages);
          setFilteredImages(transformedImages);
          setTotalImages(pagination.total);
          setCurrentPage(pagination.page);
        }
        return;
      }
      
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };

      // 快速搜索模式
      if (searchMode === 'quick') {
        if (quickSearch) {
          params.keyword = quickSearch;
        }
        if (selectedTags.size > 0) {
          // 获取标签名称
          const tagNames = Array.from(selectedTags).map(tagId => {
            const tag = allTags.find(t => t.id === tagId);
            return tag?.name;
          }).filter(Boolean);
          if (tagNames.length > 0) {
            params.tags = tagNames;
          }
        }
        if (dateRange && dateRange[0] && dateRange[1]) {
          params.startDate = dateRange[0].startOf('day').toISOString();
          params.endDate = dateRange[1].endOf('day').toISOString();
        }
      } else {
        // 高级搜索模式
        if (advancedSearch.filename) {
          params.keyword = advancedSearch.filename;
        }
        if (advancedSearch.tags.length > 0) {
          // 将标签 ID 转换为标签名称
          const tagNames = advancedSearch.tags.map(tagId => {
            const tag = allTags.find(t => t.id === tagId);
            return tag?.name;
          }).filter(Boolean);
          if (tagNames.length > 0) {
            params.tags = tagNames;
          }
        }
        if (advancedSearch.dateRange && advancedSearch.dateRange[0] && advancedSearch.dateRange[1]) {
          params.startDate = advancedSearch.dateRange[0].startOf('day').toISOString();
          params.endDate = advancedSearch.dateRange[1].endOf('day').toISOString();
        }
        if (advancedSearch.location) {
          params.location = advancedSearch.location;
        }
      }

      const response = await imageApi.getImages(params);
      if (response.success && response.data) {
        const transformedImages = response.data.images.map(transformImageData);
        setAllImages(transformedImages);
        setFilteredImages(transformedImages);
        setTotalImages(response.data.pagination.total);
      }
    } catch (error: any) {
      console.error('加载图片失败:', error);
      message.error('加载图片失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和筛选条件变化时重新加载
  // 注意：advancedSearch 不包含在依赖中，因为高级搜索需要点击按钮才执行
  useEffect(() => {
    // 如果正在进行 AI 搜索，且不是初始加载，则使用 AI 搜索接口
    // 注意：AI 搜索的初始调用在 handleAISearch 中完成，这里只处理分页
    if (isAiSearchActive && aiSearchQuery.trim()) {
      loadImages();
    } else if (!isAiSearchActive) {
      // 普通搜索模式，正常加载（只处理快速搜索和分页）
      loadImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, quickSearch, selectedTags, dateRange, searchMode]);

  // 所有标签（从图片中提取）
  const allTags = useMemo(() => {
    const tagMap = new Map<string, TagType>();
    allImages.forEach((img) => {
      img.tags?.forEach((tag) => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [allImages]);

  // 标签云数据（带计数）
  const tagCloud = useMemo(() => {
    const countMap = new Map<string, number>();
    allImages.forEach((img) => {
      img.tags?.forEach((tag) => {
        countMap.set(tag.id, (countMap.get(tag.id) || 0) + 1);
      });
    });
    return allTags.map((tag) => ({
      ...tag,
      count: countMap.get(tag.id) || 0,
    }));
  }, [allTags, allImages]);

  // 处理标签点击
  const handleTagClick = (tagId: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTags(newSelected);
  };

  // 重置快速筛选
  const handleResetQuickFilter = () => {
    setQuickSearch('');
    setSelectedTags(new Set());
    setDateRange(null);
  };

  // 高级搜索
  const handleAdvancedSearch = () => {
    setCurrentPage(1); // 搜索时重置到第一页
    loadImages();
  };

  // AI 搜索
  const handleAISearch = async () => {
    if (!aiSearchQuery.trim()) {
      message.warning('请输入搜索内容');
      return;
    }
    try {
      setLoading(true);
      // 先设置 AI 搜索状态，但使用函数式更新确保立即生效
      setIsAiSearchActive(true);
      
      const response = await imageApi.searchByDialog({ 
        query: aiSearchQuery, 
        page: 1, 
        limit: pageSize 
      });
      
      if (response.success && response.data) {
        // 转换图片数据
        const images = response.data.images || [];
        const transformedImages = images.map(transformImageData);
        
        // 获取分页信息
        const pagination = response.data.pagination || {
          total: transformedImages.length,
          page: 1,
          limit: pageSize,
          totalPages: Math.ceil(transformedImages.length / pageSize)
        };
        
        // 获取 filters 信息
        const filters = response.data.filters || null;
        
        console.log('AI 搜索结果 (handleAISearch):', {
          total: pagination.total,
          returned: images.length,
          transformed: transformedImages.length,
          firstImageTags: transformedImages[0]?.tags?.map(t => t.name) || [],
          allImageIds: transformedImages.map(img => img.id)
        });
        
        // 直接设置图片数据，不依赖 useEffect
        setAllImages(transformedImages);
        setFilteredImages(transformedImages);
        setTotalImages(pagination.total);
        setCurrentPage(pagination.page);
        
        // 显示 AI 解析的结果（可选）
        const interpreted = filters?.interpreted;
        if (interpreted) {
          const parts = [];
          if (interpreted.tags && interpreted.tags.length > 0) {
            parts.push(`标签: ${interpreted.tags.join('、')}`);
          }
          if (interpreted.location) {
            parts.push(`地点: ${interpreted.location}`);
          }
          if (interpreted.dateRange?.start || interpreted.dateRange?.end) {
            const start = interpreted.dateRange.start ? new Date(interpreted.dateRange.start).toLocaleDateString() : '';
            const end = interpreted.dateRange.end ? new Date(interpreted.dateRange.end).toLocaleDateString() : '';
            parts.push(`时间: ${start}${start && end ? ' - ' : ''}${end}`);
          }
          if (parts.length > 0) {
            message.success(`AI 解析结果: ${parts.join(' | ')}`);
          }
        }
        
        message.success(`找到 ${response.data.pagination.total} 张图片`);
      } else {
        message.error(response.message || 'AI 搜索失败');
        setIsAiSearchActive(false);
      }
    } catch (error: any) {
      console.error('AI 搜索失败:', error);
      message.error(error?.response?.data?.message || 'AI 搜索失败，请稍后重试');
      setIsAiSearchActive(false);
    } finally {
      setLoading(false);
    }
  };

  // 重置 AI 搜索
  const handleResetAISearch = async () => {
    // 先重置状态
    setAiSearchQuery('');
    setIsAiSearchActive(false);
    setCurrentPage(1);
    
    // 直接调用普通搜索接口，不依赖状态
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: pageSize,
      };
      
      const response = await imageApi.getImages(params);
      if (response.success && response.data) {
        const transformedImages = response.data.images.map(transformImageData);
        setAllImages(transformedImages);
        setFilteredImages(transformedImages);
        setTotalImages(response.data.pagination.total);
      }
    } catch (error: any) {
      console.error('重置搜索失败:', error);
      message.error('重置搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 重置高级搜索
  const handleResetAdvancedSearch = () => {
    setAdvancedSearch({
      filename: '',
      tags: [],
      dateRange: null,
      location: '',
      device: '',
    });
    setAiSearchQuery('');
    setIsAiSearchActive(false);
    setCurrentPage(1); // 重置时回到第一页
    loadImages();
  };

  // Mobile drawer helpers
  const openMobileFilter = () => {
    setTempSearchMode(searchMode);
    setTempAdvancedTab(advancedTab);
    setTempQuickSearch(quickSearch);
    setTempSelectedTags(new Set(selectedTags));
    setTempDateRange(dateRange);
    setTempAdvancedSearch({ ...advancedSearch });
    setTempAiSearchQuery(aiSearchQuery);
    setMobileFilterVisible(true);
  };

  const handleMobileFilterCancel = () => {
    setMobileFilterVisible(false);
  };

  const handleMobileFilterConfirm = async () => {
    // Apply main state
    setSearchMode(tempSearchMode);
    setAdvancedTab(tempAdvancedTab);
    setQuickSearch(tempQuickSearch);
    setSelectedTags(new Set(tempSelectedTags));
    setDateRange(tempDateRange);
    setAdvancedSearch({ ...tempAdvancedSearch });
    setAiSearchQuery(tempAiSearchQuery);
    setCurrentPage(1);
    setMobileFilterVisible(false);

    // Immediately fetch using the temp values (don't rely on setState async)
    try {
      setLoading(true);
      // If user used AI tab with a query, call AI search
      if (tempAdvancedTab === 'ai' && tempAiSearchQuery.trim()) {
        const response = await imageApi.searchByDialog({
          query: tempAiSearchQuery,
          page: 1,
          limit: pageSize,
        });
        if (response.success && response.data) {
          const transformed = response.data.images.map(transformImageData);
          setAllImages(transformed);
          setFilteredImages(transformed);
          setTotalImages(response.data.pagination?.total || transformed.length);
          setCurrentPage(response.data.pagination?.page || 1);
        } else {
          message.error(response.message || 'AI 搜索失败');
        }
        return;
      }

      // Otherwise perform normal images fetch using temp filters
      const params: any = { page: 1, limit: pageSize };
      if (tempSearchMode === 'quick') {
        if (tempQuickSearch) params.keyword = tempQuickSearch;
        if (tempSelectedTags.size > 0) {
          const tagNames = Array.from(tempSelectedTags).map((tagId) => {
            const tag = allTags.find((t) => t.id === tagId);
            return tag?.name;
          }).filter(Boolean);
          if (tagNames.length > 0) params.tags = tagNames;
        }
        if (tempDateRange && tempDateRange[0] && tempDateRange[1]) {
          params.startDate = tempDateRange[0].startOf('day').toISOString();
          params.endDate = tempDateRange[1].endOf('day').toISOString();
        }
      } else {
        if (tempAdvancedSearch.filename) params.keyword = tempAdvancedSearch.filename;
        if (tempAdvancedSearch.tags.length > 0) {
          const tagNames = tempAdvancedSearch.tags.map((tagId) => {
            const tag = allTags.find((t) => t.id === tagId);
            return tag?.name;
          }).filter(Boolean);
          if (tagNames.length > 0) params.tags = tagNames;
        }
        if (tempAdvancedSearch.dateRange && tempAdvancedSearch.dateRange[0] && tempAdvancedSearch.dateRange[1]) {
          params.startDate = tempAdvancedSearch.dateRange[0].startOf('day').toISOString();
          params.endDate = tempAdvancedSearch.dateRange[1].endOf('day').toISOString();
        }
        if (tempAdvancedSearch.location) params.location = tempAdvancedSearch.location;
      }

      const response = await imageApi.getImages(params);
      if (response.success && response.data) {
        const transformed = response.data.images.map(transformImageData);
        setAllImages(transformed);
        setFilteredImages(transformed);
        setTotalImages(response.data.pagination.total);
        setCurrentPage(response.data.pagination.page);
      } else {
        message.error(response.message || '搜索失败');
      }
    } catch (error: any) {
      console.error('移动筛选搜索失败:', error);
      message.error(error?.response?.data?.message || '搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 选择模式切换
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedImages(new Set());
  };

  // 图片选择
  const handleImageSelect = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map((img) => img.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedImages.size === 0) {
      message.warning('请先选择要删除的图片');
      return;
    }
    try {
      setLoading(true);
      const ids = Array.from(selectedImages);
      const results = await Promise.allSettled(ids.map((id) => imageApi.deleteImage(id)));
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        message.success(`成功删除 ${succeeded} 张图片${failed > 0 ? `，${failed} 张删除失败` : ''}`);
      }
      if (failed > 0) {
        console.error('批量删除失败详情:', results.filter((r) => r.status === 'rejected'));
        message.error(`${failed} 张图片删除失败，请稍后重试`);
      }
      // 刷新列表
      setSelectedImages(new Set());
      setSelectionMode(false);
      await loadImages();
    } catch (error: any) {
      console.error('批量删除失败:', error);
      message.error(error?.response?.data?.message || '批量删除失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 批量添加标签
  const handleBatchAddTags = () => {
    // Always open modal so user can enter tags; confirmation will ask how to apply if no images selected
    setBatchTagInput('');
    setBatchTagModalVisible(true);
  };

  const handleConfirmBatchAddTags = async () => {
    const raw = batchTagInput || '';
    const tags = raw
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) {
      message.warning('请输入至少一个标签（逗号或空格分隔）');
      return;
    }

    // If no images selected, ask user whether to apply to all currently displayed images
    const applyToIds = async (ids: string[]) => {
      try {
        setLoading(true);
        const results = await Promise.allSettled(ids.map((id) => imageApi.addImageTags(id, tags)));
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - succeeded;
        if (succeeded > 0) {
          message.success(`成功为 ${succeeded} 张图片添加标签${failed > 0 ? `，${failed} 张失败` : ''}`);
        }
        if (failed > 0) {
          console.error('批量添加标签失败详情:', results.filter((r) => r.status === 'rejected'));
          message.error(`${failed} 张图片添加标签失败，请稍后重试`);
        }
        // 刷新列表
        setSelectedImages(new Set());
        setSelectionMode(false);
        await loadImages();
        setBatchTagModalVisible(false);
      } catch (error: any) {
        console.error('批量添加标签失败:', error);
        message.error(error?.response?.data?.message || '批量添加标签失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    if (selectedImages.size === 0) {
      const total = filteredImages.length;
      Modal.confirm({
        title: '未选中图片',
        content: `当前未选中任何图片。是否将标签应用到当前列表的所有 ${total} 张图片？`,
        okText: '应用到所有',
        cancelText: '取消',
        onOk: async () => {
          const ids = filteredImages.map((img) => img.id);
          await applyToIds(ids);
        },
      });
      return;
    }

    // normal case: use selected images
    await applyToIds(Array.from(selectedImages));
  };

  // 全屏轮播
  const handleCarousel = () => {
    if (selectedImages.size === 0) {
      message.warning('请先选择图片');
      return;
    }
    const selected = allImages.filter((img) => selectedImages.has(img.id));
    setCarouselImages(selected);
    setCurrentCarouselIndex(0);
    setCarouselAutoPlay(false);
    setCarouselVisible(true);
  };

  // 轮播自动播放
  useEffect(() => {
    if (!carouselVisible || !carouselAutoPlay || carouselImages.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => {
        if (prev >= carouselImages.length - 1) {
          return 0; // 循环播放
        }
        return prev + 1;
      });
    }, carouselSpeed * 1000);

    return () => clearInterval(interval);
  }, [carouselVisible, carouselAutoPlay, carouselSpeed, carouselImages.length]);

  // 键盘快捷键
  useEffect(() => {
    if (!carouselVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentCarouselIndex((prev) => (prev > 0 ? prev - 1 : carouselImages.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentCarouselIndex((prev) => (prev < carouselImages.length - 1 ? prev + 1 : 0));
      } else if (e.key === ' ') {
        e.preventDefault();
        setCarouselAutoPlay((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCarouselVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carouselVisible, carouselImages.length]);

  // 上一张/下一张
  const handlePrevImage = () => {
    setCurrentCarouselIndex((prev) => (prev > 0 ? prev - 1 : carouselImages.length - 1));
  };

  const handleNextImage = () => {
    setCurrentCarouselIndex((prev) => (prev < carouselImages.length - 1 ? prev + 1 : 0));
  };

  // 预览图片
  const handlePreview = (image: ImageInfo) => {
    setPreviewImage(image);
    setPreviewVisible(true);
  };

  // 删除图片
  const handleDeleteImage = async () => {
    if (!previewImage) return;

    try {
      setDeleting(true);
      await imageApi.deleteImage(previewImage.id);
      message.success('删除成功');
      setPreviewVisible(false);
      setPreviewImage(null);
      // 重新加载图片列表
      loadImages();
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除失败');
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  // 打开修改文件名对话框
  const handleOpenEditFilename = () => {
    if (previewImage) {
      setNewFilename(previewImage.filename);
      setEditFilenameVisible(true);
    }
  };

  // 保存修改的文件名
  const handleSaveFilename = async () => {
    if (!previewImage || !newFilename.trim()) {
      message.warning('请输入文件名');
      return;
    }

    try {
      const response = await imageApi.updateImage(previewImage.id, {
        originalFilename: newFilename.trim(),
      });
      if (response.success && response.data) {
        message.success('文件名修改成功');
        setEditFilenameVisible(false);
        // 更新预览图片信息
        setPreviewImage({
          ...previewImage,
          filename: newFilename.trim(),
        });
        // 重新加载图片列表
        loadImages();
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '修改文件名失败');
      console.error(error);
    }
  };

  // 退出登录
  const handleLogout = () => {
    userStore.logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  // 用户菜单 items (antd v5 Dropdown expects menu={{ items }})
  const userMenuItemsLocal = [
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  // 获取所有地点和设备（用于高级搜索）
  const allLocations = useMemo(() => {
    const locations = new Set<string>();
    allImages.forEach((img) => {
      if (img.exif?.location) locations.add(img.exif.location);
    });
    return Array.from(locations);
  }, [allImages]);

  const allDevices = useMemo(() => {
    const devices = new Set<string>();
    allImages.forEach((img) => {
      if (img.exif?.device) devices.add(img.exif.device);
    });
    return Array.from(devices);
  }, [allImages]);

  // 分页后的图片列表（现在由后端处理分页，直接使用 filteredImages）
  const paginatedImages = filteredImages;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PageHeaderBar
        left={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 18,
              }}
            >
              图
            </div>
          <div style={{ color: 'white', fontSize: isMobile ? 14 : 20, fontWeight: 'bold' }}>
              图片管理系统
            </div>
          </div>
        }
        center={
          !isMobile ? (
            <div style={{ width: '100%', maxWidth: isMobile ? 220 : 400 }}>
            <Input
              placeholder="搜索文件名、标签..."
              prefix={<SearchOutlined />}
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              allowClear
            />
          </div>
          ) : null
        }
        right={
          <Space>
            {isMobile && (
              <Button type="default" icon={<SearchOutlined />} onClick={() => { setMobileSearchQuery(quickSearch); setMobileSearchVisible(true); }} aria-label="搜索" />
            )}
            {isMobile ? (
              <Button type="default" icon={<FilterOutlined />} onClick={openMobileFilter} aria-label="筛选" />
            ) : (
              <Button type="default" icon={<FilterOutlined />} onClick={openMobileFilter}>
                筛选
              </Button>
            )}
            {isMobile ? (
              <Button type="default" icon={<UploadOutlined />} onClick={() => navigate('/upload')} aria-label="上传" />
            ) : (
            <Button type="primary" icon={<UploadOutlined />} onClick={() => navigate('/upload')}>
              上传
            </Button>
            )}
            <Dropdown menu={{ items: userMenuItemsLocal }} placement="bottomRight">
              <Button type="text" style={{ color: 'white' }}>
                <Avatar size="small" src={userStore.user?.avatar} icon={<UserOutlined />} />
                {!isMobile && <span style={{ marginLeft: 8 }}>{userStore.user?.username || '用户'}</span>}
              </Button>
            </Dropdown>
          </Space>
        }
      />

      <Layout>
        {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={300}
          collapsedWidth={0}
          style={{ background: '#fff' }}
        >
          {/* Sider tabs rewritten to use `items` API (antd v5) */}
          <Tabs
            activeKey={searchMode}
            onChange={(key) => {
              setSearchMode(key as 'quick' | 'advanced');
              setIsAiSearchActive(false);
              setAiSearchQuery('');
            }}
            style={{ padding: '16px' }}
            items={[
              {
                key: 'quick',
                label: '快速筛选',
                children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ marginBottom: 12, fontWeight: 'bold' }}>标签云</div>
                  <Space wrap>
                    {tagCloud.map((tag) => (
                      <Tag
                        key={tag.id}
                        color={selectedTags.has(tag.id) ? 'blue' : 'default'}
                        style={{ cursor: 'pointer', marginBottom: 8 }}
                        onClick={() => handleTagClick(tag.id)}
                      >
                        {tag.name} ({tag.count})
                      </Tag>
                    ))}
                  </Space>
                </div>
                <div>
                  <div style={{ marginBottom: 12, fontWeight: 'bold' }}>时间范围</div>
                  <RangePicker
                    style={{ width: '100%' }}
                    value={dateRange}
                    onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                  />
                </div>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleResetQuickFilter}
                  block
                >
                  重置
                </Button>
              </Space>
                ),
              },
              {
                key: 'advanced',
                label: '高级搜索',
                children: (
              <Tabs
                activeKey={advancedTab}
                onChange={(key) => setAdvancedTab(key as 'condition' | 'ai')}
                size="small"
                    items={[
                      {
                        key: 'condition',
                        label: '条件搜索',
                        children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <div style={{ marginBottom: 8 }}>文件名</div>
                      <Input
                        placeholder="输入文件名"
                        value={advancedSearch.filename}
                        onChange={(e) =>
                          setAdvancedSearch({ ...advancedSearch, filename: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>标签</div>
                      <Select
                        mode="multiple"
                        placeholder="选择标签"
                        style={{ width: '100%' }}
                        value={advancedSearch.tags}
                        onChange={(value) =>
                          setAdvancedSearch({ ...advancedSearch, tags: value })
                        }
                      >
                        {allTags.map((tag) => (
                          <Select.Option key={tag.id} value={tag.id}>
                            {tag.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>时间范围</div>
                      <RangePicker
                        style={{ width: '100%' }}
                        value={advancedSearch.dateRange}
                        onChange={(dates) =>
                          setAdvancedSearch({
                            ...advancedSearch,
                            dateRange: dates as [Dayjs | null, Dayjs | null] | null,
                          })
                        }
                      />
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>拍摄地点</div>
                      <Select
                        placeholder="选择地点"
                        style={{ width: '100%' }}
                        value={advancedSearch.location}
                        onChange={(value) =>
                          setAdvancedSearch({ ...advancedSearch, location: value })
                        }
                        allowClear
                      >
                        {allLocations.map((loc) => (
                          <Select.Option key={loc} value={loc}>
                            {loc}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <div style={{ marginBottom: 8 }}>拍摄设备</div>
                      <Select
                        placeholder="选择设备"
                        style={{ width: '100%' }}
                        value={advancedSearch.device}
                        onChange={(value) =>
                          setAdvancedSearch({ ...advancedSearch, device: value })
                        }
                        allowClear
                      >
                        {allDevices.map((dev) => (
                          <Select.Option key={dev} value={dev}>
                            {dev}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <Button type="primary" onClick={handleAdvancedSearch} block>
                      搜索
                    </Button>
                    <Button onClick={handleResetAdvancedSearch} block>
                      重置
                    </Button>
                  </Space>
                        ),
                      },
                      {
                        key: 'ai',
                        label: 'AI 搜索',
                        children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <div style={{ marginBottom: 8 }}>自然语言搜索</div>
                      <Input.TextArea
                        placeholder='例如："找找我在海边拍的照片"'
                        rows={4}
                        value={aiSearchQuery}
                        onChange={(e) => setAiSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button type="primary" onClick={handleAISearch} block>
                      AI 搜索
                    </Button>
                    <Button onClick={handleResetAISearch} block>
                      重置
                    </Button>
                  </Space>
                        ),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </Sider>
        )}

        {/* Mobile full-screen filter Drawer */}
        <Drawer
          open={mobileFilterVisible}
          onClose={handleMobileFilterCancel}
          width="100%"
          placement="left"
          closable={false}
          style={{ height: '100vh' }}
          styles={{
            body: {
              padding: 16,
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#fff',
              position: 'relative',
            },
          }}
        >
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Tabs
              activeKey={tempSearchMode}
              onChange={(key) => {
                setTempSearchMode(key as 'quick' | 'advanced');
                setTempAiSearchQuery('');
              }}
              style={{ padding: '8px' }}
              items={[
                {
                  key: 'quick',
                  label: '快速筛选',
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <div style={{ marginBottom: 12, fontWeight: 'bold' }}>标签云</div>
                        <Space wrap>
                          {tagCloud.map((tag) => (
                            <Tag
                              key={tag.id}
                              color={tempSelectedTags.has(tag.id) ? 'blue' : 'default'}
                              style={{ cursor: 'pointer', marginBottom: 8 }}
                              onClick={() => {
                                const newSet = new Set(tempSelectedTags);
                                if (newSet.has(tag.id)) newSet.delete(tag.id);
                                else newSet.add(tag.id);
                                setTempSelectedTags(newSet);
                              }}
                            >
                              {tag.name} ({tag.count})
                            </Tag>
                          ))}
                        </Space>
                      </div>
                      <div>
                        <div style={{ marginBottom: 12, fontWeight: 'bold' }}>时间范围</div>
                        <RangePicker
                          style={{ width: '100%' }}
                          value={tempDateRange}
                          onChange={(dates) => setTempDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                        />
                      </div>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          setTempQuickSearch('');
                          setTempSelectedTags(new Set());
                          setTempDateRange(null);
                        }}
                        block
                      >
                        重置
                      </Button>
                    </Space>
                  ),
                },
                {
                  key: 'advanced',
                  label: '高级搜索',
                  children: (
                    <Tabs
                      activeKey={tempAdvancedTab}
                      onChange={(key) => setTempAdvancedTab(key as 'condition' | 'ai')}
                      size="small"
                      items={[
                        {
                          key: 'condition',
                          label: '条件搜索',
                          children: (
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                              <div>
                                <div style={{ marginBottom: 8 }}>文件名</div>
                                <Input
                                  placeholder="输入文件名"
                                  value={tempAdvancedSearch.filename}
                                  onChange={(e) =>
                                    setTempAdvancedSearch({ ...tempAdvancedSearch, filename: e.target.value })
                                  }
                                />
                              </div>
                              <div>
                                <div style={{ marginBottom: 8 }}>标签</div>
                                <Select
                                  mode="multiple"
                                  placeholder="选择标签"
                                  style={{ width: '100%' }}
                                  value={tempAdvancedSearch.tags}
                                  onChange={(value) =>
                                    setTempAdvancedSearch({ ...tempAdvancedSearch, tags: value })
                                  }
                                >
                                  {allTags.map((tag) => (
                                    <Select.Option key={tag.id} value={tag.id}>
                                      {tag.name}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </div>
                              <div>
                                <div style={{ marginBottom: 8 }}>时间范围</div>
                                <RangePicker
                                  style={{ width: '100%' }}
                                  value={tempAdvancedSearch.dateRange}
                                  onChange={(dates) =>
                                    setTempAdvancedSearch({
                                      ...tempAdvancedSearch,
                                      dateRange: dates as [Dayjs | null, Dayjs | null] | null,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <div style={{ marginBottom: 8 }}>拍摄地点</div>
                                <Select
                                  placeholder="选择地点"
                                  style={{ width: '100%' }}
                                  value={tempAdvancedSearch.location}
                                  onChange={(value) =>
                                    setTempAdvancedSearch({ ...tempAdvancedSearch, location: value })
                                  }
                                  allowClear
                                >
                                  {allLocations.map((loc) => (
                                    <Select.Option key={loc} value={loc}>
                                      {loc}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </div>
                              <div>
                                <div style={{ marginBottom: 8 }}>拍摄设备</div>
                                <Select
                                  placeholder="选择设备"
                                  style={{ width: '100%' }}
                                  value={tempAdvancedSearch.device}
                                  onChange={(value) =>
                                    setTempAdvancedSearch({ ...tempAdvancedSearch, device: value })
                                  }
                                  allowClear
                                >
                                  {allDevices.map((dev) => (
                                    <Select.Option key={dev} value={dev}>
                                      {dev}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </div>
                              {/* 搜索按钮在移动端 Drawer 中移除；由底部“确定”触发 */}
                              <Button onClick={() => {
                                setTempAdvancedSearch({
                                  filename: '',
                                  tags: [],
                                  dateRange: null,
                                  location: '',
                                  device: '',
                                });
                                setTempAiSearchQuery('');
                              }} block>
                                重置
                              </Button>
                            </Space>
                          ),
                        },
                        {
                          key: 'ai',
                          label: 'AI 搜索',
                          children: (
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                              <div>
                                <div style={{ marginBottom: 8 }}>自然语言搜索</div>
                                <Input.TextArea
                                  placeholder='例如："找找我在海边拍的照片"'
                                  rows={4}
                                  value={tempAiSearchQuery}
                                  onChange={(e) => setTempAiSearchQuery(e.target.value)}
                                />
                              </div>
                              <Button onClick={() => {
                                setTempAiSearchQuery('');
                              }} block>
                                重置
                              </Button>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>

          <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, padding: 12, background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: 12 }}>
            <Button block onClick={handleMobileFilterCancel}>取消</Button>
            <Button type="primary" block onClick={handleMobileFilterConfirm}>确定</Button>
          </div>
        </Drawer>

        {/* Mobile search Modal */}
        <Modal
          title="搜索"
          open={mobileSearchVisible}
          onCancel={() => setMobileSearchVisible(false)}
          okText="确定"
          cancelText="取消"
          onOk={async () => {
            setMobileSearchVisible(false);
            // apply mobileSearchQuery as quickSearch and fetch
            const tempQuery = mobileSearchQuery || '';
            setQuickSearch(tempQuery);
            setCurrentPage(1);
            try {
              setLoading(true);
              const params: any = { page: 1, limit: pageSize };
              if (tempQuery) params.keyword = tempQuery;
              const response = await imageApi.getImages(params);
              if (response.success && response.data) {
                const transformed = response.data.images.map(transformImageData);
                setAllImages(transformed);
                setFilteredImages(transformed);
                setTotalImages(response.data.pagination.total);
                setCurrentPage(response.data.pagination.page);
              } else {
                message.error(response.message || '搜索失败');
              }
            } catch (error: any) {
              console.error('移动搜索失败:', error);
              message.error(error?.response?.data?.message || '搜索失败，请稍后重试');
            } finally {
              setLoading(false);
            }
          }}
        >
          <Input
            placeholder="输入搜索内容"
            value={mobileSearchQuery}
            onChange={(e) => setMobileSearchQuery(e.target.value)}
            onPressEnter={async () => {
              // same as OK
              setMobileSearchVisible(false);
              const tempQuery = mobileSearchQuery || '';
              setQuickSearch(tempQuery);
              setCurrentPage(1);
              try {
                setLoading(true);
                const params: any = { page: 1, limit: pageSize };
                if (tempQuery) params.keyword = tempQuery;
                const response = await imageApi.getImages(params);
                if (response.success && response.data) {
                  const transformed = response.data.images.map(transformImageData);
                  setAllImages(transformed);
                  setFilteredImages(transformed);
                  setTotalImages(response.data.pagination.total);
                  setCurrentPage(response.data.pagination.page);
                } else {
                  message.error(response.message || '搜索失败');
                }
              } catch (error: any) {
                console.error('移动搜索失败:', error);
                message.error(error?.response?.data?.message || '搜索失败，请稍后重试');
              } finally {
                setLoading(false);
              }
            }}
          />
        </Modal>

        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>我的图片 ({totalImages})</span>
                <Space>
                  {selectionMode && (
                    <>
                      {isMobile ? (
                        <>
                          <Tooltip title={selectedImages.size === filteredImages.length ? '取消全选' : '全选'}>
                            <Button icon={<SelectOutlined />} onClick={handleSelectAll} aria-label="全选" />
                          </Tooltip>
                          <Tooltip title="批量添加标签">
                            <Button icon={<PlusOutlined />} onClick={handleBatchAddTags} aria-label="批量添加标签" />
                          </Tooltip>
                          <Popconfirm
                            title={`确定要删除选中的 ${selectedImages.size} 张图片吗？`}
                            onConfirm={handleBatchDelete}
                          >
                            <Button danger icon={<DeleteOutlined />} aria-label="批量删除" />
                          </Popconfirm>
                          {selectedImages.size > 0 && (
                            <Tooltip title={`全屏轮播 (${selectedImages.size})`}>
                              <Button type="primary" icon={<EyeOutlined />} onClick={handleCarousel} aria-label="全屏轮播" />
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <>
                          <Button onClick={handleSelectAll}>
                        {selectedImages.size === filteredImages.length ? '取消全选' : '全选'}
                      </Button>
                          <Button icon={<PlusOutlined />} onClick={handleBatchAddTags}>
                        批量添加标签
                      </Button>
                      <Popconfirm
                        title={`确定要删除选中的 ${selectedImages.size} 张图片吗？`}
                        onConfirm={handleBatchDelete}
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          批量删除
                        </Button>
                      </Popconfirm>
                      {selectedImages.size > 0 && (
                            <Button type="primary" icon={<EyeOutlined />} onClick={handleCarousel}>
                          全屏轮播 ({selectedImages.size})
                        </Button>
                          )}
                        </>
                      )}
                    </>
                  )}
                  <Button
                    icon={<CheckSquareOutlined />}
                    onClick={handleToggleSelectionMode}
                    type={selectionMode ? 'primary' : 'default'}
                    aria-label={selectionMode ? '取消选择' : '选择模式'}
                  >
                    {!isMobile && (selectionMode ? '取消选择' : '选择模式')}
                  </Button>
                </Space>
              </div>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <div>加载中...</div>
              </div>
            ) : filteredImages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <div>暂无图片</div>
              </div>
            ) : (
              <>
                <Row gutter={[16, 16]}>
                  {paginatedImages.map((image) => (
                    <Col
                      key={image.id}
                      xs={12}
                      sm={12}
                      md={6}
                      lg={6}
                      xl={4}
                    >
                    <Card
                      hoverable
                      cover={
                        <div 
                          style={{ 
                            position: 'relative',
                            height: 200,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#fafafa',
                          }}
                        >
                          <img
                            src={image.url}
                            alt={image.filename}
                            style={{ 
                              objectFit: 'contain', 
                              maxWidth: '100%',
                              maxHeight: '100%',
                              width: 'auto',
                              height: 'auto',
                              transition: 'all 0.3s ease',
                              display: 'block',
                              margin: 'auto',
                              verticalAlign: 'middle',
                            }}
                          />
                          {/* 选中状态的遮罩层 */}
                          {selectionMode && selectedImages.has(image.id) && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(24, 144, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'flex-end',
                                padding: '8px',
                                transition: 'all 0.3s ease',
                                pointerEvents: 'none',
                              }}
                            >
                              <CheckCircleFilled
                                style={{
                                  fontSize: 24,
                                  color: '#1890ff',
                                  background: 'white',
                                  borderRadius: '50%',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      }
                      onClick={() => {
                        if (selectionMode) {
                          handleImageSelect(image.id);
                        } else {
                          handlePreview(image);
                        }
                      }}
                      style={{ 
                        cursor: 'pointer',
                        border: selectionMode && selectedImages.has(image.id) 
                          ? '3px solid #1890ff' 
                          : '1px solid #f0f0f0',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        height: 360,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      styles={{
                        body: {
                        transition: 'all 0.3s ease',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '12px',
                        },
                      }}
                    >
                      <Card.Meta
                        title={
                          <div
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: 8,
                            }}
                            title={image.filename}
                          >
                            {image.filename}
                          </div>
                        }
                        description={
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            height: '100%',
                            justifyContent: 'space-between',
                          }}>
                            <div style={{ 
                              minHeight: 22,
                              maxHeight: 54,
                              overflow: 'hidden',
                              marginBottom: 8,
                            }}>
                              {image.tags && image.tags.length > 0 && (
                                <Space wrap size={[4, 4]}>
                                  {image.tags.slice(0, 3).map((tag) => (
                                    <Tag key={tag.id}>
                                      {tag.name}
                                    </Tag>
                                  ))}
                                  {image.tags.length > 3 && (
                                    <Tag>+{image.tags.length - 3}</Tag>
                                  )}
                                </Space>
                              )}
                            </div>
                            
                            {/* 标签计数 - 独立区域 */}
                            {image.tags && image.tags.length > 0 && (
                              <div style={{ 
                                marginBottom: 8,
                                textAlign: 'left',
                                color: '#999',
                                fontSize: 10,
                              }}>
                                共 {image.tags.length} 个标签
                              </div>
                            )}
                            
                            <div style={{ 
                              fontSize: 12, 
                              color: '#999',
                            }}>
                              {formatDateTime(image.uploadTime)}
                            </div>
                          </div>
                        }
                      />
                    </Card>
                    </Col>
                  ))}
                </Row>
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    current={currentPage}
                    total={totalImages}
                    pageSize={pageSize}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total, range) => `第 ${range[0]}-${range[1]} 张，共 ${total} 张`}
                    onChange={(page, size) => {
                      setCurrentPage(page);
                      setPageSize(size);
                    }}
                    onShowSizeChange={(_current, size) => {
                      setCurrentPage(1);
                      setPageSize(size);
                    }}
                    pageSizeOptions={['12', '24', '48', '96']}
                  />
                </div>
              </>
            )}
          </Card>
        </Content>
      </Layout>

      {/* 图片预览 Modal */}
      <Modal
        open={previewVisible}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Popconfirm
            key="delete"
            title="确认删除"
            description="确定要删除这张图片吗？此操作不可恢复。"
            onConfirm={handleDeleteImage}
            okText="删除"
            okType="danger"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} loading={deleting}>
              删除
            </Button>
          </Popconfirm>,
          <Button
            key="edit"
            icon={<EditOutlined />}
            onClick={handleOpenEditFilename}
          >
            修改文件名
          </Button>,
          <Button
            key="detail"
            type="primary"
            onClick={() => {
              if (previewImage) {
                setPreviewVisible(false);
                navigate(`/image/${previewImage.id}`);
              }
            }}
          >
            查看详情
          </Button>,
        ]}
        onCancel={() => setPreviewVisible(false)}
        width={900}
        centered
      >
        {previewImage && (
          <div style={{ display: 'flex', gap: 16, maxHeight: '70vh' }}>
            {/* 左侧图片 */}
            <div style={{ flex: '0 0 60%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image 
                src={previewImage.url} 
                alt={previewImage.filename} 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                preview={false}
              />
            </div>
            
            {/* 右侧信息 */}
            <div style={{ flex: '1', overflowY: 'auto', paddingRight: 8 }}>
              <Descriptions 
                column={1} 
                size="small"
                bordered
                labelStyle={{ 
                  width: '64px', 
                  padding: '8px 12px',
                  backgroundColor: '#fafafa',
                  fontWeight: 500,
                }}
                contentStyle={{ 
                  padding: '8px 12px',
                  // force wrapping of long words and reduce font size slightly for modal content
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal',
                  fontSize: 13,
                  maxWidth: 'calc(100% - 64px)',
                }}
              >
                <Descriptions.Item label="文件名">
                  <div style={{ wordBreak: 'break-all' }}>{previewImage.filename}</div>
                </Descriptions.Item>
                
                {previewImage.size && (
                  <Descriptions.Item label="大小">
                    {formatFileSize(previewImage.size)}
                  </Descriptions.Item>
                )}
                
                {previewImage.exif?.width && previewImage.exif?.height && (
                  <Descriptions.Item label="分辨率">
                    {previewImage.exif.width} × {previewImage.exif.height}
                  </Descriptions.Item>
                )}
                
                {previewImage.exif?.location && (
                  <Descriptions.Item label="地点">
                    {previewImage.exif.location}
                  </Descriptions.Item>
                )}
                
                {previewImage.exif?.device && (
                  <Descriptions.Item label="设备">
                    {previewImage.exif.device}
                  </Descriptions.Item>
                )}
                
                {previewImage.uploadTime && (
                  <Descriptions.Item label="上传时间">
                    {formatDateTime(previewImage.uploadTime)}
                  </Descriptions.Item>
                )}
                
                {previewImage.tags && previewImage.tags.length > 0 && (
                  <Descriptions.Item label="标签">
                    <Space wrap size={[4, 4]}>
                      {previewImage.tags.map((tag) => (
                        <Tag 
                          key={tag.id}
                          style={{ margin: 0 }}
                        >
                          {tag.name}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          </div>
        )}
      </Modal>

      {/* 修改文件名 Modal */}
      <Modal
        title="修改文件名"
        open={editFilenameVisible}
        onOk={handleSaveFilename}
        onCancel={() => {
          setEditFilenameVisible(false);
          setNewFilename('');
        }}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={newFilename}
          onChange={(e) => setNewFilename(e.target.value)}
          placeholder="请输入新文件名"
          onPressEnter={handleSaveFilename}
        />
      </Modal>

      {/* 批量添加标签 Modal */}
      <Modal
        title="批量添加标签"
        open={batchTagModalVisible}
        onCancel={() => setBatchTagModalVisible(false)}
        okText="添加"
        cancelText="取消"
        onOk={handleConfirmBatchAddTags}
      >
        <div style={{ marginBottom: 8 }}>请输入要添加的标签，用逗号或空格分隔：</div>
        <Input
          placeholder="例如：风景, 海边, 旅行"
          value={batchTagInput}
          onChange={(e) => setBatchTagInput(e.target.value)}
          onPressEnter={handleConfirmBatchAddTags}
        />
      </Modal>

      {/* 全屏轮播 Drawer */}
      <Drawer
        open={carouselVisible}
        onClose={() => {
          setCarouselVisible(false);
          setCarouselAutoPlay(false);
        }}
        width="100%"
        placement="top"
        closable={false}
        style={{ height: '100vh' }}
        styles={{
          body: {
          padding: 0, 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#000',
          position: 'relative',
          },
        }}
      >
        {carouselImages.length > 0 && (
          <>
            {/* 关闭按钮 */}
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => {
                setCarouselVisible(false);
                setCarouselAutoPlay(false);
              }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 1000,
                color: '#fff',
                fontSize: 20,
                width: 40,
                height: 40,
              }}
            />

            {/* 图片显示区域 */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '60px 80px',
              position: 'relative',
            }}>
              {/* 左侧导航按钮 */}
              <Button
                type="text"
                icon={<LeftOutlined />}
                onClick={handlePrevImage}
                style={{
                  position: 'absolute',
                  left: 20,
                  color: '#fff',
                  fontSize: 32,
                  width: 60,
                  height: 60,
                  zIndex: 100,
                }}
              />

              {/* 图片 */}
              <div style={{ 
                width: '100%', 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Image
                  src={carouselImages[currentCarouselIndex].url}
                  alt={carouselImages[currentCarouselIndex].filename}
                  style={{ 
                    maxHeight: '100%', 
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                  preview={false}
                />
              </div>

              {/* 右侧导航按钮 */}
              <Button
                type="text"
                icon={<RightOutlined />}
                onClick={handleNextImage}
                style={{
                  position: 'absolute',
                  right: 20,
                  color: '#fff',
                  fontSize: 32,
                  width: 60,
                  height: 60,
                  zIndex: 100,
                }}
              />
            </div>

            {/* 底部控制栏 */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: '20px 40px',
              zIndex: 1000,
            }}>
              {/* 图片信息 */}
              <div style={{ 
                color: '#fff', 
                marginBottom: 16,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                  {carouselImages[currentCarouselIndex].filename}
                </div>
                <div style={{ fontSize: 12, color: '#aaa' }}>
                  {currentCarouselIndex + 1} / {carouselImages.length}
                  {carouselImages[currentCarouselIndex].exif?.width && carouselImages[currentCarouselIndex].exif?.height && (
                    <> · {carouselImages[currentCarouselIndex].exif.width} × {carouselImages[currentCarouselIndex].exif.height}</>
                  )}
                </div>
              </div>

              {/* 控制按钮 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 16,
              }}>
                <Tooltip title="上一张 (←)">
                  <Button
                    type="text"
                    icon={<LeftOutlined />}
                    onClick={handlePrevImage}
                    style={{ color: '#fff', fontSize: 20 }}
                  />
                </Tooltip>

                <Tooltip title={carouselAutoPlay ? '暂停 (空格)' : '播放 (空格)'}>
                  <Button
                    type="text"
                    icon={carouselAutoPlay ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => setCarouselAutoPlay(!carouselAutoPlay)}
                    style={{ color: '#fff', fontSize: 24 }}
                  />
                </Tooltip>

                <Tooltip title="下一张 (→)">
                  <Button
                    type="text"
                    icon={<RightOutlined />}
                    onClick={handleNextImage}
                    style={{ color: '#fff', fontSize: 20 }}
                  />
                </Tooltip>

                <div style={{ 
                  width: 1, 
                  height: 30, 
                  backgroundColor: '#666', 
                  margin: '0 16px' 
                }} />

                <Tooltip title="设置">
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    onClick={() => setCarouselSettingsVisible(!carouselSettingsVisible)}
                    style={{ color: '#fff', fontSize: 20 }}
                  />
                </Tooltip>
              </div>

              {/* 速度设置 */}
              {carouselSettingsVisible && (
                <div style={{
                  marginTop: 16,
                  padding: '16px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 4,
                }}>
                  <div style={{ color: '#fff', marginBottom: 8, fontSize: 14 }}>
                    播放速度: {carouselSpeed} 秒/张
                  </div>
                  <Slider
                    min={1}
                    max={10}
                    value={carouselSpeed}
                    onChange={setCarouselSpeed}
                    tooltip={{ formatter: (value) => `${value}秒` }}
                    style={{ margin: 0 }}
                  />
                </div>
              )}

              {/* 键盘提示 */}
              {!isMobile && (
              <div style={{
                marginTop: 12,
                textAlign: 'center',
                fontSize: 12,
                color: '#888',
              }}>
                ← → 切换图片 · 空格 播放/暂停 · ESC 关闭
              </div>
              )}
            </div>
          </>
        )}
      </Drawer>
    </Layout>
  );
});

export default HomeComponent;

