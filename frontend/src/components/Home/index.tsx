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
  Menu,
  Tabs,
  DatePicker,
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
} from '@ant-design/icons';
import type { ImageInfo, Tag as TagType } from '../../types';
import { formatDateTime, formatFileSize } from '../../utils';
import { appStore } from '../../store';
import dayjs, { Dayjs } from 'dayjs';

const { Header, Sider, Content } = Layout;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// Mock 数据生成函数
const generateMockImages = (): ImageInfo[] => {
  const mockTags: TagType[] = [
    { id: '1', name: '风景', type: 'custom' },
    { id: '2', name: '人物', type: 'custom' },
    { id: '3', name: '美食', type: 'custom' },
    { id: '4', name: '旅行', type: 'custom' },
    { id: '5', name: 'iPhone 14 Pro', type: 'exif' },
    { id: '6', name: 'Canon EOS R5', type: 'exif' },
    { id: '7', name: '北京', type: 'exif' },
    { id: '8', name: '上海', type: 'exif' },
    { id: '9', name: '海边', type: 'ai' },
    { id: '10', name: '日落', type: 'ai' },
  ];

  const locations = ['北京', '上海', '杭州', '深圳', '广州', '成都'];
  const devices = ['iPhone 14 Pro', 'Canon EOS R5', 'Sony A7III', 'Nikon D850'];

  return Array.from({ length: 30 }, (_, i) => {
    const randomTags = mockTags.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 1);
    return {
      id: `img-${i + 1}`,
      filename: `image-${i + 1}.jpg`,
      url: `https://picsum.photos/400/300?random=${i + 1}`,
      uploadTime: dayjs().subtract(Math.floor(Math.random() * 30), 'day').toISOString(),
      size: Math.floor(Math.random() * 5000000) + 1000000,
      tags: randomTags,
      exif: {
        location: locations[Math.floor(Math.random() * locations.length)],
        device: devices[Math.floor(Math.random() * devices.length)],
        dateTime: dayjs().subtract(Math.floor(Math.random() * 30), 'day').toISOString(),
        width: 1920 + Math.floor(Math.random() * 1000),
        height: 1080 + Math.floor(Math.random() * 1000),
      },
    };
  });
};

const HomeComponent = observer(() => {
  const navigate = useNavigate();
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

  // Mock 数据
  const [allImages] = useState<ImageInfo[]>(generateMockImages());
  const [filteredImages, setFilteredImages] = useState<ImageInfo[]>(allImages);

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

  // 筛选图片
  useEffect(() => {
    let filtered = [...allImages];

    // 快速搜索（文件名、标签关键词）
    if (quickSearch) {
      const query = quickSearch.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.filename.toLowerCase().includes(query) ||
          img.tags?.some((tag) => tag.name.toLowerCase().includes(query))
      );
    }

    // 标签筛选（与关系：图片必须包含所有选中的标签）
    if (selectedTags.size > 0) {
      filtered = filtered.filter((img) =>
        Array.from(selectedTags).every((tagId) =>
          img.tags?.some((tag) => tag.id === tagId)
        )
      );
    }

    // 时间范围筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((img) => {
        const uploadTime = dayjs(img.uploadTime);
        return uploadTime.isAfter(dateRange[0]!) && uploadTime.isBefore(dateRange[1]!.add(1, 'day'));
      });
    }

    setFilteredImages(filtered);
    setCurrentPage(1); // 筛选时重置到第一页
  }, [quickSearch, selectedTags, dateRange, allImages]);

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
    let filtered = [...allImages];

    if (advancedSearch.filename) {
      filtered = filtered.filter((img) =>
        img.filename.toLowerCase().includes(advancedSearch.filename.toLowerCase())
      );
    }

    // 标签筛选（与关系：图片必须包含所有选中的标签）
    if (advancedSearch.tags.length > 0) {
      filtered = filtered.filter((img) =>
        advancedSearch.tags.every((tagId) =>
          img.tags?.some((tag) => tag.id === tagId)
        )
      );
    }

    if (advancedSearch.dateRange && advancedSearch.dateRange[0] && advancedSearch.dateRange[1]) {
      const [startDate, endDate] = advancedSearch.dateRange;
      if (startDate && endDate) {
        filtered = filtered.filter((img) => {
          const uploadTime = dayjs(img.uploadTime);
          return (
            uploadTime.isAfter(startDate) &&
            uploadTime.isBefore(endDate.add(1, 'day'))
          );
        });
      }
    }

    if (advancedSearch.location) {
      filtered = filtered.filter((img) => img.exif?.location === advancedSearch.location);
    }

    if (advancedSearch.device) {
      filtered = filtered.filter((img) => img.exif?.device === advancedSearch.device);
    }

    setFilteredImages(filtered);
    setCurrentPage(1); // 搜索时重置到第一页
    message.success(`找到 ${filtered.length} 张图片`);
  };

  // AI 搜索
  const handleAISearch = () => {
    if (!aiSearchQuery.trim()) {
      message.warning('请输入搜索内容');
      return;
    }
    // Mock AI 搜索：简单关键词匹配
    const query = aiSearchQuery.toLowerCase();
    const filtered = allImages.filter(
      (img) =>
        img.filename.toLowerCase().includes(query) ||
        img.tags?.some((tag) => tag.name.toLowerCase().includes(query)) ||
        img.exif?.location?.toLowerCase().includes(query)
    );
    setFilteredImages(filtered);
    setCurrentPage(1); // AI搜索时重置到第一页
    message.success(`AI 找到 ${filtered.length} 张相关图片`);
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
    setFilteredImages(allImages);
    setCurrentPage(1); // 重置时回到第一页
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
    // Mock 删除
    message.success(`已删除 ${selectedImages.size} 张图片`);
    setSelectedImages(new Set());
    setSelectionMode(false);
  };

  // 批量添加标签
  const handleBatchAddTags = () => {
    if (selectedImages.size === 0) {
      message.warning('请先选择图片');
      return;
    }
    message.info('批量添加标签功能（Mock）');
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

  // 用户菜单
  const userMenu = (
    <Menu>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={() => message.info('退出登录（Mock）')}>
        退出登录
      </Menu.Item>
    </Menu>
  );

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

  // 分页后的图片列表
  const paginatedImages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredImages.slice(start, end);
  }, [filteredImages, currentPage, pageSize]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#001529',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ 
              width: 32, 
              height: 32, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 18
            }}>
              图
            </div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
              图片管理系统
            </div>
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 400, margin: '0 24px' }}>
          <Input
            placeholder="搜索文件名、标签..."
            prefix={<SearchOutlined />}
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            allowClear
          />
        </div>
        <Space>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => navigate('/upload')}
          >
            上传
          </Button>
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Button type="text" style={{ color: 'white' }}>
              <Avatar size="small" src={appStore.userInfo?.avatar} icon={<UserOutlined />} />
              <span style={{ marginLeft: 8 }}>{appStore.userInfo?.username || '用户'}</span>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={300}
          collapsedWidth={0}
          style={{ background: '#fff' }}
        >
          <Tabs
            activeKey={searchMode}
            onChange={(key) => setSearchMode(key as 'quick' | 'advanced')}
            style={{ padding: '16px' }}
          >
            <TabPane tab="快速筛选" key="quick">
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
            </TabPane>

            <TabPane tab="高级搜索" key="advanced">
              <Tabs
                activeKey={advancedTab}
                onChange={(key) => setAdvancedTab(key as 'condition' | 'ai')}
                size="small"
              >
                <TabPane tab="条件搜索" key="condition">
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
                </TabPane>

                <TabPane tab="AI 搜索" key="ai">
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
                    <Button onClick={() => setAiSearchQuery('')} block>
                      清空
                    </Button>
                  </Space>
                </TabPane>
              </Tabs>
            </TabPane>
          </Tabs>
        </Sider>

        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>我的图片 ({filteredImages.length})</span>
                <Space>
                  {selectionMode && (
                    <>
                      <Button
                        onClick={handleSelectAll}
                      >
                        {selectedImages.size === filteredImages.length ? '取消全选' : '全选'}
                      </Button>
                      <Button
                        icon={<PlusOutlined />}
                        onClick={handleBatchAddTags}
                      >
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
                        <Button
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={handleCarousel}
                        >
                          全屏轮播 ({selectedImages.size})
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    icon={<CheckSquareOutlined />}
                    onClick={handleToggleSelectionMode}
                    type={selectionMode ? 'primary' : 'default'}
                  >
                    {selectionMode ? '取消选择' : '选择模式'}
                  </Button>
                </Space>
              </div>
            }
          >
            {filteredImages.length === 0 ? (
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
                      sm={6}
                      md={6}
                      lg={4}
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
                          }}
                        >
                          <Image
                            src={image.url}
                            alt={image.filename}
                            height={200}
                            style={{ 
                              objectFit: 'cover', 
                              width: '100%',
                              transition: 'all 0.3s ease',
                            }}
                            preview={false}
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
                      bodyStyle={{
                        transition: 'all 0.3s ease',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '12px',
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
                                padding: '6px 8px', 
                                background: '#f5f5f5', 
                                borderRadius: 4,
                                textAlign: 'center',
                                color: '#666',
                                fontSize: 11,
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
                    total={filteredImages.length}
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
                  width: '80px', 
                  padding: '8px 12px',
                  backgroundColor: '#fafafa',
                  fontWeight: 500,
                }}
                contentStyle={{ padding: '8px 12px' }}
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
        bodyStyle={{ 
          padding: 0, 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#000',
          position: 'relative',
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
              <div style={{
                marginTop: 12,
                textAlign: 'center',
                fontSize: 12,
                color: '#888',
              }}>
                ← → 切换图片 · 空格 播放/暂停 · ESC 关闭
              </div>
            </div>
          </>
        )}
      </Drawer>
    </Layout>
  );
});

export default HomeComponent;

