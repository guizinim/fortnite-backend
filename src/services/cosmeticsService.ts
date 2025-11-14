import { db } from '../firebase'
import admin from 'firebase-admin'

function toIso(value: any): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value === 'string') return value
  return null
}

export type CosmeticInput = {
  cosmetico_nome: string
  preco: number
  status?: 'ativo' | 'devolvido'
  fortniteId?: string | null
  rarity?: string | null
  type?: string | null
  image?: string | null
  bundleId?: string | null
  bundleName?: string | null
}

export type Cosmetic = {
  id: string
  cosmetico_nome: string
  preco: number
  adquirioEm: string | null
  devolvidoEm?: string | null
  status: 'ativo' | 'devolvido'
  fortniteId?: string | null
  rarity?: string | null
  type?: string | null
  image?: string | null
  bundleId?: string | null
  bundleName?: string | null
}

function firestoreToCosmetic(id: string, data: FirebaseFirestore.DocumentData): Cosmetic {
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
  }
}

export const mapFirestoreCosmetic = firestoreToCosmetic

export const cosmeticsService = {
  async list(userId: string): Promise<Cosmetic[]> {
    const ref = db.collection('users').doc(userId).collection('cosmeticosAdquiridos')
    const snap = await ref.orderBy('adquirioEm', 'desc').get()
    return snap.docs.map(doc => firestoreToCosmetic(doc.id, doc.data()))
  },

  async create(userId: string, input: CosmeticInput): Promise<Cosmetic> {
    const ref = db.collection('users').doc(userId).collection('cosmeticosAdquiridos')
    const docRef = await ref.add({
      cosmetico_nome: input.cosmetico_nome,
      preco: input.preco,
      fortniteId: input.fortniteId ?? null,
      rarity: input.rarity ?? null,
      type: input.type ?? null,
      image: input.image ?? null,
      bundleId: input.bundleId ?? null,
      bundleName: input.bundleName ?? null,
      adquirioEm: admin.firestore.FieldValue.serverTimestamp(),
      devolvidoEm: null,
      status: input.status || 'ativo'
    })

    const doc = await docRef.get()
    return firestoreToCosmetic(doc.id, doc.data()!)
  },

  async update(userId: string, cosmeticId: string, input: Partial<CosmeticInput>): Promise<Cosmetic> {
    const docRef = db.collection('users').doc(userId).collection('cosmeticosAdquiridos').doc(cosmeticId)
    await docRef.update({
      ...input,
      // Se estiver atualizando o status para devolvido, atualiza a data de devolução
      ...(input.status === 'devolvido'
        ? { devolvidoEm: admin.firestore.FieldValue.serverTimestamp() }
        : (input.status ? { devolvidoEm: null } : {})
      )
    })
    
    const doc = await docRef.get()
    if (!doc.exists) throw new Error('Cosmético não encontrado')
    return firestoreToCosmetic(doc.id, doc.data()!)
  },

  async remove(userId: string, cosmeticId: string): Promise<void> {
    const docRef = db.collection('users').doc(userId).collection('cosmeticosAdquiridos').doc(cosmeticId)
    await docRef.delete()
  },

  async getById(userId: string, cosmeticId: string): Promise<Cosmetic | null> {
    const docRef = db.collection('users').doc(userId).collection('cosmeticosAdquiridos').doc(cosmeticId)
    const doc = await docRef.get()
    
    if (!doc.exists) return null
    return firestoreToCosmetic(doc.id, doc.data()!)
  },

  async devolver(userId: string, cosmeticId: string): Promise<Cosmetic> {
    return this.update(userId, cosmeticId, { status: 'devolvido' })
  }
}

export default cosmeticsService
