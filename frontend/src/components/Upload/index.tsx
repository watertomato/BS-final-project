import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  List,
  Progress,
  Space,
  Tag,
  Typography,
  Upload,
  message,
  Empty,
} from 'antd';
import { InboxOutlined, UploadOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { imageApi } from '../../api';
import { imageStore } from '../../store';
import {
  createImagePreview,
  formatFileSize,
  isValidFileSize,
  isValidImageType,
  revokeImagePreview,
} from '../../utils';
import PageHeaderBar from '../common/PageHeaderBar';

const { Dragger } = Upload;
const { Text } = Typography;

type UploadStatus = 'waiting' | 'uploading' | 'success' | 'error';

interface UploadItem {
  uid: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  status: UploadStatus;
  percent: number;
  error?: string;
}

const STATUS_TEXT: Record<UploadStatus, string> = {
  waiting: '等待上传',
  uploading: '上传中',
  success: '上传成功',
  error: '上传失败',
};

const STATUS_COLOR: Record<UploadStatus, string> = {
  waiting: 'default',
  uploading: 'processing',
  success: 'success',
  error: 'error',
};

const UploadPage = () => {
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const addFiles = (newFiles: File[]) => {
    if (!newFiles.length) return;

    const appended: UploadItem[] = [];
    newFiles.forEach((file) => {
      if (!isValidImageType(file)) {
        message.warning(`${file.name} 不是支持的图片格式`);
        return;
      }
      if (!isValidFileSize(file, 20)) {
        message.warning(`${file.name} 超过 20MB 限制`);
        return;
      }

      appended.push({
        uid: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        preview: createImagePreview(file),
        name: file.name,
        size: file.size,
        status: 'waiting',
        percent: 0,
      });
    });

    if (appended.length === 0) {
      return;
    }

    setFiles((prev) => [...prev, ...appended]);
    message.success(`已添加 ${appended.length} 个文件`);
  };

  const updateFile = (uid: string, updates: Partial<UploadItem>) => {
    setFiles((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, ...updates } : item))
    );
  };

  const handleUpload = async (item: UploadItem) => {
    updateFile(item.uid, { status: 'uploading', percent: 0, error: undefined });
    try {
      const response = await imageApi.uploadImage(item.file, (event) => {
        if (!event.total) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        updateFile(item.uid, { percent });
      });

      if (response.success) {
        updateFile(item.uid, { status: 'success', percent: 100 });
        return true;
      }

      updateFile(item.uid, {
        status: 'error',
        error: response.message || '上传失败',
        percent: 100,
      });
      return false;
    } catch (error: any) {
      updateFile(item.uid, {
        status: 'error',
        error: error.message || '上传失败',
      });
      return false;
    }
  };

  const handleUploadAll = async () => {
    const targets = files.filter((item) => item.status === 'waiting' || item.status === 'error');
    if (targets.length === 0) {
      message.info('没有需要上传的文件');
      return;
    }

    setUploading(true);
    let successCount = 0;
    for (const item of targets) {
      // eslint-disable-next-line no-await-in-loop
      const success = await handleUpload(item);
      if (success) {
        successCount += 1;
      }
    }
    setUploading(false);
    if (successCount > 0) {
      message.success(`成功上传 ${successCount} 个文件`);
      imageStore.loadImages();
    } else {
      message.error('上传失败，请重试');
    }
  };

  const handleClear = () => {
    if (files.length === 0) return;
    files.forEach((item) => revokeImagePreview(item.preview));
    setFiles([]);
  };

  const filesRef = useRef<UploadItem[]>([]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => revokeImagePreview(item.preview));
    };
  }, []);

  const uploadProps: UploadProps = {
    multiple: true,
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file) => {
      addFiles([file]);
      return false;
    },
  };

  const canUpload = useMemo(
    () => files.some((item) => item.status === 'waiting' || item.status === 'error'),
    [files]
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageHeaderBar
        left={
          <Space size={12} align="center">
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
            <div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 600 }}>图片上传</div>
              <Text style={{ color: 'rgba(255, 255, 255, 0.75)' }}>拖拽或选择图片加入上传队列</Text>
            </div>
          </Space>
        }
        right={
          <Button icon={<HomeOutlined />} onClick={() => navigate('/home')}>
            返回主页
          </Button>
        }
      />
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 960 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Dragger {...uploadProps} style={{ padding: 24 }}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">拖拽图片到此处</p>
                  <p className="ant-upload-hint">支持 JPG/PNG/GIF/WebP，单个文件不超过 20MB</p>
                </Dragger>

                <Space wrap>
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>选择图片</Button>
                  </Upload>
                  <Button
                    type="primary"
                    onClick={handleUploadAll}
                    disabled={!canUpload}
                    loading={uploading}
                  >
                    全部上传
                  </Button>
                  <Button onClick={handleClear} disabled={files.length === 0} icon={<DeleteOutlined />}>
                    清空列表
                  </Button>
                </Space>
              </Space>
            </Card>

            <Card title={`上传列表 (${files.length})`}>
              {files.length === 0 ? (
                <Empty description="当前没有待上传的图片" />
              ) : (
                <List
                  dataSource={files}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '16px 0' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                        <Space align="start">
                          <div
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: 8,
                              overflow: 'hidden',
                              background: '#f5f5f5',
                            }}
                          >
                            <img
                              src={item.preview}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <Space direction="vertical" size={4}>
                            <Text strong>{item.name}</Text>
                            <Text type="secondary">{formatFileSize(item.size)}</Text>
                            {item.error && <Text type="danger">{item.error}</Text>}
                          </Space>
                        </Space>

                        <div style={{ flex: 1, paddingLeft: 32 }}>
                          <Space
                            align="center"
                            style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}
                          >
                            <Tag color={STATUS_COLOR[item.status]}>{STATUS_TEXT[item.status]}</Tag>
                            {item.status === 'error' && (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => handleUpload(item)}
                                disabled={uploading}
                              >
                                重试
                              </Button>
                            )}
                          </Space>
                          <Progress
                            percent={item.percent}
                            status={
                              item.status === 'error'
                                ? 'exception'
                                : item.status === 'success'
                                ? 'success'
                                : item.status === 'waiting'
                                ? 'normal'
                                : 'active'
                            }
                          />
                        </div>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;

