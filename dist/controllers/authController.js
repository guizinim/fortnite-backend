"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const userService_1 = require("../services/userService");
exports.authController = {
    async register(req, res) {
        try {
            const { name, email, password } = req.body || {};
            if (!name || !email || !password) {
                return res.status(400).json({ error: 'name, email e password são obrigatórios' });
            }
            const user = await userService_1.userService.createUser({ name, email, password });
            res.status(201).json(user);
        }
        catch (e) {
            const message = e?.message || 'Erro ao registrar usuário';
            const status = message === 'Email already in use' || message === 'Missing required fields' ? 400 : 500;
            res.status(status).json({ error: message });
        }
    },
    async login(req, res) {
        try {
            const { email, password } = req.body || {};
            if (!email || !password) {
                return res.status(400).json({ error: 'email e password são obrigatórios' });
            }
            const user = await userService_1.userService.authenticate(email, password);
            res.json(user);
        }
        catch (e) {
            const message = e?.message || 'Erro ao autenticar';
            res.status(message === 'Invalid credentials' ? 401 : 500).json({ error: message });
        }
    }
};
exports.default = exports.authController;
