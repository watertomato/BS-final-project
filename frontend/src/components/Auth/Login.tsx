import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Form, Input, Button, App } from 'antd';
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
  const { message } = App.useApp();
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (userStore.isLoggedIn) {
      navigate('/home', { replace: true });
    }
  }, [userStore.isLoggedIn, navigate]);

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      const response = await authApi.login(values);
      
      // 检查响应是否成功
      if (!response || !response.success || !response.data?.token) {
        // 如果响应不成功，统一显示错误消息并清空表单
        message.error('用户不存在或密码错误');
        form.setFieldsValue({ username: '', password: '' });
        form.resetFields(['username', 'password']);
        return;
      }

      // 登录成功
      await userStore.login(response.data.token);
      message.success(response.message || `欢迎回来，${response.data.user.username}`);
      navigate('/home');
    } catch (error: any) {
      // 统一显示登录失败的错误消息并清空表单
      console.error('登录错误详情:', error);
      
      // 直接调用 message.error，确保错误消息显示
      message.error('用户不存在或密码错误');
      
      // 清空表单
      form.setFieldsValue({ username: '', password: '' });
      form.resetFields(['username', 'password']);
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
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 6, message: '用户名至少 6 个字符' },
          ]}
        >
          <Input placeholder="输入用户名" allowClear autoComplete="username" />
        </Form.Item>

        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少 6 个字符' },
          ]}
        >
          <Input.Password placeholder="输入密码" allowClear autoComplete="current-password" />
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


