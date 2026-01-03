#!/usr/bin/env node

import ImageSearchMCPServer from './server.js';

async function main() {
  try {
    const server = new ImageSearchMCPServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();
