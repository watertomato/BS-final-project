import { callVisionModel, callTextModel, getApiKey, validateConfig } from './llmService.js';

const DEFAULT_MAX_TAGS = 10;

/**
 * 清理和规范化标签
 */
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

/**
 * 从 AI 返回的文本中解析标签
 */
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

/**
 * 构建默认的标签生成提示词
 * @param {number} maxTags - 最大标签数量
 * @param {string[]} existingTags - 已有的标签列表
 * @returns {string} 提示词
 */
const buildDefaultPrompt = (maxTags, existingTags = []) => {
  let prompt = `你是一名图片标注专家。请分析图片内容，给出不超过 ${maxTags} 个简短的中文标签。\n\n`;
  
  if (existingTags && existingTags.length > 0) {
    prompt += `**重要：优先从以下已有标签中选择**（如果标签能准确描述图片内容）：\n`;
    prompt += `${existingTags.join('、')}\n\n`;
    prompt += `**规则：**\n`;
    prompt += `1. 优先从上述已有标签中选择最合适的标签（可以选多个）\n`;
    prompt += `2. 如果已有标签中没有合适的，再自行创造新的标签\n`;
    prompt += `3. 最终输出不超过 ${maxTags} 个标签\n\n`;
  } else {
    prompt += `请直接分析图片内容，创造合适的标签。\n\n`;
  }
  
  prompt += `**输出格式：**使用 JSON 数组输出，例如 ["风景","海边"]。只返回 JSON 数组，不要其他文字。`;
  
  return prompt;
};

/**
 * 生成 AI 标签
 * @param {string} imagePath - 图片路径
 * @param {object} options - 选项
 * @param {string} options.prompt - 自定义提示词
 * @param {number} options.maxTags - 最大标签数量
 * @param {string[]} options.existingTags - 已有的标签列表，LLM 会优先从这些标签中选择
 * @returns {Promise<string[]>} 返回标签数组
 */
export const generateAiTags = async (imagePath, options = {}) => {
  const maxTags = Math.min(Math.max(options.maxTags || DEFAULT_MAX_TAGS, 1), 20);
  const model = process.env.AI_MODEL;

  // 验证配置
  validateConfig(model);

  const apiKey = getApiKey();
  const existingTags = options.existingTags || [];
  const prompt = options.prompt || buildDefaultPrompt(maxTags, existingTags);

  try {
    const text = await callVisionModel(imagePath, prompt, model, apiKey);
    const tags = parseTagsFromText(text, maxTags);
    
    if (tags && tags.length > 0) {
      return tags;
    }
    throw new Error('AI 未能生成有效标签');
  } catch (error) {
    console.error('AI 标签生成失败:', error);
    throw error;
  }
};

/**
 * 解析结构化过滤器（从 AI 返回的 JSON 中提取搜索条件）
 */
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

    // 移除 keyword 字段，只返回 tags, location, dateRange
    return {
      tags,
      location,
      dateRange
    };
  } catch (error) {
    console.error('解析 AI 检索结果失败:', error);
    return null;
  }
};

/**
 * 构建搜索查询提示词
 * @param {string} query - 用户输入的搜索查询
 * @param {string[]} availableTags - 可用的标签列表
 * @param {string[]} availableLocations - 可用的地点列表
 * @returns {string} 提示词
 */
const buildSearchPrompt = (query, availableTags = [], availableLocations = []) => {
  let prompt = `你是一个图片搜索助手。请将用户的自然语言查询转换为结构化的搜索条件。\n\n`;
  
  prompt += `**用户查询：**${query}\n\n`;
  
  // 如果有可用的标签，告诉 LLM
  if (availableTags && availableTags.length > 0) {
    prompt += `**可用的标签列表：**\n`;
    prompt += `${availableTags.join('、')}\n\n`;
    prompt += `**标签选择规则：**\n`;
    prompt += `- 从上述标签列表中选择与查询相关的标签（可以选多个）\n`;
    prompt += `- 如果列表中没有合适的标签，可以留空 []\n\n`;
  } else {
    prompt += `**标签选择规则：**\n`;
    prompt += `- 根据查询内容，提取相关的标签关键词\n`;
    prompt += `- 如果没有相关标签，可以留空 []\n\n`;
  }
  
  // 如果有可用的地点，告诉 LLM
  if (availableLocations && availableLocations.length > 0) {
    prompt += `**可用的地点列表：**\n`;
    prompt += `${availableLocations.filter(loc => loc).join('、')}\n\n`;
    prompt += `**地点选择规则：**\n`;
    prompt += `- 优先从上述地点列表中选择与查询相关的地点\n`;
    prompt += `- 如果列表中没有合适的地点，可以留空 ""\n\n`;
  } else {
    prompt += `**地点选择规则：**\n`;
    prompt += `- 根据查询内容，提取相关的地点信息\n`;
    prompt += `- 如果没有相关地点，可以留空 ""\n\n`;
  }
  
  prompt += `**日期范围规则：**\n`;
  prompt += `- 如果查询中包含时间信息（如"去年"、"2023年"、"上个月"等），转换为日期范围\n`;
  prompt += `- 日期格式：ISO 8601 格式（如 "2023-01-01T00:00:00.000Z"）\n`;
  prompt += `- 如果没有时间信息，可以留空 {"start":"","end":""}\n\n`;
  
  prompt += `**重要说明：**\n`;
  prompt += `- 你可以只填写部分字段，其他字段可以留空\n`;
  prompt += `- tags 可以是空数组 []\n`;
  prompt += `- location 可以是空字符串 ""\n`;
  prompt += `- dateRange 可以是 {"start":"","end":""}\n\n`;
  
  prompt += `**输出格式：**只返回 JSON 对象，格式如下：\n`;
  prompt += `{"tags":[],"location":"","dateRange":{"start":"","end":""}}\n\n`;
  prompt += `**注意：**不要输出 keyword 字段，只输出 tags、location 和 dateRange。`;
  
  return prompt;
};

/**
 * 解析搜索查询意图
 * @param {string} query - 用户输入的搜索查询
 * @param {object} options - 选项
 * @param {string[]} options.availableTags - 可用的标签列表
 * @param {string[]} options.availableLocations - 可用的地点列表
 * @returns {Promise<object>} 返回解析后的搜索条件，包含 tags, location, dateRange（不包含 keyword）
 */
export const interpretSearchQuery = async (query, options = {}) => {
  if (!query || !query.trim()) {
    return {
      tags: [],
      location: null,
      dateRange: null
    };
  }

  const model = process.env.AI_MODEL;

  // 验证配置
  validateConfig(model);

  const apiKey = getApiKey();
  const availableTags = options.availableTags || [];
  const availableLocations = options.availableLocations || [];
  const prompt = buildSearchPrompt(query, availableTags, availableLocations);

  try {
    console.log('=== AI 搜索调试信息 ===');
    console.log('用户查询:', query);
    console.log('可用标签数量:', availableTags.length);
    console.log('可用地点数量:', availableLocations.length);
    console.log('使用的模型:', model);
    
    const text = await callTextModel(prompt, model, apiKey);
    
    console.log('LLM 原始返回内容:');
    console.log(text);
    console.log('---');
    
    const structured = parseStructuredFilters(text);
    
    if (structured) {
      console.log('解析后的结构化数据:');
      console.log(JSON.stringify(structured, null, 2));
      console.log('=== AI 搜索调试信息结束 ===\n');
      return structured;
    }
    
    console.error('解析失败：未能从 LLM 返回内容中提取结构化数据');
    console.log('=== AI 搜索调试信息结束 ===\n');
    throw new Error('AI 未能解析查询意图');
  } catch (error) {
    console.error('AI 检索意图解析失败:', error);
    console.log('=== AI 搜索调试信息结束 ===\n');
    throw error;
  }
};
