import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Card, Form, Input, Button, Upload, Avatar, message, Spin } from 'antd';
import { UserOutlined, UploadOutlined, SaveOutlined } from '@ant-design/icons';
import { appStore } from '../../store';
import { formatDateTime } from '../../utils';

const Profile = observer(() => {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const { userInfo, loading } = appStore;

  // 处理头像上传
  const handleAvatarUpload = async (file: File) => {
    try {
      setUploading(true);
      await appStore.uploadAvatar(file);
      message.success('头像上传成功');
    } catch (error: any) {
      message.error(error.message || '头像上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      await appStore.updateUserInfo(values);
      message.success('个人信息更新成功');
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  // 上传前验证
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB！');
      return false;
    }
    handleAvatarUpload(file);
    return false; // 阻止自动上传
  };

  if (loading && !userInfo) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card title="个人信息" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Avatar
          size={120}
          src={userInfo?.avatar}
          icon={<UserOutlined />}
          style={{ marginBottom: 16 }}
        />
        <div>
          <Upload
            beforeUpload={beforeUpload}
            showUploadList={false}
            accept="image/*"
          >
            <Button
              icon={<UploadOutlined />}
              loading={uploading}
              disabled={uploading}
            >
              上传头像
            </Button>
          </Upload>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          username: userInfo?.username || '',
          email: userInfo?.email || '',
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="用户名"
          name="username"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        {userInfo?.createdAt && (
          <Form.Item label="注册时间">
            <Input disabled value={formatDateTime(userInfo.createdAt)} />
          </Form.Item>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={loading}
            block
          >
            保存修改
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
});

export default Profile;

