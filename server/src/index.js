require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')

const projectRoutes = require('./routes/projects')
const phaseRoutes = require('./routes/phases')
const settingsRoutes = require('./routes/settings')
const scenarioRoutes = require('./routes/scenarios')

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet({ contentSecurityPolicy: false }))
app.use(compression())
app.use(morgan('dev'))
const allowedOrigin = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}))
app.use(express.json({ limit: '5mb' }))

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/projects', projectRoutes)
app.use('/api/phases', phaseRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/scenarios', scenarioRoutes)

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`Server running on :${PORT}`))
module.exports = app
