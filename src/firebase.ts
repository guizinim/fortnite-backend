import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
const backendRoot = path.join(__dirname, '..')

const discoverServiceAccountFiles = () => {
	try {
		return fs
			.readdirSync(backendRoot)
			.filter((file) => /firebase-adminsdk.*\.json$/i.test(file))
			.map((file) => path.join(backendRoot, file))
	} catch {
		return []
	}
}

const pathCandidates = [
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
	...discoverServiceAccountFiles(),
].filter(Boolean) as string[]

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
} else {
	const resolvedPath = pathCandidates
		.map((candidate) => (path.isAbsolute(candidate) ? candidate : path.join(process.cwd(), candidate)))
		.find((candidate) => fs.existsSync(candidate))

	if (resolvedPath) {
		const sa = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'))
		credential = admin.credential.cert(sa)
	} else {
		try {
			credential = admin.credential.applicationDefault()
		} catch (err) {
			throw new Error(
				[
					'Firebase Admin: nenhuma credencial encontrada.',
					'Defina FIREBASE_SERVICE_ACCOUNT_JSON (conteúdo do arquivo) ou FIREBASE_SERVICE_ACCOUNT_PATH apontando para o .json.',
					'Também aceitamos GOOGLE_APPLICATION_CREDENTIALS. Última tentativa foi applicationDefault().',
				].join(' ')
			)
		}
	}
}

admin.initializeApp({ credential })

export const db = admin.firestore()
