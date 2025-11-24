import { observer } from 'mobx-react-lite';
import { Form, Input, Button, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';

type LoginFormValues = {
  username: string;
  password: string;
};

const Login = observer(() => {
  const navigate = useNavigate();

  const handleSubmit = (values: LoginFormValues) => {
    // TODO: hook up real login API
    message.success(`欢迎回来，${values.username}`);
    navigate('/home');
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
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
});

export default Login;


