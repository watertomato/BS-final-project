import { Card, Typography } from 'antd';
import type { ReactNode } from 'react';
import './auth.css';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
};

const AuthLayout = ({ title, subtitle, footer, children }: AuthLayoutProps) => {
  return (
    <div className="auth-page">
      <Card className="auth-card" bordered={false}>
        <div className="auth-logo">图片管理系统</div>
        <Typography.Title level={3} className="auth-title">
          {title}
        </Typography.Title>
        {subtitle && (
          <Typography.Paragraph className="auth-subtitle">
            {subtitle}
          </Typography.Paragraph>
        )}
        <div className="auth-content">{children}</div>
        {footer && <div className="auth-footer">{footer}</div>}
      </Card>
    </div>
  );
};

export default AuthLayout;


