import admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '..', 'banco-users-firebase-adminsdk-fbsvc-7ef36fcf4c.json')

let credential: admin.credential.Credential
if (serviceAccountEnv) {
  let parsed: any
  let jsonStr = serviceAccountEnv
  try {
    parsed = JSON.parse(jsonStr)
  } catch (err) {
    // try to be forgiving: remove comment lines (starting with # or //) and retry
    try {
      const lines = jsonStr.split(/\r?\n/)
      const filtered = lines.filter((l) => {
        const t = l.trim()
        return t && !t.startsWith('#') && !t.startsWith('//')
      })
      jsonStr = filtered.join('\n')
      parsed = JSON.parse(jsonStr)
    } catch (err2) {
      // don't print secrets — show helpful debug info only
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON from environment. length=%d, containsPrivateKey=%s',
        (jsonStr || '').length,
        /private_key/.test(jsonStr))
      throw err2
    }
  }
  credential = admin.credential.cert(parsed)
} else if (fs.existsSync(serviceAccountPath)) {
  const sa = require(serviceAccountPath)
  credential = admin.credential.cert(sa)
} else {
  credential = admin.credential.applicationDefault()
}

admin.initializeApp({ credential })

export const db = admin.firestore()
