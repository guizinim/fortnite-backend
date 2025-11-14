import { Request, Response } from 'express'
import { userService } from '../services/userService'

export const userController = {
  async create(req: Request, res: Response) {
    try {
      const user = await userService.createUser(req.body)
      res.status(201).json(user)
    } catch (e: any) {
      const message = e?.message || 'Failed to create user'
      const status = message === 'Email already in use' || message === 'Missing required fields' ? 400 : 500
      res.status(status).json({ error: message })
    }
  },

  async list(_req: Request, res: Response) {
    try {
      const users = await userService.listUsers()
      res.json(users)
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to list users' })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id
      const user = await userService.updateUser(id, req.body)
      res.json(user)
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to update user' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const id = req.params.id
      await userService.deleteUser(id)
      res.status(204).send()
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete user' })
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const id = req.params.id
      const { newPassword } = req.body || {}
      if (!newPassword) return res.status(400).json({ error: 'newPassword required' })
      await userService.resetPassword(id, newPassword)
      res.status(204).send()
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to reset password' })
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const { userId, currentPassword, newPassword } = req.body || {}
      if (!userId || !currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields: userId, currentPassword, newPassword required' })
      await userService.changePassword(String(userId), currentPassword, newPassword)
      res.status(204).send()
    } catch (e: any) {
      const msg = e?.message || 'Failed to change password'
      res.status(msg === 'Invalid current password' ? 400 : 500).json({ error: msg })
    }
  },

  async get(req: Request, res: Response) {
    try {
      const id = req.params.id
      const user = await userService.getById(id)
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json(user)
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to get user' })
    }
  },

  async publicList(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
      const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20))
      const data = await userService.listPublicUsers(page, pageSize)
      res.json({
        page,
        pageSize,
        total: data.total,
        users: data.users
      })
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to list public users' })
    }
  },

  async publicProfile(req: Request, res: Response) {
    try {
      const id = req.params.id
      const user = await userService.getPublicProfile(id)
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json(user)
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to get public profile' })
    }
  }
}

export default userController
