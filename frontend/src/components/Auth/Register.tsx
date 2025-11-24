import { observer } from 'mobx-react-lite';
import { Form, Input, Button, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';

type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
};

const Register = observer(() => {
  const navigate = useNavigate();

  const handleSubmit = (values: RegisterFormValues) => {
    // TODO: hook up real register API
    message.success('注册成功，请登录');
    navigate('/login');
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
          <Button type="primary" htmlType="submit" block>
            注册
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
});

export default Register;


