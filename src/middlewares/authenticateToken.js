const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.JWT_SECRET

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: '沒有提供 token' })
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '無效的 token' })
    }

    req.user = user
    next()
  })
}

module.exports =  authenticateToken 