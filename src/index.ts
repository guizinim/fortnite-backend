import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { routes } from './routes/router'

dotenv.config()

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const PORT = process.env.PORT || 4000

app.use('/api', routes)

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${PORT}`)
})

