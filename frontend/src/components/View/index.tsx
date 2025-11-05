import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { Card, Image, Empty, Spin, Modal, Button, message, Popconfirm } from 'antd';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { appStore } from '../../store';
import { formatDateTime, formatFileSize } from '../../utils';

const ViewComponent = observer(() => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const { images, loading } = appStore;

  useEffect(() => {
    appStore.loadImages();
  }, []);

  // 预览图片
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  // 删除图片
  const handleDelete = async (imageId: string) => {
    try {
      await appStore.deleteImage(imageId);
      message.success('删除成功');
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  if (loading && images.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <Card>
        <Empty description="暂无图片，快去上传吧！" />
      </Card>
    );
  }

  return (
    <>
      <Card title={`我的图片 (${images.length})`}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 16,
          }}
        >
          {images.map((image) => (
            <Card
              key={image.id}
              hoverable
              cover={
                <Image
                  src={image.url}
                  alt={image.filename}
                  height={200}
                  style={{ objectFit: 'cover' }}
                  preview={false}
                />
              }
              actions={[
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(image.url)}
                >
                  预览
                </Button>,
                <Popconfirm
                  title="确定要删除这张图片吗？"
                  onConfirm={() => handleDelete(image.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="text" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <Card.Meta
                title={
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={image.filename}
                  >
                    {image.filename}
                  </div>
                }
                description={
                  <div>
                    <div>{formatDateTime(image.uploadTime)}</div>
                    {image.size && (
                      <div style={{ marginTop: 4 }}>
                        {formatFileSize(image.size)}
                      </div>
                    )}
                  </div>
                }
              />
            </Card>
          ))}
        </div>
      </Card>

      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <Image src={previewImage} alt="预览" style={{ width: '100%' }} />
      </Modal>
    </>
  );
});

export default ViewComponent;

