import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import Cropper, { type ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import {
  Layout,
  Card,
  Space,
  Button,
  Slider,
  Typography,
  Divider,
  Radio,
  Spin,
  Modal,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CloseOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  RetweetOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ImageInfo } from '../../types';
import { imageApi } from '../../api';
import PageHeaderBar from '../common/PageHeaderBar';

const { Content } = Layout;
const { Title, Text } = Typography;

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

const ASPECT_RATIOS = [
  { label: '自由', value: 'free', ratio: NaN },
  { label: '1 : 1', value: '1', ratio: 1 },
  { label: '4 : 3', value: '4/3', ratio: 4 / 3 },
  { label: '16 : 9', value: '16/9', ratio: 16 / 9 },
  { label: '3 : 2', value: '3/2', ratio: 3 / 2 },
];

const PANEL_CARD_STYLE = {
  background: '#11141b',
  border: '1px solid #1f232d',
};

const PANEL_HEAD_STYLE = {
  color: '#fff',
  borderBottom: '1px solid #1f232d',
};

const PANEL_BODY_STYLE = {
  color: '#fff',
};

const sliderTitleStyle = { color: '#f5f5f5', marginBottom: 8 };

const ImageEditor = observer(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cropperRef = useRef<ReactCropperElement>(null);

  const [image, setImage] = useState<ImageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aspectValue, setAspectValue] = useState<string>('free');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [flip, setFlip] = useState({ x: 1, y: 1 });

  useEffect(() => {
    if (!id) return;

    loadImageDetail(id);
  }, [id]);

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
      message.error('加载图片失败');
      console.error(error);
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };


  const handleAspectRatioChange = (value: string) => {
    setAspectValue(value);
    const option = ASPECT_RATIOS.find((item) => item.value === value);
    if (option && cropperRef.current?.cropper) {
      cropperRef.current.cropper.setAspectRatio(option.ratio);
    }
  };

  const handleRotate = (degree: number) => {
    cropperRef.current?.cropper?.rotate(degree);
  };

  const handleFlip = (direction: 'x' | 'y') => {
    const newScale = direction === 'x' ? flip.x * -1 : flip.y * -1;
    if (!cropperRef.current?.cropper) return;

    if (direction === 'x') {
      cropperRef.current.cropper.scaleX(newScale);
      setFlip((prev) => ({ ...prev, x: newScale }));
    } else {
      cropperRef.current.cropper.scaleY(newScale);
      setFlip((prev) => ({ ...prev, y: newScale }));
    }
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setFlip({ x: 1, y: 1 });
    setAspectValue('free');
    cropperRef.current?.cropper?.reset();
  };

  const handleCancel = () => {
    Modal.confirm({
      title: '放弃编辑？',
      content: '当前修改尚未保存，确认要离开编辑页面吗？',
      okText: '确认',
      cancelText: '继续编辑',
      onOk: () => navigate(id ? `/image/${id}` : '/home'),
    });
  };

  const handleSave = async () => {
    if (!cropperRef.current?.cropper || !image || !id) return;

    try {
      setSaving(true);
      // 先获取裁剪后的 canvas
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
        imageSmoothingQuality: 'high',
      });
      if (!croppedCanvas) {
        message.warning('请先选择裁剪区域');
        return;
      }

      // 创建一个新的 canvas 来应用 filter 效果
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = croppedCanvas.width;
      finalCanvas.height = croppedCanvas.height;
      const ctx = finalCanvas.getContext('2d');
      
      if (!ctx) {
        message.error('无法创建画布上下文');
        setSaving(false);
        return;
      }

      // 应用 filter 效果
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      
      // 将裁剪后的图片绘制到新 canvas 上（此时会应用 filter）
      ctx.drawImage(croppedCanvas, 0, 0);

      // 将处理后的 canvas 转换为 Blob
      finalCanvas.toBlob(async (blob) => {
        if (!blob) {
          message.error('图片处理失败');
          setSaving(false);
          return;
        }

        try {
          // 创建 File 对象并上传编辑后的图片
          const file = new File([blob], image.filename, { type: 'image/jpeg' });
          
          // 调用替换图片文件接口
          const response = await imageApi.replaceImageFile(id, file);
          
          if (response.success) {
            message.success('图片保存成功');
            navigate(`/image/${id}`);
          } else {
            message.error(response.message || '保存失败');
          }
        } catch (error: any) {
          console.error(error);
          message.error(error?.response?.data?.message || '保存失败，请稍后重试');
        } finally {
          setSaving(false);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error(error);
      message.error('保存失败，请稍后重试');
      setSaving(false);
    }
  };

  if (loading || !image) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout
      style={{
        height: '100vh',
        background: '#0b0d10',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PageHeaderBar
        style={{ background: '#050607' }}
        left={
          <Space size={12} align="center">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(id ? `/image/${id}` : '/home')}>
              返回
            </Button>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>图片编辑</span>
          </Space>
        }
        center={<span style={{ color: 'rgba(255,255,255,0.75)' }}>{image.filename}</span>}
        right={
          <Space>
            <Button icon={<CloseOutlined />} onClick={handleCancel}>
              取消
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              保存
            </Button>
          </Space>
        }
      />
      <Content
        style={{
          flex: 1,
          padding: 24,
          background: 'linear-gradient(180deg, #0b0d10 0%, #050607 100%)',
          display: 'flex',
          gap: 24,
          overflow: 'hidden',
        }}
      >
        <Card
          style={{
            flex: 1,
            height: '100%',
            background: '#0f1115',
            border: '1px solid #1f232d',
            display: 'flex',
            flexDirection: 'column',
          }}
          bodyStyle={{ padding: 0, flex: 1, display: 'flex' }}
        >
          <div style={{ flex: 1, padding: 24 }}>
            <div
              style={{
                height: '100%',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#000',
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
              }}
            >
              <Cropper
                src={image.url}
                ref={cropperRef}
                style={{ height: '100%', width: '100%' }}
                viewMode={1}
                background={false}
                responsive
                guides
                autoCropArea={0.9}
                checkOrientation={false}
              />
            </div>
          </div>
        </Card>

        <div
          style={{
            width: 340,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            height: '100%',
          }}
        >
          <Card
            title="裁剪"
            style={PANEL_CARD_STYLE}
            headStyle={PANEL_HEAD_STYLE}
            bodyStyle={PANEL_BODY_STYLE}
            extra={
              <Button type="link" icon={<ReloadOutlined />} onClick={() => cropperRef.current?.cropper?.reset()} />
            }
          >
            <Radio.Group
              style={{ width: '100%' }}
              value={aspectValue}
              onChange={(e) => handleAspectRatioChange(e.target.value)}
            >
              <Space direction="vertical">
                {ASPECT_RATIOS.map((ratio) => (
                  <Radio key={ratio.value} value={ratio.value} style={{ color: '#fff' }}>
                    {ratio.label}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Card>

          <Card title="旋转 / 翻转" style={PANEL_CARD_STYLE} headStyle={PANEL_HEAD_STYLE} bodyStyle={PANEL_BODY_STYLE}>
            <Space wrap style={{ width: '100%' }}>
              <Button icon={<RotateLeftOutlined />} onClick={() => handleRotate(-90)}>
                向左 90°
              </Button>
              <Button icon={<RotateRightOutlined />} onClick={() => handleRotate(90)}>
                向右 90°
              </Button>
              <Button icon={<RetweetOutlined />} onClick={() => handleFlip('x')}>
                水平翻转
              </Button>
              <Button icon={<RetweetOutlined />} onClick={() => handleFlip('y')}>
                垂直翻转
              </Button>
            </Space>
          </Card>

          <Card
            title="色调调整"
            style={PANEL_CARD_STYLE}
            headStyle={PANEL_HEAD_STYLE}
            bodyStyle={PANEL_BODY_STYLE}
            extra={
              <Button type="link" size="small" onClick={() => {
                setBrightness(100);
                setContrast(100);
                setSaturation(100);
              }}>
                重置
              </Button>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={sliderTitleStyle}>
                亮度
              </Title>
              <Slider min={0} max={200} value={brightness} onChange={setBrightness} />
            </div>
            <Divider />
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={sliderTitleStyle}>
                对比度
              </Title>
              <Slider min={0} max={200} value={contrast} onChange={setContrast} />
            </div>
            <Divider />
            <div>
              <Title level={5} style={sliderTitleStyle}>
                饱和度
              </Title>
              <Slider min={0} max={200} value={saturation} onChange={setSaturation} />
            </div>
          </Card>

          <Card style={PANEL_CARD_STYLE} bodyStyle={PANEL_BODY_STYLE}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block onClick={handleReset} icon={<ReloadOutlined />}>
                重置所有
              </Button>
              <Text style={{ color: 'rgba(255,255,255,0.65)' }}>保存后将覆盖原图（Mock 状态，仅前端预览）。</Text>
            </Space>
          </Card>
        </div>
      </Content>
    </Layout>
  );
});

export default ImageEditor;

