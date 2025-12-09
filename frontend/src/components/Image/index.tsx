import { observer } from 'mobx-react-lite';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Button,
  Image,
  Tag,
  Space,
  Card,
  Row,
  Col,
  Spin,
  message,
  Descriptions,
  Input,
  Popconfirm,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DownloadOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  RobotOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ImageInfo } from '../../types';
import { formatDateTime, formatFileSize } from '../../utils';
import { imageApi } from '../../api';
import PageHeaderBar from '../common/PageHeaderBar';

const { Content } = Layout;

// 将后端数据格式转换为前端格式
const transformImageData = (image: any): ImageInfo => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
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

const ImageDetailComponent = observer(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [allImages, setAllImages] = useState<ImageInfo[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [editFilenameVisible, setEditFilenameVisible] = useState(false);
  const [newFilename, setNewFilename] = useState('');

  useEffect(() => {
    if (id) {
      loadImageDetail(id);
      loadAllImages();
    }
  }, [id]);

  const loadAllImages = async () => {
    try {
      const response = await imageApi.getImages({ limit: 1000 });
      if (response.success && response.data) {
        const transformedImages = response.data.images.map(transformImageData);
        setAllImages(transformedImages);
      }
    } catch (error) {
      console.error('加载图片列表失败:', error);
    }
  };

  const loadImageDetail = async (imageId: string) => {
    try {
      setLoading(true);
      const response = await imageApi.getImageInfo(imageId);
      if (response.success && response.data) {
        setImage(transformImageData(response.data));
      } else {
        message.error('图片不存在');
        navigate('/home');
      }
    } catch (error: any) {
      message.error('加载图片详情失败');
      console.error(error);
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前图片在列表中的索引
  const currentIndex = useMemo(() => {
    if (!image || !allImages) return -1;
    return allImages.findIndex((img) => img.id === image.id);
  }, [image, allImages]);

  // 上一张和下一张的ID（循环浏览）
  const prevImageId = useMemo(() => {
    if (allImages.length === 0) return null;
    if (currentIndex <= 0) {
      // 如果是第一张，返回最后一张
      return allImages[allImages.length - 1]?.id;
    }
    return allImages[currentIndex - 1]?.id;
  }, [currentIndex, allImages]);

  const nextImageId = useMemo(() => {
    if (allImages.length === 0) return null;
    if (currentIndex >= allImages.length - 1) {
      // 如果是最后一张，返回第一张
      return allImages[0]?.id;
    }
    return allImages[currentIndex + 1]?.id;
  }, [currentIndex, allImages]);

  // 导航到上一张
  const handlePrev = () => {
    if (prevImageId) {
      navigate(`/image/${prevImageId}`);
    }
  };

  // 导航到下一张
  const handleNext = () => {
    if (nextImageId) {
      navigate(`/image/${nextImageId}`);
    }
  };

  // 添加标签
  const handleAddTag = async () => {
    if (!newTagName.trim() || !image) return;
    
    // 检查标签是否已存在
    const tagExists = image.tags?.some((tag) => tag.name === newTagName.trim());
    if (tagExists) {
      message.warning('标签已存在');
      return;
    }

    try {
      const response = await imageApi.addImageTags(image.id, [newTagName.trim()]);
      if (response.success && response.data) {
        setImage(transformImageData(response.data));
        setNewTagName('');
        message.success('标签添加成功');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '添加标签失败');
      console.error(error);
    }
  };

  // 删除标签
  const handleDeleteTag = async (tagId: string) => {
    if (!image) return;

    const tag = image.tags?.find((t) => t.id === tagId);
    if (!tag) return;

    try {
      await imageApi.removeImageTag(image.id, tagId);
      // 重新加载图片详情
      await loadImageDetail(image.id);
      message.success('标签删除成功');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除标签失败');
      console.error(error);
    }
  };

  // AI分析生成标签
  const handleAiAnalyze = async () => {
    if (!image) return;

    setAiAnalyzing(true);
    try {
      const response = await imageApi.generateAiTags(image.id);
      if (response.success && response.data) {
        // 重新加载图片详情以获取最新标签
        await loadImageDetail(image.id);
        // 从响应消息中判断是否有新标签
        const messageText = response.message || '';
        if (messageText.includes('成功') || messageText.includes('生成')) {
          message.success(response.message || 'AI分析完成');
        } else {
          message.info(response.message || 'AI分析完成，但未发现新标签');
        }
      } else {
        message.error(response.message || 'AI分析失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'AI分析失败');
      console.error('AI分析失败:', error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleEdit = () => {
    if (image) {
      navigate(`/edit/${image.id}`);
    }
  };

  const handleDownload = async () => {
    if (!image) return;

    try {
      // 调用下载接口获取文件 blob
      const blob = await imageApi.downloadImage(image.id);
      
      // 创建 blob URL
      const url = window.URL.createObjectURL(blob);
      
      // 创建临时链接并触发下载
      const link = document.createElement('a');
      link.href = url;
      link.download = image.filename;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('下载开始');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '下载失败');
      console.error('下载失败:', error);
    }
  };

  const handleDelete = async () => {
    if (!image) return;

    try {
      await imageApi.deleteImage(image.id);
      message.success('删除成功');
      navigate('/home');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除失败');
      console.error(error);
    }
  };

  // 打开修改文件名对话框
  const handleOpenEditFilename = () => {
    if (image) {
      setNewFilename(image.filename);
      setEditFilenameVisible(true);
    }
  };

  // 保存修改的文件名
  const handleSaveFilename = async () => {
    if (!image || !newFilename.trim()) {
      message.warning('文件名不能为空');
      return;
    }

    try {
      const response = await imageApi.updateImage(image.id, {
        originalFilename: newFilename.trim(),
      });
      if (response.success && response.data) {
        message.success('文件名修改成功');
        setEditFilenameVisible(false);
        // 重新加载图片详情
        await loadImageDetail(image.id);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '修改文件名失败');
      console.error(error);
    }
  };


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!image) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>图片不存在</div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PageHeaderBar
        left={
          <Space size={12} align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/home')}>
              返回
            </Button>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>图片详情</span>
          </Space>
        }
        center={
          image ? (
            <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 16 }}>{image.filename}</span>
          ) : undefined
        }
        right={
          <Space>
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              图像编辑
            </Button>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => navigate('/upload')}>
              上传新图片
            </Button>
          </Space>
        }
      />
      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <Row gutter={[24, 24]}>
          {/* 左侧：图片展示 */}
          <Col xs={24} lg={14}>
            <Card>
              <div style={{ textAlign: 'center', background: '#fafafa', padding: '20px', borderRadius: 8 }}>
                <Image
                  src={image.url}
                  alt={image.filename}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                  preview={{
                    mask: null,
                  }}
                />
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button 
                  icon={<LeftOutlined />} 
                  onClick={handlePrev}
                >
                  上一张
                </Button>
                <span style={{ color: '#999', fontSize: 14 }}>
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${allImages.length}` : ''}
                </span>
                <Button 
                  icon={<RightOutlined />} 
                  onClick={handleNext}
                >
                  下一张
                </Button>
              </div>
            </Card>
          </Col>

          {/* 右侧：元数据和操作 */}
          <Col xs={24} lg={10}>
            <Card title="图片信息" style={{ marginBottom: 16 }}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="文件名">{image.filename}</Descriptions.Item>
                {image.exif?.width && image.exif?.height && (
                  <Descriptions.Item label="分辨率">
                    {image.exif.width} × {image.exif.height}
                  </Descriptions.Item>
                )}
                {image.size && (
                  <Descriptions.Item label="文件大小">{formatFileSize(image.size)}</Descriptions.Item>
                )}
                <Descriptions.Item label="上传时间">{formatDateTime(image.uploadTime)}</Descriptions.Item>
                {image.exif?.dateTime && (
                  <Descriptions.Item label="拍摄时间 (EXIF)">{formatDateTime(image.exif.dateTime)}</Descriptions.Item>
                )}
                {image.exif?.location && (
                  <Descriptions.Item label="拍摄地点 (EXIF)">{image.exif.location}</Descriptions.Item>
                )}
                {image.exif?.device && (
                  <Descriptions.Item label="设备信息 (EXIF)">{image.exif.device}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* 标签计数 - 独立区域 */}
            <Card 
              title="标签" 
              style={{ marginBottom: 16 }}
            >
              {/* 添加标签输入框 */}
              <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
                <Input
                  id="new-tag-input"
                  placeholder="输入标签名称"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onPressEnter={handleAddTag}
                  allowClear
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTag}>
                  添加
                </Button>
              </Space.Compact>

              {/* 标签列表 */}
              {image.tags && image.tags.length > 0 ? (
                <Space wrap>
                  {image.tags.map((tag) => (
                    <Tag
                      key={tag.id}
                      closable
                      onClose={() => handleDeleteTag(tag.id)}
                      style={{ marginBottom: 8 }}
                    >
                      {tag.name}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <div style={{ color: '#999' }}>暂无标签</div>
              )}
            </Card>

            <Card title="操作">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button icon={<EditOutlined />} block onClick={handleEdit}>
                  图像编辑
                </Button>
                <Button icon={<FileTextOutlined />} block onClick={handleOpenEditFilename}>
                  修改文件名
                </Button>
                <Button 
                  icon={<RobotOutlined />} 
                  block 
                  onClick={handleAiAnalyze}
                  loading={aiAnalyzing}
                >
                  AI 分析（自动生成标签）
                </Button>
                <Button icon={<DownloadOutlined />} block onClick={handleDownload}>
                  下载
                </Button>
                <Popconfirm
                  title="确认删除"
                  description="确定要删除这张图片吗？此操作不可恢复。"
                  onConfirm={handleDelete}
                  okText="删除"
                  okType="danger"
                  cancelText="取消"
                >
                  <Button icon={<DeleteOutlined />} danger block>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          </Col>
        </Row>
      </Content>

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
    </Layout>
  );
});

export default ImageDetailComponent;
