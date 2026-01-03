import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import prisma from '../utils/prisma.js';

class ImageSearchMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'image-search-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_images',
            description: '通过自然语言描述搜索图片库中的图片',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '图片搜索描述，例如："风景照片"、"狗狗图片"、"昨天拍摄的照片"',
                },
                limit: {
                  type: 'number',
                  description: '返回图片的最大数量，默认20',
                  default: 20,
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '指定标签筛选',
                },
                location: {
                  type: 'string',
                  description: '指定地点筛选',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_image_details',
            description: '获取指定图片的详细信息',
            inputSchema: {
              type: 'object',
              properties: {
                image_id: {
                  type: 'string',
                  description: '图片ID',
                },
              },
              required: ['image_id'],
            },
          },
          {
            name: 'list_user_tags',
            description: '列出用户的所有标签',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: '返回标签的最大数量，默认50',
                  default: 50,
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_images':
            return await this.searchImages(args);
          case 'get_image_details':
            return await this.getImageDetails(args);
          case 'list_user_tags':
            return await this.listUserTags(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });
  }

  async searchImages(args) {
    const { query, limit = 20, tags, location } = args;

    // 这里需要用户ID，但MCP协议中没有认证机制
    // 我们可以假设使用第一个用户，或者提供一个默认用户
    // 实际使用时可能需要通过环境变量或配置文件指定用户ID
    const userId = process.env.MCP_DEFAULT_USER_ID ?
      BigInt(process.env.MCP_DEFAULT_USER_ID) :
      BigInt(1); // 默认使用用户ID 1

    try {
      // 构建搜索条件
      const where = {
        userId,
        AND: []
      };

      // 如果提供了标签，使用标签筛选
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagConditions = tags.map(tagName => ({
          imageTags: {
            some: {
              tag: {
                name: tagName
              }
            }
          }
        }));

        if (tagConditions.length === 1) {
          where.AND.push(tagConditions[0]);
        } else {
          where.AND.push({
            AND: tagConditions
          });
        }
      }

      // 如果提供了地点，使用地点筛选
      if (location) {
        where.AND.push({
          location: {
            contains: location
          }
        });
      }

      // 如果没有提供具体的筛选条件，使用关键词搜索
      if ((!tags || tags.length === 0) && !location) {
        where.AND.push({
          OR: [
            {
              originalFilename: {
                contains: query
              }
            },
            {
              location: {
                contains: query
              }
            },
            {
              imageTags: {
                some: {
                  tag: {
                    name: {
                      contains: query
                    }
                  }
                }
              }
            }
          ]
        });
      }

      if (where.AND.length === 0) {
        delete where.AND;
      }

      // 查询图片
      const images = await prisma.image.findMany({
        where,
        take: Math.min(parseInt(limit) || 20, 50), // 限制最大返回数量
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          imageTags: {
            include: {
              tag: true
            }
          }
        }
      });

      const formattedImages = images.map(img => ({
        id: img.id.toString(),
        filename: img.originalFilename,
        uploadTime: img.createdAt.toISOString(),
        fileSize: img.fileSize,
        resolution: img.resolution,
        location: img.location,
        deviceInfo: img.deviceInfo,
        shootingTime: img.shootingTime,
        tags: img.imageTags.map(it => ({
          name: it.tag.name,
          type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai'
        }))
      }));

      return {
        content: [{
          type: 'text',
          text: `找到 ${formattedImages.length} 张图片匹配"${query}"：\n\n${formattedImages.map(img =>
            `📸 ${img.filename}\n   🏷️ 标签: ${img.tags.map(t => t.name).join(', ') || '无'}\n   📍 地点: ${img.location || '未知'}\n   📅 时间: ${img.shootingTime || img.uploadTime}\n   🆔 ID: ${img.id}\n`
          ).join('\n')}`
        }],
      };

    } catch (error) {
      console.error('Search images error:', error);
      return {
        content: [{ type: 'text', text: `搜索图片失败: ${error.message}` }],
        isError: true,
      };
    }
  }

  async getImageDetails(args) {
    const { image_id } = args;

    const userId = process.env.MCP_DEFAULT_USER_ID ?
      BigInt(process.env.MCP_DEFAULT_USER_ID) :
      BigInt(1);

    try {
      const image = await prisma.image.findFirst({
        where: {
          id: BigInt(image_id),
          userId
        },
        include: {
          imageTags: {
            include: {
              tag: true
            }
          }
        }
      });

      if (!image) {
        return {
          content: [{ type: 'text', text: `未找到ID为 ${image_id} 的图片` }],
        };
      }

      const details = {
        id: image.id.toString(),
        filename: image.originalFilename,
        uploadTime: image.createdAt.toISOString(),
        fileSize: image.fileSize,
        resolution: image.resolution,
        location: image.location,
        deviceInfo: image.deviceInfo,
        shootingTime: image.shootingTime,
        tags: image.imageTags.map(it => ({
          name: it.tag.name,
          type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai'
        }))
      };

      return {
        content: [{
          type: 'text',
          text: `📸 图片详情：\n\n` +
            `文件名: ${details.filename}\n` +
            `上传时间: ${details.uploadTime}\n` +
            `文件大小: ${details.fileSize ? `${(details.fileSize / 1024 / 1024).toFixed(2)} MB` : '未知'}\n` +
            `分辨率: ${details.resolution || '未知'}\n` +
            `拍摄地点: ${details.location || '未知'}\n` +
            `拍摄设备: ${details.deviceInfo || '未知'}\n` +
            `拍摄时间: ${details.shootingTime || '未知'}\n` +
            `标签: ${details.tags.map(t => `${t.name}(${t.type})`).join(', ') || '无'}\n` +
            `图片ID: ${details.id}`
        }],
      };

    } catch (error) {
      console.error('Get image details error:', error);
      return {
        content: [{ type: 'text', text: `获取图片详情失败: ${error.message}` }],
        isError: true,
      };
    }
  }

  async listUserTags(args) {
    const { limit = 50 } = args;

    const userId = process.env.MCP_DEFAULT_USER_ID ?
      BigInt(process.env.MCP_DEFAULT_USER_ID) :
      BigInt(1);

    try {
      // 获取用户的所有图片标签
      const imageTags = await prisma.imageTagRelation.findMany({
        where: {
          image: {
            userId
          }
        },
        include: {
          tag: true
        },
        distinct: ['tagId']
      });

      const tags = imageTags.map(it => ({
        name: it.tag.name,
        type: it.tag.type === 1 ? 'custom' : it.tag.type === 2 ? 'exif' : 'ai',
        count: 0 // 这里可以后续统计每个标签的使用次数
      }));

      // 限制返回数量
      const limitedTags = tags.slice(0, Math.min(parseInt(limit) || 50, 100));

      return {
        content: [{
          type: 'text',
          text: `用户标签列表（共 ${tags.length} 个标签）：\n\n${limitedTags.map(tag =>
            `🏷️ ${tag.name} (${tag.type})`
          ).join('\n')}`
        }],
      };

    } catch (error) {
      console.error('List user tags error:', error);
      return {
        content: [{ type: 'text', text: `获取标签列表失败: ${error.message}` }],
        isError: true,
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Image Search Server started');
  }
}

export default ImageSearchMCPServer;
