import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Form, Input, Button, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authApi } from '../../api';
import { userStore } from '../../store';

type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
};

const Register = observer(() => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (userStore.isLoggedIn) {
      navigate('/home', { replace: true });
    }
  }, [userStore.isLoggedIn, navigate]);

  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      const response = await authApi.register(values);
      if (!response.success) {
        throw new Error(response.message || '注册失败，请稍后重试');
      }

      message.success(response.message || '注册成功，请登录');
      navigate('/login');
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || '注册失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="注册图片管理系统"
      subtitle="创建账号以开始管理你的图像素材"
      footer={
        <span>
          已有账号？<Link to="/login">前往登录</Link>
        </span>
      }
    >
      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 6, message: '用户名至少 6 个字符' },
          ]}
        >
          <Input placeholder="输入用户名" allowClear />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        >
          <Input placeholder="name@example.com" allowClear />
        </Form.Item>

        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少 6 个字符' },
          ]}
        >
          <Input.Password placeholder="输入密码" allowClear />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} disabled={loading}>
            注册
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
});

export default Register;


