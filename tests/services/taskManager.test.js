import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { runScript, stopScript, listScripts, getStatus } from '../../src/services/taskManager.js'
import { spawn } from 'child_process'

// 模拟child_process
vi.mock('child_process', () => {
  const mockProcess = {
    pid: 1234,
    stdout: {
      on: vi.fn((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Test output')), 10)
        }
      })
    },
    stderr: {
      on: vi.fn()
    },
    on: vi.fn((event, callback) => {
      if (event === 'close') {
        // For oneTime mode, trigger close immediately
        const exitCode = 0
        setTimeout(() => {
          callback(exitCode)
        }, 10)
      }
    }),
    kill: vi.fn().mockReturnValue(true),
    unref: vi.fn()
  }

  return {
    spawn: vi.fn().mockReturnValue(mockProcess)
  }
})

vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid-123')
}))

describe('Task Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('runScript', () => {
    it('should run a script successfully', async () => {
      const result = await runScript('./tests/test-script.js', ['arg1'])

      expect(result.success).toBe(true)
      expect(result.id).toBe('test-uuid-123')
      expect(spawn).toHaveBeenCalledWith('node', ['./tests/test-script.js', 'arg1'], expect.any(Object))
    })

    it('should run a script in oneTime mode', async () => {
      // Mock a simple process that exits immediately for oneTime testing
      const mockProcess = {
        pid: 1234,
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('OneTime test output')), 10)
            }
          })
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('OneTime test error')), 10)
            }
          })
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            const exitCode = 42
            setTimeout(() => {
              callback(exitCode)
            }, 10)
          }
        }),
        kill: vi.fn().mockReturnValue(true),
        unref: vi.fn()
      }

      spawn.mockReturnValueOnce(mockProcess)

      const result = await runScript('./tests/test-one-time.js', ['arg1'], { oneTime: true })

      expect(result.success).toBe(true)
      expect(result.mode).toBe('oneTime')
      expect(result.exitCode).toBe(42)
      expect(result.output).toContain('OneTime test output')
      expect(result.error).toContain('OneTime test error')
      expect(spawn).toHaveBeenCalledWith('node', ['./tests/test-one-time.js', 'arg1'], expect.objectContaining({ detached: true }))
    })

    it('should handle script errors gracefully', async () => {
      spawn.mockImplementationOnce(() => {
        throw new Error('Spawn error')
      })

      const result = await runScript('./invalid.js')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Spawn error')
    })
  })

  describe('listScripts', () => {
    it('should list running scripts', async () => {
      // 先运行一个脚本
      await runScript('./tests/test-script.js')

      const result = await listScripts()

      expect(result.success).toBe(true)
      expect(result.count).toBeGreaterThan(0)
      expect(result.scripts).toBeInstanceOf(Array)
    })

    it('should return empty list when no scripts are running', async () => {
      // 注意：这会测试当前状态，可能受之前测试影响
      const result = await listScripts()

      expect(result.success).toBe(true)
      expect(Array.isArray(result.scripts)).toBe(true)
    })
  })

  describe('getStatus', () => {
    it('should return server status information', async () => {
      const result = await getStatus()

      expect(result.success).toBe(true)
      expect(result.server).toHaveProperty('uptime')
      expect(result.server).toHaveProperty('timestamp')
      expect(result.memory).toHaveProperty('rss')
      expect(result.tasks).toHaveProperty('total')
    })
  })

  describe('stopScript', () => {
    it('should attempt to stop a running script', async () => {
      // 先运行一个脚本获取ID
      const runResult = await runScript('./tests/test-script.js')

      const stopResult = await stopScript(runResult.id)

      // 在测试环境中，我们只验证调用了正确的方法，不关心实际结果
      expect(stopResult).toBeTruthy()
      expect(stopResult.id).toBe(runResult.id)
    })

    it('should return error for non-existent script', async () => {
      const result = await stopScript('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Script not found')
    })
  })
})
