"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../firebase");
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
function firestoreToUser(id, data) {
    if (!data)
        return null;
    const createdAt = toIso(data.created_at);
    return {
        id,
        name: data.name,
        email: data.email,
        senhaHash: data.senhaHash,
        vbucks: data.vbucks ?? 0,
        created_at: createdAt,
    };
}
function serializeCosmetic(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        ...data,
        adquirioEm: toIso(data.adquirioEm),
        devolvidoEm: toIso(data.devolvidoEm),
    };
}
function serializeHistory(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        ...data,
        createdAt: toIso(data.createdAt),
    };
}
async function buildUserWithCollections(docRef) {
    const doc = await docRef.get();
    if (!doc.exists)
        return null;
    const data = doc.data() || {};
    const user = firestoreToUser(doc.id, data);
    if (!user)
        return null;
    const cosmeticsSnap = await docRef.collection('cosmeticosAdquiridos').orderBy('adquirioEm', 'desc').get();
    const cosmetics = cosmeticsSnap.docs.map((c) => serializeCosmetic(c));
    const historySnap = await docRef.collection('historico').orderBy('createdAt', 'desc').get().catch(() => null);
    const historico = historySnap
        ? historySnap.docs.map((h) => serializeHistory(h))
        : [];
    const { senhaHash, ...safeUser } = user;
    return {
        ...safeUser,
        vbucks: data.vbucks ?? safeUser.vbucks ?? 0,
        cosmeticosAdquiridos: cosmetics,
        historico,
    };
}
exports.userService = {
    async createUser(input) {
        const name = input.name?.trim();
        const email = input.email?.toLowerCase().trim();
        const password = input.password;
        const vbucks = input.vbucks ?? 10000;
        if (!name || !email || !password) {
            throw new Error('Missing required fields');
        }
        const saltRounds = 10;
        const passwordHash = await new Promise((resolve, reject) => {
            bcrypt.hash(password, saltRounds, (err, h) => (err ? reject(err) : resolve(h)));
        });
        const usersRef = firebase_1.db.collection('users');
        const q = await usersRef.where('email', '==', email).limit(1).get();
        if (!q.empty)
            throw new Error('Email already in use');
        // Get next user ID from counter
        const counterRef = firebase_1.db.collection('counters').doc('users');
        const nextId = await firebase_1.db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const currentCount = (counterDoc.exists ? counterDoc.data()?.count : 0) || 0;
            const nextCount = currentCount + 1;
            transaction.set(counterRef, { count: nextCount }, { merge: true });
            return nextCount;
        });
        await usersRef.doc(nextId.toString()).set({
            name,
            email,
            senhaHash: passwordHash,
            vbucks,
            created_at: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        });
        return this.getById(nextId.toString());
    },
    async authenticate(email, password) {
        const normalized = email?.toLowerCase().trim();
        if (!normalized || !password)
            throw new Error('Missing credentials');
        const usersRef = firebase_1.db.collection('users');
        const snap = await usersRef.where('email', '==', normalized).limit(1).get();
        if (snap.empty)
            throw new Error('Invalid credentials');
        const doc = snap.docs[0];
        const data = doc.data() || {};
        const stored = data.senhaHash || data.password_hash;
        if (!stored)
            throw new Error('Invalid credentials');
        const ok = await new Promise((resolve, reject) => {
            bcrypt.compare(password, stored, (err, r) => (err ? reject(err) : resolve(r)));
        });
        if (!ok)
            throw new Error('Invalid credentials');
        return buildUserWithCollections(doc.ref);
    },
    async listUsers() {
        const snapshot = await firebase_1.db.collection('users').orderBy(firebase_admin_1.default.firestore.FieldPath.documentId()).get();
        return snapshot.docs
            .map((d) => firestoreToUser(d.id, d.data()))
            .filter(Boolean)
            .map((user) => {
            const { senhaHash, ...safe } = user;
            return safe;
        });
    },
    async listPublicUsers(page, pageSize) {
        const snapshot = await firebase_1.db.collection('users').orderBy(firebase_admin_1.default.firestore.FieldPath.documentId()).get();
        const users = snapshot.docs.map((d) => firestoreToUser(d.id, d.data())).filter(Boolean);
        const total = users.length;
        const start = (page - 1) * pageSize;
        const paginated = users.slice(start, start + pageSize).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            vbucks: u.vbucks,
            created_at: u.created_at ?? null
        }));
        return { total, users: paginated };
    },
    async getPublicProfile(id) {
        const docRef = firebase_1.db.collection('users').doc(id);
        return buildUserWithCollections(docRef);
    },
    async updateUser(id, data) {
        const docRef = firebase_1.db.collection('users').doc(id);
        const toUpdate = {};
        if (data.name)
            toUpdate.name = data.name.trim();
        if (data.email)
            toUpdate.email = data.email.toLowerCase().trim();
        if (typeof data.vbucks === 'number')
            toUpdate.vbucks = data.vbucks;
        if (Object.keys(toUpdate).length === 0)
            return this.getById(id);
        await docRef.update(toUpdate);
        return this.getById(id);
    },
    async deleteUser(id) {
        await firebase_1.db.collection('users').doc(id).delete();
    },
    async resetPassword(id, newPassword) {
        const hash = await new Promise((resolve, reject) => {
            bcrypt.hash(newPassword, 10, (err, h) => (err ? reject(err) : resolve(h)));
        });
        await firebase_1.db.collection('users').doc(id).update({ senhaHash: hash });
    },
    async changePassword(id, currentPassword, newPassword) {
        const doc = await firebase_1.db.collection('users').doc(id).get();
        if (!doc.exists)
            throw new Error('User not found');
        const data = doc.data() || {};
        const stored = data.senhaHash || data.password_hash || '';
        const ok = await new Promise((resolve, reject) => {
            bcrypt.compare(currentPassword, stored, (err, r) => (err ? reject(err) : resolve(r)));
        });
        if (!ok)
            throw new Error('Invalid current password');
        const hash = await new Promise((resolve, reject) => {
            bcrypt.hash(newPassword, 10, (err, h) => (err ? reject(err) : resolve(h)));
        });
        await firebase_1.db.collection('users').doc(id).update({ senhaHash: hash });
    },
    async getById(id) {
        const docRef = firebase_1.db.collection('users').doc(id);
        return buildUserWithCollections(docRef);
    },
};
