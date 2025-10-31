#!/usr/bin/env node

// 简单的测试脚本，用于演示任务运行器功能

console.log('Test script started!')
console.log('Arguments:', process.argv.slice(2))

// 输出当前环境信息
console.log('Current directory:', process.cwd())
console.log('Node version:', process.version)
console.log('Platform:', process.platform)

// 模拟一些工作
let counter = 0
const interval = setInterval(() => {
  counter++
  console.log(`Working... iteration ${counter}`)

  // 每5秒输出一些信息
  if (counter % 5 === 0) {
    console.log(`Progress update: ${counter} seconds completed`)
  }

  // 模拟30秒后完成
  if (counter >= 30) {
    clearInterval(interval)
    console.log('Test script completed successfully!')
    console.log('Total iterations:', counter)
    process.exit(0)
  }
}, 1000)

// 处理信号
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  clearInterval(interval)
  console.log(`Script stopped after ${counter} iterations`)
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...')
  clearInterval(interval)
  console.log(`Script stopped after ${counter} iterations`)
  process.exit(0)
})

// 设置超时保护
setTimeout(() => {
  console.error('Script timed out after 60 seconds!')
  process.exit(1)
}, 60000)

console.log('Test script is running. Press Ctrl+C to stop.')
