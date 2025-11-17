"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path_1.default.join(__dirname, '..', 'banco-users-firebase-adminsdk-fbsvc-7ef36fcf4c.json');
let credential;
if (serviceAccountEnv) {
    let parsed;
    let jsonStr = serviceAccountEnv;
    try {
        parsed = JSON.parse(jsonStr);
    }
    catch (err) {
        // try to be forgiving: remove comment lines (starting with # or //) and retry
        try {
            const lines = jsonStr.split(/\r?\n/);
            const filtered = lines.filter((l) => {
                const t = l.trim();
                return t && !t.startsWith('#') && !t.startsWith('//');
            });
            jsonStr = filtered.join('\n');
            parsed = JSON.parse(jsonStr);
        }
        catch (err2) {
            // don't print secrets — show helpful debug info only
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON from environment. length=%d, containsPrivateKey=%s', (jsonStr || '').length, /private_key/.test(jsonStr));
            throw err2;
        }
    }
    credential = firebase_admin_1.default.credential.cert(parsed);
}
else if (fs_1.default.existsSync(serviceAccountPath)) {
    const sa = require(serviceAccountPath);
    credential = firebase_admin_1.default.credential.cert(sa);
}
else {
    credential = firebase_admin_1.default.credential.applicationDefault();
}
firebase_admin_1.default.initializeApp({ credential });
exports.db = firebase_admin_1.default.firestore();
