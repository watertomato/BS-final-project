import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Upload from './components/Upload';
import Home from './components/Home';
import ImageDetail from './components/Image';
import ImageEditor from './components/Edit';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import './App.css';

function AppContent() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/image/:id" element={<ImageDetail />} />
        <Route path="/edit/:id" element={<ImageEditor />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
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
