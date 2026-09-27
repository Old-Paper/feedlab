import { defineConfig } from 'vitest/config'

// 核心实验逻辑都是纯 Node 代码, 使用 node 环境即可, 不引入 jsdom。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
