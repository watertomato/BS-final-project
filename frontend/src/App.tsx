import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider } from 'antd';
import { UserOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import Profile from './components/Profile';
import Upload from './components/Upload';
import View from './components/View';
import './App.css';

const { Header, Content } = Layout;

function AppContent() {
  const location = useLocation();
  
  const menuItems = [
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">个人信息</Link>,
    },
    {
      key: '/upload',
      icon: <UploadOutlined />,
      label: <Link to="/upload">上传图片</Link>,
    },
    {
      key: '/view',
      icon: <EyeOutlined />,
      label: <Link to="/view">我的图片</Link>,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', float: 'left', marginRight: '20px' }}>
            图片管理系统
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ lineHeight: '64px' }}
          />
        </Header>
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Routes>
            <Route path="/" element={<Profile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/view" element={<View />} />
          </Routes>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
