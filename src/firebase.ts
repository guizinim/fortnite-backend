import admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '..', 'banco-users-firebase-adminsdk-fbsvc-7ef36fcf4c.json')

let credential: admin.credential.Credential
if (serviceAccountEnv) {
  const parsed = JSON.parse(serviceAccountEnv)
  credential = admin.credential.cert(parsed)
} else if (fs.existsSync(serviceAccountPath)) {
  const sa = require(serviceAccountPath)
  credential = admin.credential.cert(sa)
} else {
  credential = admin.credential.applicationDefault()
}

admin.initializeApp({ credential })

export const db = admin.firestore()
