import * as bcrypt from 'bcryptjs'
import admin from 'firebase-admin'
import { db } from '../firebase'

type TimestampLike = FirebaseFirestore.Timestamp | Date | string | null | undefined

function toIso(value: TimestampLike): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof (value as any)?.toDate === 'function') return (value as any).toDate().toISOString()
  if (typeof value === 'string') return value
  return null
}

export type CreateUserInput = {
  name: string
  email: string
  password: string
  vbucks?: number
}

export type PublicUserProfile = {
  id: string
  name: string
  email: string
  vbucks: number
  created_at?: string | null
  cosmeticosAdquiridos?: Array<any>
  historico?: Array<any>
}

function firestoreToUser(id: string, data: FirebaseFirestore.DocumentData | undefined) {
  if (!data) return null
  const createdAt = toIso(data.created_at)
  return {
    id,
    name: data.name,
    email: data.email,
    senhaHash: data.senhaHash,
    vbucks: data.vbucks ?? 0,
    created_at: createdAt,
  }
}

function serializeCosmetic(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data() || {}
  return {
    id: doc.id,
    ...data,
    adquirioEm: toIso(data.adquirioEm),
    devolvidoEm: toIso(data.devolvidoEm),
  }
}

function serializeHistory(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data() || {}
  return {
    id: doc.id,
    ...data,
    createdAt: toIso(data.createdAt),
  }
}

async function buildUserWithCollections(docRef: FirebaseFirestore.DocumentReference) {
  const doc = await docRef.get()
  if (!doc.exists) return null
  const data = doc.data() || {}
  const user = firestoreToUser(doc.id, data)
  if (!user) return null

  const cosmeticsSnap = await docRef.collection('cosmeticosAdquiridos').orderBy('adquirioEm', 'desc').get()
  const cosmetics: Array<any> = cosmeticsSnap.docs.map((c) => serializeCosmetic(c))

  const historySnap = await docRef.collection('historico').orderBy('createdAt', 'desc').get().catch(() => null)
  const historico = historySnap
    ? historySnap.docs.map((h) => serializeHistory(h))
    : []

  const { senhaHash, ...safeUser } = user as any

  return {
    ...safeUser,
    vbucks: data.vbucks ?? safeUser.vbucks ?? 0,
    cosmeticosAdquiridos: cosmetics,
    historico,
  }
}

export const userService = {
  async createUser(input: CreateUserInput) {
    const name = input.name?.trim()
    const email = input.email?.toLowerCase().trim()
    const password = input.password
    const vbucks = input.vbucks ?? 10000

    if (!name || !email || !password) {
      throw new Error('Missing required fields')
    }

    const saltRounds = 10
    const passwordHash = await new Promise<string>((resolve, reject) => {
      bcrypt.hash(password, saltRounds, (err, h) => (err ? reject(err) : resolve(h)))
    })

    const usersRef = db.collection('users')
    const q = await usersRef.where('email', '==', email).limit(1).get()
    if (!q.empty) throw new Error('Email already in use')

    // Get next user ID from counter
    const counterRef = db.collection('counters').doc('users')
    const nextId = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef)
      const currentCount = (counterDoc.exists ? counterDoc.data()?.count : 0) || 0
      const nextCount = currentCount + 1
      
      transaction.set(counterRef, { count: nextCount }, { merge: true })
      return nextCount
    })

    await usersRef.doc(nextId.toString()).set({
      name,
      email,
      senhaHash: passwordHash,
      vbucks,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    })

    return this.getById(nextId.toString())
  },

  async authenticate(email: string, password: string) {
    const normalized = email?.toLowerCase().trim()
    if (!normalized || !password) throw new Error('Missing credentials')
    const usersRef = db.collection('users')
    const snap = await usersRef.where('email', '==', normalized).limit(1).get()
    if (snap.empty) throw new Error('Invalid credentials')
    const doc = snap.docs[0]
    const data = doc.data() || {}
    const stored = data.senhaHash || data.password_hash
    if (!stored) throw new Error('Invalid credentials')
    const ok = await new Promise<boolean>((resolve, reject) => {
      bcrypt.compare(password, stored, (err, r) => (err ? reject(err) : resolve(r)))
    })
    if (!ok) throw new Error('Invalid credentials')
    return buildUserWithCollections(doc.ref)
  },

  async listUsers() {
    const snapshot = await db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).get()
    return snapshot.docs
      .map((d) => firestoreToUser(d.id, d.data()))
      .filter(Boolean)
      .map((user: any) => {
        const { senhaHash, ...safe } = user
        return safe
      })
  },

  async listPublicUsers(page: number, pageSize: number) {
    const snapshot = await db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).get()
    const users = snapshot.docs.map((d) => firestoreToUser(d.id, d.data())).filter(Boolean) as PublicUserProfile[]
    const total = users.length
    const start = (page - 1) * pageSize
    const paginated = users.slice(start, start + pageSize).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      vbucks: u.vbucks,
      created_at: u.created_at ?? null
    }))
    return { total, users: paginated }
  },

  async getPublicProfile(id: string) {
    const docRef = db.collection('users').doc(id)
    return buildUserWithCollections(docRef)
  },

  async updateUser(id: string, data: { name?: string; email?: string; vbucks?: number }) {
    const docRef = db.collection('users').doc(id)
    const toUpdate: any = {}
    if (data.name) toUpdate.name = data.name.trim()
    if (data.email) toUpdate.email = data.email.toLowerCase().trim()
    if (typeof data.vbucks === 'number') toUpdate.vbucks = data.vbucks
    if (Object.keys(toUpdate).length === 0) return this.getById(id)
    await docRef.update(toUpdate)
    return this.getById(id)
  },

  async deleteUser(id: string) {
    await db.collection('users').doc(id).delete()
  },

  async resetPassword(id: string, newPassword: string) {
    const hash = await new Promise<string>((resolve, reject) => {
      bcrypt.hash(newPassword, 10, (err, h) => (err ? reject(err) : resolve(h)))
    })
    await db.collection('users').doc(id).update({ senhaHash: hash })
  },

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const doc = await db.collection('users').doc(id).get()
    if (!doc.exists) throw new Error('User not found')
    const data = doc.data() || {}
    const stored = data.senhaHash || data.password_hash || ''
    const ok = await new Promise<boolean>((resolve, reject) => {
      bcrypt.compare(currentPassword, stored, (err, r) => (err ? reject(err) : resolve(r)))
    })
    if (!ok) throw new Error('Invalid current password')
    const hash = await new Promise<string>((resolve, reject) => {
      bcrypt.hash(newPassword, 10, (err, h) => (err ? reject(err) : resolve(h)))
    })
    await db.collection('users').doc(id).update({ senhaHash: hash })
  },

  async getById(id: string) {
    const docRef = db.collection('users').doc(id)
    return buildUserWithCollections(docRef)
  },
}
