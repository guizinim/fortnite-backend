import { Request, Response } from 'express'
import { cosmeticsService } from '../services/cosmeticsService'

export const cosmeticsController = {
  async list(req: Request, res: Response) {
    try {
      const userId = req.params.userId
      const items = await cosmeticsService.list(userId)
      res.json(items)
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao listar cosméticos' })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { userId, cosmeticId } = req.params
      const item = await cosmeticsService.getById(userId, cosmeticId)
      if (!item) {
        return res.status(404).json({ error: 'Cosmético não encontrado' })
      }
      res.json(item)
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao buscar cosmético' })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = req.params.userId
      const { cosmetico_nome, preco, status } = req.body || {}
      if (!cosmetico_nome || typeof preco !== 'number') {
        return res.status(400).json({ error: 'cosmetico_nome e preco são obrigatórios' })
      }
      const item = await cosmeticsService.create(userId, { cosmetico_nome, preco, status })
      res.status(201).json(item)
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to create cosmetic' })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = req.params.userId
      const cosmeticId = req.params.cosmeticId
      const payload = req.body || {}
      const item = await cosmeticsService.update(userId, cosmeticId, payload)
      res.json(item)
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to update cosmetic' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const userId = req.params.userId
      const cosmeticId = req.params.cosmeticId
      await cosmeticsService.remove(userId, cosmeticId)
      res.status(204).send()
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao remover cosmético' })
    }
  },

  async devolver(req: Request, res: Response) {
    try {
      const { userId, cosmeticId } = req.params
      const item = await cosmeticsService.devolver(userId, cosmeticId)
      res.json(item)
    } catch (e: any) {
      res.status(500).json({ error: 'Erro ao devolver cosmético' })
    }
  }
}

export default cosmeticsController
