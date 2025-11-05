import { observer } from 'mobx-react-lite';
import { useState, useRef } from 'react';
import { Card, Upload, Button, message, Image } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { appStore } from '../../store';
import { isValidImageType, isValidFileSize, createImagePreview, revokeImagePreview } from '../../utils';
import ReactCropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

const UploadComponent = observer(() => {
  const [preview, setPreview] = useState<string>('');
  const [cropperVisible, setCropperVisible] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string>('');
  const cropperRef = useRef<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const { loading } = appStore;

  // 处理文件选择
  const handleFileChange = (file: File) => {
    // 验证文件类型
    if (!isValidImageType(file)) {
      message.error('请选择有效的图片文件（JPG、PNG、GIF、WebP）');
      return false;
    }

    // 验证文件大小
    if (!isValidFileSize(file, 10)) {
      message.error('图片大小不能超过 10MB');
      return false;
    }

    setFile(file);
    const previewUrl = createImagePreview(file);
    setPreview(previewUrl);
    setCropperVisible(true);
    return false; // 阻止自动上传
  };

  // 裁剪完成
  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        width: 800,
        height: 800,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const croppedFile = new File([blob], file?.name || 'cropped.jpg', {
            type: 'image/jpeg',
          });
          setFile(croppedFile);
          setCroppedImage(canvas.toDataURL());
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // 确认裁剪
  const handleConfirmCrop = () => {
    handleCrop();
    setCropperVisible(false);
  };

  // 取消裁剪
  const handleCancelCrop = () => {
    if (preview) {
      revokeImagePreview(preview);
    }
    setPreview('');
    setCropperVisible(false);
    setFile(null);
  };

  // 上传图片
  const handleUpload = async () => {
    if (!file) {
      message.warning('请先选择图片');
      return;
    }

    try {
      await appStore.uploadImage(file);
      message.success('图片上传成功');
      // 清理预览
      if (preview) {
        revokeImagePreview(preview);
      }
      setPreview('');
      setCroppedImage('');
      setFile(null);
    } catch (error: any) {
      message.error(error.message || '上传失败');
    }
  };

  return (
    <Card title="上传图片" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Upload
          beforeUpload={handleFileChange}
          showUploadList={false}
          accept="image/*"
        >
          <Button icon={<UploadOutlined />} size="large">
            选择图片
          </Button>
        </Upload>
      </div>

      {cropperVisible && preview && (
        <Card
          title="图片裁剪"
          extra={
            <div>
              <Button onClick={handleCancelCrop} style={{ marginRight: 8 }}>
                取消
              </Button>
              <Button type="primary" onClick={handleConfirmCrop}>
                确认裁剪
              </Button>
            </div>
          }
          style={{ marginBottom: 24 }}
        >
          <ReactCropper
            ref={cropperRef}
            src={preview}
            style={{ height: 400, width: '100%' }}
            aspectRatio={1}
            guides={true}
            crop={handleCrop}
            viewMode={1}
            minCropBoxHeight={100}
            minCropBoxWidth={100}
            background={false}
            responsive={true}
            autoCropArea={0.8}
            checkOrientation={false}
          />
        </Card>
      )}

      {croppedImage && !cropperVisible && (
        <Card
          title="预览"
          extra={
            <Button
              icon={<DeleteOutlined />}
              onClick={() => {
                if (preview) revokeImagePreview(preview);
                setPreview('');
                setCroppedImage('');
                setFile(null);
              }}
            >
              清除
            </Button>
          }
          style={{ marginBottom: 24 }}
        >
          <Image src={croppedImage} alt="预览" style={{ maxWidth: '100%' }} />
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              onClick={handleUpload}
              loading={loading}
              size="large"
              block
            >
              上传图片
            </Button>
          </div>
        </Card>
      )}
    </Card>
  );
});

export default UploadComponent;

