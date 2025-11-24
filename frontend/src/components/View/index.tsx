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
} from '@ant-design/icons';
import type { ImageInfo, Tag as TagType } from '../../types';
import { formatDateTime, formatFileSize } from '../../utils';
// import { imageApi } from '../../api'; // TODO: 待实现真实API调用

const { Header, Content } = Layout;

// Mock 数据生成函数（用于获取图片列表）
const generateMockImages = (): ImageInfo[] => {
  return Array.from({ length: 30 }, (_, i) => {
    const imageId = `img-${i + 1}`;
    return {
      id: imageId,
      filename: `image-${i + 1}.jpg`,
      url: `https://picsum.photos/1200/800?random=${i + 1}`,
      uploadTime: new Date().toISOString(),
      size: 2500000 + Math.floor(Math.random() * 2000000),
      tags: [
        { id: '1', name: '风景', type: 'custom' },
        { id: '2', name: '旅行', type: 'custom' },
        { id: '3', name: 'iPhone 14 Pro', type: 'exif' },
      ],
      exif: {
        location: '北京',
        device: 'iPhone 14 Pro',
        dateTime: new Date().toISOString(),
        width: 1920 + Math.floor(Math.random() * 1000),
        height: 1080 + Math.floor(Math.random() * 1000),
      },
    };
  });
};

const ImageDetailComponent = observer(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [allImages] = useState<ImageInfo[]>(generateMockImages());
  const [newTagName, setNewTagName] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // 获取当前图片在列表中的索引
  const currentIndex = useMemo(() => {
    if (!image || !allImages) return -1;
    return allImages.findIndex((img) => img.id === image.id);
  }, [image, allImages]);

  // 上一张和下一张的ID
  const prevImageId = useMemo(() => {
    if (currentIndex > 0) {
      return allImages[currentIndex - 1]?.id;
    }
    return null;
  }, [currentIndex, allImages]);

  const nextImageId = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < allImages.length - 1) {
      return allImages[currentIndex + 1]?.id;
    }
    return null;
  }, [currentIndex, allImages]);

  useEffect(() => {
    if (id) {
      loadImageDetail(id);
    }
  }, [id]);


  const loadImageDetail = async (imageId: string) => {
    try {
      setLoading(true);
      // TODO: 替换为真实API调用
      // const response = await imageApi.getImageInfo(imageId);
      // if (response.success && response.data) {
      //   setImage(response.data);
      // }
      
      // Mock 数据 - 从allImages中查找或生成
      const foundImage = allImages.find((img) => img.id === imageId);
      if (foundImage) {
        setImage(foundImage);
      } else {
        // 如果找不到，生成一个mock数据
        const mockImage: ImageInfo = {
          id: imageId,
          filename: `image-${imageId}.jpg`,
          url: `https://picsum.photos/1200/800?random=${imageId}`,
          uploadTime: new Date().toISOString(),
          size: 2500000,
          tags: [
            { id: '1', name: '风景', type: 'custom' },
            { id: '2', name: '旅行', type: 'custom' },
            { id: '3', name: 'iPhone 14 Pro', type: 'exif' },
          ],
          exif: {
            location: '北京',
            device: 'iPhone 14 Pro',
            dateTime: new Date().toISOString(),
            width: 1920,
            height: 1080,
          },
        };
        setImage(mockImage);
      }
    } catch (error) {
      message.error('加载图片详情失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
  const handleAddTag = () => {
    if (!newTagName.trim() || !image) return;
    
    // 检查标签是否已存在
    const tagExists = image.tags?.some((tag) => tag.name === newTagName.trim());
    if (tagExists) {
      message.warning('标签已存在');
      return;
    }

    const newTag: TagType = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      type: 'custom',
    };

    setImage({
      ...image,
      tags: [...(image.tags || []), newTag],
    });

    setNewTagName('');
    message.success('标签添加成功');
    // TODO: 调用API保存标签
  };

  // 删除标签
  const handleDeleteTag = (tagId: string) => {
    if (!image) return;

    setImage({
      ...image,
      tags: image.tags?.filter((tag) => tag.id !== tagId) || [],
    });

    message.success('标签删除成功');
    // TODO: 调用API删除标签
  };

  // AI分析生成标签
  const handleAiAnalyze = async () => {
    if (!image) return;

    setAiAnalyzing(true);
    try {
      // TODO: 调用真实AI分析API
      // const response = await imageApi.aiAnalyze(image.id);
      // if (response.success && response.data?.tags) {
      //   const aiTags = response.data.tags.map((name: string) => ({
      //     id: `ai-${Date.now()}-${Math.random()}`,
      //     name,
      //     type: 'ai' as TagType,
      //   }));
      //   setImage({
      //     ...image,
      //     tags: [...(image.tags || []), ...aiTags],
      //   });
      //   message.success('AI分析完成');
      // }

      // Mock AI分析结果
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const mockAiTags: TagType[] = [
        { id: `ai-${Date.now()}-1`, name: '自然风光', type: 'ai' },
        { id: `ai-${Date.now()}-2`, name: '户外', type: 'ai' },
        { id: `ai-${Date.now()}-3`, name: '风景摄影', type: 'ai' },
      ];

      // 合并新标签，避免重复
      const existingTagNames = new Set(image.tags?.map((t) => t.name) || []);
      const newTags = mockAiTags.filter((tag) => !existingTagNames.has(tag.name));

      if (newTags.length > 0) {
        setImage({
          ...image,
          tags: [...(image.tags || []), ...newTags],
        });
        message.success(`AI分析完成，生成了 ${newTags.length} 个新标签`);
      } else {
        message.info('AI分析完成，但未发现新标签');
      }
    } catch (error) {
      message.error('AI分析失败');
      console.error(error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleEdit = () => {
    if (image) {
      navigate(`/edit/${image.id}`);
    }
  };

  const handleDownload = () => {
    if (image) {
      // 创建临时链接下载
      const link = document.createElement('a');
      link.href = image.url;
      link.download = image.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('开始下载');
    }
  };

  const handleDelete = () => {
    if (image) {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除图片 "${image.filename}" 吗？此操作不可恢复。`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            // TODO: 调用删除API
            // await imageApi.deleteImage(image.id);
            message.success('删除成功');
            navigate('/home');
          } catch (error) {
            message.error('删除失败');
            console.error(error);
          }
        },
      });
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
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/home')}>
            返回
          </Button>
          <span style={{ fontSize: 16, fontWeight: 500 }}>图片详情</span>
        </Space>
      </Header>
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
                  disabled={!prevImageId}
                  onClick={handlePrev}
                >
                  上一张
                </Button>
                <span style={{ color: '#999', fontSize: 14 }}>
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${allImages.length}` : ''}
                </span>
                <Button 
                  icon={<RightOutlined />} 
                  disabled={!nextImageId}
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
            {image.tags && image.tags.length > 0 && (
              <div style={{ 
                marginBottom: 16, 
                padding: '12px 16px', 
                background: '#fafafa', 
                borderRadius: 6,
                textAlign: 'center',
                color: '#666',
                fontSize: 14
              }}>
                共 {image.tags.length} 个标签
              </div>
            )}

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
                  编辑
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
    </Layout>
  );
});

export default ImageDetailComponent;
