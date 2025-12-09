/**
 * 文件名编码处理中间件
 * 修复 multer 处理中文文件名时的编码问题
 * 
 * multer 在处理 multipart/form-data 时，如果 Content-Disposition header 中的文件名
 * 包含非 ASCII 字符，可能会使用 RFC 2047 编码（如 =?UTF-8?B?...?=）
 * 或者直接使用 latin1 编码。这个中间件尝试正确解码文件名。
 */
export const fixFilenameEncoding = (req, res, next) => {
  if (req.file && req.file.originalname) {
    const originalName = req.file.originalname;
    
    try {
      // 方法1: 检查是否是 RFC 2047 编码格式（=?charset?encoding?encoded-text?=）
      const rfc2047Match = originalName.match(/^=\?([^?]+)\?([BQ])\?([^?]+)\?=$/);
      if (rfc2047Match) {
        const [, charset, encoding, encodedText] = rfc2047Match;
        if (encoding === 'B') {
          // Base64 编码
          const buffer = Buffer.from(encodedText, 'base64');
          req.file.originalname = buffer.toString(charset.toLowerCase());
        } else if (encoding === 'Q') {
          // Quoted-Printable 编码
          const decoded = encodedText.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          });
          req.file.originalname = Buffer.from(decoded, 'binary').toString(charset.toLowerCase());
        }
        return next();
      }
      
      // 方法2: 尝试从 latin1 解码为 utf8
      // 这是 multer 的常见问题：当浏览器发送 UTF-8 编码的文件名时
      // multer 可能会错误地将其解释为 latin1
      const buffer = Buffer.from(originalName, 'latin1');
      const decoded = buffer.toString('utf8');
      
      // 检查解码后的字符串是否有效（不包含替换字符 �）
      // 并且确实发生了变化（说明确实需要解码）
      if (!decoded.includes('�') && decoded !== originalName) {
        req.file.originalname = decoded;
      }
    } catch (e) {
      // 如果解码失败，保持原始名称
      console.warn('文件名解码失败，使用原始名称:', e.message);
    }
  }
  
  next();
};

