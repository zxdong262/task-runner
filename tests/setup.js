// 测试环境设置
import { beforeAll, afterAll } from 'vitest'

// 模拟环境变量
process.env.AUTH_USER = 'test_user'
process.env.AUTH_PASSWORD = 'test_password'
process.env.PORT = '3001'

// 在所有测试之前执行
beforeAll(() => {
  console.log('Test environment setup')
})

// 在所有测试之后执行
afterAll(() => {
  console.log('Test environment teardown')
})
