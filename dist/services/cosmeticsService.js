"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosmeticsService = exports.mapFirestoreCosmetic = void 0;
const firebase_1 = require("../firebase");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
function toIso(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value.toDate === 'function')
        return value.toDate().toISOString();
    if (typeof value === 'string')
        return value;
    return null;
}
function firestoreToCosmetic(id, data) {
    return {
        id,
        cosmetico_nome: data.cosmetico_nome,
        preco: data.preco,
        adquirioEm: toIso(data.adquirioEm),
        devolvidoEm: toIso(data.devolvidoEm),
        status: data.status || 'ativo',
        fortniteId: data.fortniteId ?? null,
        rarity: data.rarity ?? null,
        type: data.type ?? null,
        image: data.image ?? null,
        bundleId: data.bundleId ?? null,
        bundleName: data.bundleName ?? null,
    };
}
exports.mapFirestoreCosmetic = firestoreToCosmetic;
exports.cosmeticsService = {
    async list(userId) {
        const ref = firebase_1.db.collection('users').doc(userId).collection('cosmeticosAdquiridos');
        const snap = await ref.orderBy('adquirioEm', 'desc').get();
        return snap.docs.map(doc => firestoreToCosmetic(doc.id, doc.data()));
    },
    async create(userId, input) {
        const ref = firebase_1.db.collection('users').doc(userId).collection('cosmeticosAdquiridos');
        const docRef = await ref.add({
            cosmetico_nome: input.cosmetico_nome,
            preco: input.preco,
            fortniteId: input.fortniteId ?? null,
            rarity: input.rarity ?? null,
            type: input.type ?? null,
            image: input.image ?? null,
            bundleId: input.bundleId ?? null,
            bundleName: input.bundleName ?? null,
            adquirioEm: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
            devolvidoEm: null,
            status: input.status || 'ativo'
        });
        const doc = await docRef.get();
        return firestoreToCosmetic(doc.id, doc.data());
    },
    async update(userId, cosmeticId, input) {
        const docRef = firebase_1.db.collection('users').doc(userId).collection('cosmeticosAdquiridos').doc(cosmeticId);
        await docRef.update({
            ...input,
            // Se estiver atualizando o status para devolvido, atualiza a data de devolução
            ...(input.status === 'devolvido'
                ? { devolvidoEm: firebase_admin_1.default.firestore.FieldValue.serverTimestamp() }
                : (input.status ? { devolvidoEm: null } : {}))
        });
        const doc = await docRef.get();
        if (!doc.exists)
            throw new Error('Cosmético não encontrado');
        return firestoreToCosmetic(doc.id, doc.data());
    },
    async remove(userId, cosmeticId) {
        const docRef = firebase_1.db.collection('users').doc(userId).collection('cosmeticosAdquiridos').doc(cosmeticId);
        await docRef.delete();
    },
    async getById(userId, cosmeticId) {
        const docRef = firebase_1.db.collection('users').doc(userId).collection('cosmeticosAdquiridos').doc(cosmeticId);
        const doc = await docRef.get();
        if (!doc.exists)
            return null;
        return firestoreToCosmetic(doc.id, doc.data());
    },
    async devolver(userId, cosmeticId) {
        return this.update(userId, cosmeticId, { status: 'devolvido' });
    }
};
exports.default = exports.cosmeticsService;
