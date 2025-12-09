import fs from 'fs/promises';
import path from 'path';
import { completion } from 'litellm';

/**
 * 检测图片的 MIME 类型
 */
const detectMimeType = (imagePath) => {
  const ext = path.extname(imagePath || '').toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
};

/**
 * 获取 Base URL（可选）
 * @returns {string|undefined} Base URL，如果未配置则返回 undefined
 */
export const getBaseUrl = () => {
  return process.env.AI_BASE_URL || undefined;
};

/**
 * 调用 Google Gemini API（视觉模型）
 * @param {string} imagePath - 图片路径
 * @param {string} prompt - 提示词
 * @param {string} model - 模型名称（不包含 google/ 前缀）
 * @param {string} apiKey - API Key
 * @returns {Promise<string>} 返回 AI 生成的文本
 */
const callGoogleVisionModel = async (imagePath, prompt, model, apiKey) => {
  const fileBuffer = await fs.readFile(imagePath);
  const base64 = fileBuffer.toString('base64');
  const mimeType = detectMimeType(imagePath);
  const baseUrl = getBaseUrl() || 'https://generativelanguage.googleapis.com/v1beta';

  const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64
            }
          }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // 检查是否有错误
  if (data.error) {
    throw new Error(`Google API 错误: ${JSON.stringify(data.error)}`);
  }
  
  // 检查是否有安全过滤
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Google API 安全过滤：内容被标记为不安全');
  }
  
  // 提取响应文本
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    // 添加详细的调试信息
    console.error('Google API 响应数据:', JSON.stringify(data, null, 2));
    throw new Error(`Google API 返回格式异常，未找到文本内容。响应结构: ${JSON.stringify(data)}`);
  }

  return text;
};

/**
 * 调用视觉模型（支持图片输入）
 * @param {string} imagePath - 图片路径
 * @param {string} prompt - 提示词
 * @param {string} model - 模型名称
 * @param {string} apiKey - API Key
 * @returns {Promise<string>} 返回 AI 生成的文本
 */
export const callVisionModel = async (imagePath, prompt, model, apiKey) => {
  // 如果是 Google 模型，直接调用 Google API
  if (model.startsWith('google/')) {
    const googleModel = model.replace('google/', '');
    return await callGoogleVisionModel(imagePath, prompt, googleModel, apiKey);
  }

  // 其他模型使用 litellm
  const fileBuffer = await fs.readFile(imagePath);
  const base64 = fileBuffer.toString('base64');
  const mimeType = detectMimeType(imagePath);
  const baseUrl = getBaseUrl();

  // 统一使用 litellm 调用，支持多模态输入
  // 注意：虽然类型定义中 content 是 string，但 litellm 内部使用 OpenAI SDK，支持数组格式
  const completionParams = {
    model: model,
    messages: [
      {
        role: 'user',
        // @ts-ignore - litellm 内部支持 OpenAI 格式的多模态 content
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            }
          }
        ]
      }
    ],
    apiKey: apiKey,
    stream: false,
  };

  // 如果配置了 baseUrl，则添加到参数中
  if (baseUrl) {
    completionParams.baseUrl = baseUrl;
  }

  const response = await completion(completionParams);

  return response.choices?.[0]?.message?.content || '';
};

/**
 * 调用 Google Gemini API（文本模型）
 * @param {string} prompt - 提示词
 * @param {string} model - 模型名称（不包含 google/ 前缀）
 * @param {string} apiKey - API Key
 * @returns {Promise<string>} 返回 AI 生成的文本
 */
const callGoogleTextModel = async (prompt, model, apiKey) => {
  const baseUrl = getBaseUrl() || 'https://generativelanguage.googleapis.com/v1beta';

  const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  // 检查是否有错误
  if (data.error) {
    throw new Error(`Google API 错误: ${JSON.stringify(data.error)}`);
  }
  
  // 检查是否有安全过滤
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Google API 安全过滤：内容被标记为不安全');
  }
  
  // 提取响应文本
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    // 添加详细的调试信息
    console.error('Google API 响应数据:', JSON.stringify(data, null, 2));
    throw new Error(`Google API 返回格式异常，未找到文本内容。响应结构: ${JSON.stringify(data)}`);
  }

  return text;
};

/**
 * 调用文本模型
 * @param {string} prompt - 提示词
 * @param {string} model - 模型名称
 * @param {string} apiKey - API Key
 * @returns {Promise<string>} 返回 AI 生成的文本
 */
export const callTextModel = async (prompt, model, apiKey) => {
  // 如果是 Google 模型，直接调用 Google API
  if (model.startsWith('google/')) {
    const googleModel = model.replace('google/', '');
    return await callGoogleTextModel(prompt, googleModel, apiKey);
  }

  // 其他模型使用 litellm
  const baseUrl = getBaseUrl();

  // 统一使用 litellm 调用
  const completionParams = {
    model: model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    apiKey: apiKey,
    stream: false,
  };

  // 如果配置了 baseUrl，则添加到参数中
  if (baseUrl) {
    completionParams.baseUrl = baseUrl;
  }

  const response = await completion(completionParams);

  return response.choices?.[0]?.message?.content || '';
};

/**
 * 获取 API Key
 * @returns {string} API Key
 */
export const getApiKey = () => {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI_API_KEY 未配置，请检查 .env 文件');
  }
  return apiKey;
};

/**
 * 验证 AI 配置
 * @param {string} model - 模型名称
 * @throws {Error} 如果配置不完整
 */
export const validateConfig = (model) => {
  if (!model) {
    throw new Error('AI_MODEL 未配置，请检查 .env 文件');
  }

  // 尝试获取 API Key 以验证配置
  getApiKey();
};
