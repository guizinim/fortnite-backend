"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosmeticsController = void 0;
const cosmeticsService_1 = require("../services/cosmeticsService");
exports.cosmeticsController = {
    async list(req, res) {
        try {
            const userId = req.params.userId;
            const items = await cosmeticsService_1.cosmeticsService.list(userId);
            res.json(items);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao listar cosméticos' });
        }
    },
    async getById(req, res) {
        try {
            const { userId, cosmeticId } = req.params;
            const item = await cosmeticsService_1.cosmeticsService.getById(userId, cosmeticId);
            if (!item) {
                return res.status(404).json({ error: 'Cosmético não encontrado' });
            }
            res.json(item);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao buscar cosmético' });
        }
    },
    async create(req, res) {
        try {
            const userId = req.params.userId;
            const { cosmetico_nome, preco, status } = req.body || {};
            if (!cosmetico_nome || typeof preco !== 'number') {
                return res.status(400).json({ error: 'cosmetico_nome e preco são obrigatórios' });
            }
            const item = await cosmeticsService_1.cosmeticsService.create(userId, { cosmetico_nome, preco, status });
            res.status(201).json(item);
        }
        catch (e) {
            res.status(500).json({ error: 'Failed to create cosmetic' });
        }
    },
    async update(req, res) {
        try {
            const userId = req.params.userId;
            const cosmeticId = req.params.cosmeticId;
            const payload = req.body || {};
            const item = await cosmeticsService_1.cosmeticsService.update(userId, cosmeticId, payload);
            res.json(item);
        }
        catch (e) {
            res.status(500).json({ error: 'Failed to update cosmetic' });
        }
    },
    async remove(req, res) {
        try {
            const userId = req.params.userId;
            const cosmeticId = req.params.cosmeticId;
            await cosmeticsService_1.cosmeticsService.remove(userId, cosmeticId);
            res.status(204).send();
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao remover cosmético' });
        }
    },
    async devolver(req, res) {
        try {
            const { userId, cosmeticId } = req.params;
            const item = await cosmeticsService_1.cosmeticsService.devolver(userId, cosmeticId);
            res.json(item);
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao devolver cosmético' });
        }
    }
};
exports.default = exports.cosmeticsController;
