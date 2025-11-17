"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../firebase");
const cosmeticsService_1 = require("./cosmeticsService");
const userService_1 = require("./userService");
function toIso(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value?.toDate === 'function')
        return value.toDate().toISOString();
    if (typeof value === 'string')
        return value;
    return null;
}
const MIN_VBUCKS = 0;
exports.inventoryService = {
    async purchase(userId, input) {
        if (!userId)
            throw new Error('userId obrigatório');
        const items = Array.isArray(input?.items) ? input.items.filter(Boolean) : [];
        if (items.length === 0)
            throw new Error('Nenhum item informado para compra');
        const total = input.totalPrice ?? items.reduce((acc, cur) => acc + Number(cur.preco ?? 0), 0);
        if (!Number.isFinite(total) || total <= 0)
            throw new Error('Valor total inválido');
        const userRef = firebase_1.db.collection('users').doc(userId);
        const cosmeticsRef = userRef.collection('cosmeticosAdquiridos');
        const historyRef = userRef.collection('historico');
        const { cosmeticIds, newBalance, timestamp } = await firebase_1.db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists)
                throw new Error('Usuário não encontrado');
            const userData = userDoc.data() || {};
            const currentVbucks = Number(userData.vbucks ?? 0);
            if (currentVbucks < total)
                throw new Error('Saldo insuficiente');
            const fortniteIds = items.map((i) => i.fortniteId).filter(Boolean);
            if (fortniteIds.length > 0) {
                const chunkSize = 10;
                for (let i = 0; i < fortniteIds.length; i += chunkSize) {
                    const chunk = fortniteIds.slice(i, i + chunkSize);
                    const snapshot = await cosmeticsRef.where('fortniteId', 'in', chunk).where('status', '==', 'ativo').get();
                    if (!snapshot.empty) {
                        const owned = snapshot.docs.map((d) => d.data()?.cosmetico_nome || d.data()?.fortniteId);
                        throw new Error(`Cosmético(s) já adquirido(s): ${owned.join(', ')}`);
                    }
                }
            }
            const updatedBalance = currentVbucks - total;
            if (updatedBalance < MIN_VBUCKS)
                throw new Error('Saldo insuficiente');
            transaction.update(userRef, { vbucks: updatedBalance });
            const createdIds = [];
            const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
            for (const item of items) {
                const docRef = cosmeticsRef.doc();
                transaction.set(docRef, {
                    cosmetico_nome: item.cosmetico_nome,
                    preco: item.preco,
                    fortniteId: item.fortniteId ?? null,
                    rarity: item.rarity ?? null,
                    type: item.type ?? null,
                    image: item.image ?? null,
                    bundleId: input.bundleId ?? null,
                    bundleName: input.bundleName ?? null,
                    adquirioEm: now,
                    devolvidoEm: null,
                    status: 'ativo'
                });
                createdIds.push(docRef.id);
            }
            transaction.set(historyRef.doc(), {
                type: 'purchase',
                valor: total,
                items: items.map((i) => ({
                    fortniteId: i.fortniteId ?? null,
                    cosmetico_nome: i.cosmetico_nome,
                    preco: i.preco
                })),
                bundleId: input.bundleId ?? null,
                bundleName: input.bundleName ?? null,
                createdAt: now,
                relatedCosmeticIds: createdIds
            });
            return { cosmeticIds: createdIds, newBalance: updatedBalance, timestamp: now };
        });
        const cosmetics = [];
        for (const id of cosmeticIds) {
            const snap = await cosmeticsRef.doc(id).get();
            if (snap.exists)
                cosmetics.push((0, cosmeticsService_1.mapFirestoreCosmetic)(snap.id, snap.data()));
        }
        const user = await userService_1.userService.getById(userId);
        if (user)
            user.vbucks = newBalance;
        return { user, cosmetics };
    },
    async refund(userId, cosmeticId) {
        if (!userId || !cosmeticId)
            throw new Error('Parâmetros inválidos');
        const userRef = firebase_1.db.collection('users').doc(userId);
        const cosmeticRef = userRef.collection('cosmeticosAdquiridos').doc(cosmeticId);
        const historyRef = userRef.collection('historico');
        const { newBalance } = await firebase_1.db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists)
                throw new Error('Usuário não encontrado');
            const cosmeticDoc = await transaction.get(cosmeticRef);
            if (!cosmeticDoc.exists)
                throw new Error('Cosmético não encontrado');
            const data = cosmeticDoc.data() || {};
            if (data.status === 'devolvido')
                throw new Error('Cosmético já devolvido');
            const refundValue = Number(data.preco ?? 0);
            if (!Number.isFinite(refundValue) || refundValue <= 0)
                throw new Error('Valor inválido para devolução');
            const userData = userDoc.data() || {};
            const current = Number(userData.vbucks ?? 0);
            const updatedBalance = current + refundValue;
            const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
            transaction.update(userRef, { vbucks: updatedBalance });
            transaction.update(cosmeticRef, {
                status: 'devolvido',
                devolvidoEm: now
            });
            transaction.set(historyRef.doc(), {
                type: 'refund',
                valor: refundValue,
                items: [{
                        fortniteId: data.fortniteId ?? null,
                        cosmetico_nome: data.cosmetico_nome,
                        preco: refundValue
                    }],
                bundleId: data.bundleId ?? null,
                bundleName: data.bundleName ?? null,
                createdAt: now,
                relatedCosmeticIds: [cosmeticId]
            });
            return { newBalance: updatedBalance };
        });
        const user = await userService_1.userService.getById(userId);
        if (user)
            user.vbucks = newBalance;
        const updatedDoc = await cosmeticRef.get();
        const cosmetic = updatedDoc.exists ? (0, cosmeticsService_1.mapFirestoreCosmetic)(updatedDoc.id, updatedDoc.data()) : null;
        if (!cosmetic)
            throw new Error('Cosmético não encontrado após devolução');
        return { user, cosmetic };
    },
    async listOwned(userId) {
        const ref = firebase_1.db.collection('users').doc(userId).collection('cosmeticosAdquiridos');
        const snap = await ref.orderBy('adquirioEm', 'desc').get();
        return snap.docs.map((doc) => (0, cosmeticsService_1.mapFirestoreCosmetic)(doc.id, doc.data()));
    },
    async getHistory(userId) {
        const ref = firebase_1.db.collection('users').doc(userId).collection('historico');
        const snap = await ref.orderBy('createdAt', 'desc').get();
        return snap.docs.map((doc) => {
            const data = doc.data() || {};
            return {
                id: doc.id,
                type: data.type,
                valor: data.valor,
                items: Array.isArray(data.items) ? data.items : [],
                bundleId: data.bundleId ?? null,
                bundleName: data.bundleName ?? null,
                createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
                relatedCosmeticIds: data.relatedCosmeticIds ?? []
            };
        });
    }
};
