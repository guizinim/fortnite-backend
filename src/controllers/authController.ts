import { Request, Response } from 'express'
import { userService } from '../services/userService'

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body || {}
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email e password são obrigatórios' })
      }
      const user = await userService.createUser({ name, email, password })
      res.status(201).json(user)
    } catch (e: any) {
      const message = e?.message || 'Erro ao registrar usuário'
      const status = message === 'Email already in use' || message === 'Missing required fields' ? 400 : 500
      res.status(status).json({ error: message })
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body || {}
      if (!email || !password) {
        console.warn('Login falhou: email ou password vazio', { email: !!email, password: !!password })
        return res.status(400).json({ error: 'email e password são obrigatórios' })
      }
      console.log('Login attempt for:', email)
      const user = await userService.authenticate(email, password)
      console.log('Login bem-sucedido para:', email)
      res.json(user)
    } catch (e: any) {
      const message = e?.message || 'Erro ao autenticar'
      console.error('Login error:', { email: req.body?.email, message, stack: e?.stack })
      res.status(message === 'Invalid credentials' ? 401 : 500).json({ error: message })
    }
  }
}

export default authController


