import admin from 'firebase-admin'
import { db } from '../firebase'
import { mapFirestoreCosmetic, Cosmetic } from './cosmeticsService'
import { userService } from './userService'

type TimestampLike = FirebaseFirestore.Timestamp | Date | string | null | undefined

function toIso(value: TimestampLike): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof (value as any)?.toDate === 'function') return (value as any).toDate().toISOString()
  if (typeof value === 'string') return value
  return null
}

export type PurchaseItemInput = {
  cosmetico_nome: string
  preco: number
  fortniteId?: string | null
  rarity?: string | null
  type?: string | null
  image?: string | null
}

export type PurchaseInput = {
  items: PurchaseItemInput[]
  bundleId?: string | null
  bundleName?: string | null
  totalPrice?: number
}

export type PurchaseResult = {
  user: any
  cosmetics: Cosmetic[]
}

export type HistoryEntry = {
  id: string
  type: 'purchase' | 'refund'
  valor: number
  items: Array<{
    fortniteId?: string | null
    cosmetico_nome: string
    preco: number
  }>
  bundleId?: string | null
  bundleName?: string | null
  createdAt: string
  relatedCosmeticIds?: string[]
}

const MIN_VBUCKS = 0

export const inventoryService = {
  async purchase(userId: string, input: PurchaseInput): Promise<PurchaseResult> {
    if (!userId) throw new Error('userId obrigatório')
    const items = Array.isArray(input?.items) ? input.items.filter(Boolean) : []
    if (items.length === 0) throw new Error('Nenhum item informado para compra')

    const total = input.totalPrice ?? items.reduce((acc, cur) => acc + Number(cur.preco ?? 0), 0)
    if (!Number.isFinite(total) || total <= 0) throw new Error('Valor total inválido')

    const userRef = db.collection('users').doc(userId)
    const cosmeticsRef = userRef.collection('cosmeticosAdquiridos')
    const historyRef = userRef.collection('historico')

    const { cosmeticIds, newBalance, timestamp } = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef)
      if (!userDoc.exists) throw new Error('Usuário não encontrado')
      const userData = userDoc.data() || {}
      const currentVbucks = Number(userData.vbucks ?? 0)

      if (currentVbucks < total) throw new Error('Saldo insuficiente')

      const fortniteIds = items.map((i) => i.fortniteId).filter(Boolean) as string[]
      if (fortniteIds.length > 0) {
        const chunkSize = 10
        for (let i = 0; i < fortniteIds.length; i += chunkSize) {
          const chunk = fortniteIds.slice(i, i + chunkSize)
          const snapshot = await cosmeticsRef.where('fortniteId', 'in', chunk).where('status', '==', 'ativo').get()
          if (!snapshot.empty) {
            const owned = snapshot.docs.map((d) => d.data()?.cosmetico_nome || d.data()?.fortniteId)
            throw new Error(`Cosmético(s) já adquirido(s): ${owned.join(', ')}`)
          }
        }
      }

      const updatedBalance = currentVbucks - total
      if (updatedBalance < MIN_VBUCKS) throw new Error('Saldo insuficiente')
      transaction.update(userRef, { vbucks: updatedBalance })

      const createdIds: string[] = []
      const now = admin.firestore.FieldValue.serverTimestamp()
      for (const item of items) {
        const docRef = cosmeticsRef.doc()
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
        })
        createdIds.push(docRef.id)
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
      })

      return { cosmeticIds: createdIds, newBalance: updatedBalance, timestamp: now }
    })

    const cosmetics: Cosmetic[] = []
    for (const id of cosmeticIds) {
      const snap = await cosmeticsRef.doc(id).get()
      if (snap.exists) cosmetics.push(mapFirestoreCosmetic(snap.id, snap.data()!))
    }

    const user = await userService.getById(userId)
    if (user) (user as any).vbucks = newBalance

    return { user, cosmetics }
  },

  async refund(userId: string, cosmeticId: string): Promise<{ user: any; cosmetic: Cosmetic }> {
    if (!userId || !cosmeticId) throw new Error('Parâmetros inválidos')

    const userRef = db.collection('users').doc(userId)
    const cosmeticRef = userRef.collection('cosmeticosAdquiridos').doc(cosmeticId)
    const historyRef = userRef.collection('historico')

    const { newBalance } = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef)
      if (!userDoc.exists) throw new Error('Usuário não encontrado')

      const cosmeticDoc = await transaction.get(cosmeticRef)
      if (!cosmeticDoc.exists) throw new Error('Cosmético não encontrado')
      const data = cosmeticDoc.data() || {}
      if (data.status === 'devolvido') throw new Error('Cosmético já devolvido')

      const refundValue = Number(data.preco ?? 0)
      if (!Number.isFinite(refundValue) || refundValue <= 0) throw new Error('Valor inválido para devolução')

      const userData = userDoc.data() || {}
      const current = Number(userData.vbucks ?? 0)
      const updatedBalance = current + refundValue

      const now = admin.firestore.FieldValue.serverTimestamp()

      transaction.update(userRef, { vbucks: updatedBalance })
      transaction.update(cosmeticRef, {
        status: 'devolvido',
        devolvidoEm: now
      })

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
      })

      return { newBalance: updatedBalance }
    })

    const user = await userService.getById(userId)
    if (user) (user as any).vbucks = newBalance

    const updatedDoc = await cosmeticRef.get()
    const cosmetic = updatedDoc.exists ? mapFirestoreCosmetic(updatedDoc.id, updatedDoc.data()!) : null

    if (!cosmetic) throw new Error('Cosmético não encontrado após devolução')
    return { user, cosmetic }
  },

  async listOwned(userId: string): Promise<Cosmetic[]> {
    const ref = db.collection('users').doc(userId).collection('cosmeticosAdquiridos')
    const snap = await ref.orderBy('adquirioEm', 'desc').get()
    return snap.docs.map((doc) => mapFirestoreCosmetic(doc.id, doc.data()))
  },

  async getHistory(userId: string): Promise<HistoryEntry[]> {
    const ref = db.collection('users').doc(userId).collection('historico')
    const snap = await ref.orderBy('createdAt', 'desc').get()
    return snap.docs.map((doc) => {
      const data = doc.data() || {}
      return {
        id: doc.id,
        type: data.type,
        valor: data.valor,
        items: Array.isArray(data.items) ? data.items : [],
        bundleId: data.bundleId ?? null,
        bundleName: data.bundleName ?? null,
        createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
        relatedCosmeticIds: data.relatedCosmeticIds ?? []
      } as HistoryEntry
    })
  }
}

