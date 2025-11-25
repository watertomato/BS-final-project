import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Form, Input, Button, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authApi } from '../../api';
import { userStore } from '../../store';

type LoginFormValues = {
  username: string;
  password: string;
};

const Login = observer(() => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      const response = await authApi.login(values);
      if (!response.success || !response.data?.token) {
        throw new Error(response.message || '登录失败，请稍后重试');
      }

      await userStore.login(response.data.token);
      message.success(response.message || `欢迎回来，${response.data.user.username}`);
      navigate('/home');
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || '登录失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="登录图片管理系统"
      subtitle="请使用已注册的账号登录"
      footer={
        <span>
          还没有账号？<Link to="/register">立即注册</Link>
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
            登录
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
});

export default Login;


