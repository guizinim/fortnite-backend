import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { routes } from './routes/router'

dotenv.config()

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/api', routes)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Export for Vercel serverless
export default app

// Local development: listen on port
const PORT = process.env.PORT || 4000
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${PORT}`)
  })
}

