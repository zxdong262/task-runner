import basicAuth from 'basic-auth'

/**
 * 基本认证中间件
 * 验证请求的用户凭据是否与环境变量中配置的匹配
 */
const auth = (req, res, next) => {
  const credentials = basicAuth(req)

  // 获取环境变量中的认证信息
  const expectedUser = process.env.AUTH_USER || 'admin'
  const expectedPassword = process.env.AUTH_PASSWORD || 'password'

  // 检查凭据是否提供且匹配
  if (!credentials ||
      credentials.name !== expectedUser ||
      credentials.pass !== expectedPassword) {
    // 设置WWW-Authenticate头，要求基本认证
    res.set('WWW-Authenticate', 'Basic realm="Task Runner API"')

    // 返回401未授权状态
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide valid username and password'
    })
  }

  // 认证成功，继续处理请求
  next()
}

export default auth
