import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ 数据库连接成功！');
    
    // 尝试执行一个简单的查询
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ 数据库查询测试通过！');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库连接失败：', error.message);
    console.error('\n请检查：');
    console.error('1. MySQL 服务是否已启动');
    console.error('2. .env 文件中的数据库配置是否正确');
    console.error('3. 数据库是否已创建（运行 CREATE DATABASE image_management;）');
    process.exit(1);
  }
}

testConnection();

