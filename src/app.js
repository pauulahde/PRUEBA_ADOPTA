require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const http     = require('http');

const apiRoutes  = require('./routes/api.routes');
const authRoutes = require('./routes/auth.routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const { iniciarWebSocket }       = require('./services/websocket.service');

const app = express();

/* ─── Middlewares globales ─────────────────────────────────── */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/* ─── Rutas ────────────────────────────────────────────────── */
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api',      apiRoutes);

/* ─── Manejo de errores ────────────────────────────────────── */
app.use(notFound);
app.use(errorHandler);

/* ─── Arranque del servidor ────────────────────────────────── */
const PORT   = parseInt(process.env.PORT) || 3000;
const server = http.createServer(app);

iniciarWebSocket(server);

server.listen(PORT, () => {
  console.log(`\n🚀 AdoptaSoft API corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws\n`);
});

module.exports = { app, server };
