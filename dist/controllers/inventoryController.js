"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryController = void 0;
const inventoryService_1 = require("../services/inventoryService");
exports.inventoryController = {
    async purchase(req, res) {
        try {
            const userId = req.params.userId;
            const payload = req.body || {};
            const result = await inventoryService_1.inventoryService.purchase(userId, payload);
            res.status(201).json(result);
        }
        catch (e) {
            const message = e?.message || 'Erro ao processar compra';
            const status = message === 'Saldo insuficiente' || message === 'Dados inválidos para compra'
                ? 400
                : message === 'Usuário não encontrado'
                    ? 404
                    : message?.startsWith?.('Cosmético(s) já adquirido(s)')
                        ? 409
                        : 500;
            res.status(status).json({ error: message });
        }
    },
    async list(req, res) {
        try {
            const userId = req.params.userId;
            const items = await inventoryService_1.inventoryService.listOwned(userId);
            res.json(items);
        }
        catch (e) {
            res.status(500).json({ error: e?.message || 'Erro ao listar inventário' });
        }
    },
    async history(req, res) {
        try {
            const userId = req.params.userId;
            const history = await inventoryService_1.inventoryService.getHistory(userId);
            res.json(history);
        }
        catch (e) {
            res.status(500).json({ error: e?.message || 'Erro ao listar histórico' });
        }
    },
    async refund(req, res) {
        try {
            const userId = req.params.userId;
            const cosmeticId = req.params.cosmeticId;
            const result = await inventoryService_1.inventoryService.refund(userId, cosmeticId);
            res.json(result);
        }
        catch (e) {
            const message = e?.message || 'Erro ao devolver cosmético';
            const status = message === 'Cosmético não encontrado'
                ? 404
                : message === 'Cosmético já devolvido'
                    ? 409
                    : message === 'Usuário não encontrado'
                        ? 404
                        : 500;
            res.status(status).json({ error: message });
        }
    }
};
exports.default = exports.inventoryController;
