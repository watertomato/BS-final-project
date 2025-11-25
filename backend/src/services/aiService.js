import fs from 'fs/promises';
import path from 'path';

const DEFAULT_MAX_TAGS = 5;
const MOCK_TAG_POOL = [
  '风景',
  '人物',
  '城市',
  '建筑',
  '夜景',
  '动物',
  '植物',
  '旅行',
  '海边',
  '山脉',
  '亲子',
  '美食',
  '自拍',
  '运动'
];

const KEYWORD_TAG_MAP = [
  { tag: '海边', keywords: ['海', '海边', '海滩', '沙滩', 'beach', 'ocean'] },
  { tag: '山脉', keywords: ['山', '雪山', '山脉', 'mountain'] },
  { tag: '夜景', keywords: ['夜', '夜景', '夜晚', 'night'] },
  { tag: '城市', keywords: ['城市', '街道', 'city', 'urban', 'downtown'] },
  { tag: '建筑', keywords: ['建筑', 'church', 'castle', 'temple', 'bridge'] },
  { tag: '人物', keywords: ['人物', '人像', 'portrait', '自拍', 'selfie'] },
  { tag: '动物', keywords: ['动物', '猫', '狗', 'pet', 'animal'] },
  { tag: '植物', keywords: ['花', '植物', '花朵', 'flower', 'forest'] },
  { tag: '美食', keywords: ['美食', '食物', 'food', 'dessert', '餐'] },
  { tag: '亲子', keywords: ['家庭', '小孩', 'baby', 'family', 'kid'] },
  { tag: '运动', keywords: ['运动', '跑步', '篮球', 'football', 'sport'] },
  { tag: '旅行', keywords: ['旅行', '旅游', 'trip', 'travel'] }
];

const ensureFetch = () => {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. Please use Node.js 18+ or provide a fetch polyfill.');
  }
  return fetch;
};

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

const sanitizeTags = (tags = [], maxTags = DEFAULT_MAX_TAGS) => {
  const normalized = [];
  for (const tag of tags) {
    if (!tag) continue;
    const cleanTag = String(tag)
      .replace(/^[#*\d\.\s-]+/, '')
      .trim();
    if (cleanTag) {
      normalized.push(cleanTag);
    }
  }
  return Array.from(new Set(normalized)).slice(0, maxTags);
};

const parseTagsFromText = (rawText, maxTags) => {
  if (!rawText) return [];

  // 尝试从 JSON 中解析
  const jsonMatch = rawText.match(/\[.*\]/s);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr)) {
        return sanitizeTags(arr, maxTags);
      }
    } catch (_) {
      // ignore json parse error
    }
  }

  // 尝试从对象 JSON 中获取 tags 字段
  const objectMatch = rawText.match(/\{.*\}/s);
  if (objectMatch) {
    try {
      const obj = JSON.parse(objectMatch[0]);
      if (Array.isArray(obj?.tags)) {
        return sanitizeTags(obj.tags, maxTags);
      }
    } catch (_) {
      // ignore object parse error
    }
  }

  // 按分隔符拆分
  const fallback = rawText
    .split(/[\n,;，；、]/)
    .map((item) => item.replace(/^[#*\d\.\s-]+/, '').trim())
    .filter(Boolean);

  return sanitizeTags(fallback, maxTags);
};

const buildDefaultPrompt = (maxTags) =>
  `你是一名图片标注专家。请分析图片内容，给出不超过 ${maxTags} 个简短的中文标签，使用 JSON 数组输出，例如 ["风景","海边"]。`;

const callGeminiVision = async (imagePath, prompt, maxTags) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 未配置');
  }

  const fetchFn = ensureFetch();
  const fileBuffer = await fs.readFile(imagePath);
  const base64 = fileBuffer.toString('base64');
  const mimeType = detectMimeType(imagePath);
  const model = process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          { text: prompt || buildDefaultPrompt(maxTags) },
          { inlineData: { mimeType, data: base64 } }
        ]
      }
    ]
  };

  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Gemini Vision API 调用失败');
  }

  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n');

  return parseTagsFromText(text, maxTags);
};

const callQwenVision = async (imagePath, prompt, maxTags) => {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('QWEN_API_KEY 未配置');
  }

  const fetchFn = ensureFetch();
  const fileBuffer = await fs.readFile(imagePath);
  const base64 = fileBuffer.toString('base64');
  const mimeType = detectMimeType(imagePath);
  const model = process.env.QWEN_MODEL || 'qwen-vl-plus';
  const endpoint =
    process.env.QWEN_API_ENDPOINT ||
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

  const payload = {
    model,
    input: {
      messages: [
        {
          role: 'system',
          content: [{ text: '你是一名专业的图像理解助手。' }]
        },
        {
          role: 'user',
          content: [
            {
              image: {
                format: mimeType,
                data: base64
              }
            },
            {
              text: prompt || buildDefaultPrompt(maxTags)
            }
          ]
        }
      ]
    },
    parameters: {
      result_format: 'text'
    }
  };

  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.message || 'Qwen 多模态接口调用失败');
  }

  const choices = result?.output?.choices || result?.choices || [];
  const text =
    choices[0]?.message?.content
      ?.map((item) => item?.text)
      .filter(Boolean)
      .join('\n') || '';

  return parseTagsFromText(text, maxTags);
};

const deriveTagsFromText = (text) => {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tags = new Set();

  for (const rule of KEYWORD_TAG_MAP) {
    if (
      rule.keywords.some(
        (keyword) => lower.includes(keyword.toLowerCase()) || text.includes(keyword)
      )
    ) {
      tags.add(rule.tag);
    }
  }

  return Array.from(tags);
};

const buildMockTags = (imagePath, maxTags, options = {}) => {
  const guessSource = [
    path.basename(imagePath || ''),
    options.filename || '',
    options.prompt || ''
  ]
    .filter(Boolean)
    .join(' ');

  const derived = deriveTagsFromText(guessSource);
  const tags = new Set(derived);

  // 填充随机标签
  const pool = MOCK_TAG_POOL.filter((tag) => !tags.has(tag));
  for (const tag of pool) {
    if (tags.size >= maxTags) break;
    tags.add(tag);
  }

  return Array.from(tags).slice(0, maxTags);
};

const buildDateRange = (query) => {
  if (!query) return null;
  const lower = query.toLowerCase();
  const now = new Date();

  const createRange = (start, end) => ({
    start,
    end
  });

  if (lower.includes('去年') || lower.includes('last year')) {
    const year = now.getFullYear() - 1;
    return createRange(new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59));
  }

  if (lower.includes('今年') || lower.includes('this year')) {
    const year = now.getFullYear();
    return createRange(new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59));
  }

  if (lower.includes('上个月') || lower.includes('last month')) {
    const month = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    return createRange(month, end);
  }

  const yearMatch = query.match(/(20\d{2})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return createRange(new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59));
  }

  return null;
};

const parseLocation = (query) => {
  if (!query) return null;
  const zhMatch = query.match(/在([\u4e00-\u9fa5A-Za-z\s]{2,20})/);
  if (zhMatch) {
    return zhMatch[1].replace(/(拍的?|照的?|上)/, '').trim();
  }

  const enMatch = query.match(/in\s+([A-Za-z\s]{2,30})/i);
  if (enMatch) {
    return enMatch[1].trim();
  }

  return null;
};

const heuristicInterpret = (query) => {
  const tags = deriveTagsFromText(query);
  const dateRange = buildDateRange(query);
  const location = parseLocation(query);

  return {
    keyword: query?.trim() || '',
    tags,
    location,
    dateRange
  };
};

const parseStructuredFilters = (text) => {
  if (!text) return null;
  const objectMatch = text.match(/\{.*\}/s);
  if (!objectMatch) return null;

  try {
    const obj = JSON.parse(objectMatch[0]);
    const tags = sanitizeTags(obj.tags || obj.keywords || [], DEFAULT_MAX_TAGS);
    const location = obj.location?.trim() || obj.place?.trim() || null;
    let dateRange = null;

    if (obj.dateRange) {
      dateRange = {
        start: obj.dateRange.start ? new Date(obj.dateRange.start) : null,
        end: obj.dateRange.end ? new Date(obj.dateRange.end) : null
      };
    }

    return {
      keyword: obj.keyword?.trim() || obj.query?.trim() || '',
      tags,
      location,
      dateRange
    };
  } catch (error) {
    console.error('解析 AI 检索结果失败:', error);
    return null;
  }
};

const buildSearchPrompt = (query) =>
  `请将以下自然语言查询转换为 JSON。格式: {"keyword":"","tags":[],"location":"","dateRange":{"start":"","end":""}}。只返回 JSON，查询内容: ${query}`;

const callGeminiText = async (query) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 未配置');
  }

  const fetchFn = ensureFetch();
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildSearchPrompt(query) }] }]
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Gemini 文本接口调用失败');
  }

  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n');

  return parseStructuredFilters(text);
};

const callQwenText = async (query) => {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('QWEN_API_KEY 未配置');
  }

  const fetchFn = ensureFetch();
  const model = process.env.QWEN_MODEL || 'qwen-long';
  const endpoint =
    process.env.QWEN_TEXT_ENDPOINT ||
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

  const payload = {
    model,
    input: {
      prompt: buildSearchPrompt(query)
    }
  };

  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.message || 'Qwen 文本接口调用失败');
  }

  const text =
    result?.output?.text ||
    result?.output?.choices?.[0]?.message?.content?.map((item) => item?.text).join('\n') ||
    '';

  return parseStructuredFilters(text);
};

export const generateAiTags = async (imagePath, options = {}) => {
  const maxTags = Math.min(Math.max(options.maxTags || DEFAULT_MAX_TAGS, 1), 10);
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();

  try {
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      const tags = await callGeminiVision(imagePath, options.prompt, maxTags);
      if (tags.length) return tags;
    }

    if (provider === 'qwen' && process.env.QWEN_API_KEY) {
      const tags = await callQwenVision(imagePath, options.prompt, maxTags);
      if (tags.length) return tags;
    }
  } catch (error) {
    console.error('AI 标签生成失败，使用本地推断:', error);
  }

  return buildMockTags(imagePath, maxTags, options);
};

export const interpretSearchQuery = async (query) => {
  if (!query || !query.trim()) {
    return {
      keyword: '',
      tags: [],
      location: null,
      dateRange: null
    };
  }

  const provider = (process.env.AI_PROVIDER || '').toLowerCase();

  try {
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      const structured = await callGeminiText(query);
      if (structured) {
        structured.keyword = structured.keyword || query.trim();
        return structured;
      }
    }

    if (provider === 'qwen' && process.env.QWEN_API_KEY) {
      const structured = await callQwenText(query);
      if (structured) {
        structured.keyword = structured.keyword || query.trim();
        return structured;
      }
    }
  } catch (error) {
    console.error('AI 检索意图解析失败，使用启发式规则:', error);
  }

  return heuristicInterpret(query);
};


