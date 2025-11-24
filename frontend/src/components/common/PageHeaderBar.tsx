import type { CSSProperties, ReactNode } from 'react';

interface PageHeaderBarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  maxWidth?: number;
  style?: CSSProperties;
}

const containerStyleBase: CSSProperties = {
  width: '100%',
  margin: '0 auto',
  padding: '0 24px',
  minHeight: 64,
  display: 'flex',
  alignItems: 'center',
  gap: 24,
};

const PageHeaderBar = ({ left, center, right, maxWidth = 1280, style }: PageHeaderBarProps) => {
  return (
    <header
      style={{
        width: '100%',
        background: '#000',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        ...style,
      }}
    >
      <div style={{ ...containerStyleBase, maxWidth }}>
        {left && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'inherit' }}>
            {left}
          </div>
        )}

        {center && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit',
            }}
          >
            {center}
          </div>
        )}

        {right && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginLeft: center ? 0 : 'auto',
              color: 'inherit',
            }}
          >
            {right}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeaderBar;


