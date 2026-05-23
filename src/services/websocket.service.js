const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// Mapa de clientes activos: id_usuario → WebSocket
const clientes = new Map();

/**
 * Inicializa el servidor WebSocket adjunto al servidor HTTP.
 * @param {http.Server} server
 */
const iniciarWebSocket = (server) => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    // Autenticación por query param: ws://host/ws?token=JWT
    const url    = new URL(req.url, `http://${req.headers.host}`);
    const token  = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Token requerido.');
      return;
    }

    let usuario;
    try {
      usuario = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, 'Token inválido.');
      return;
    }

    ws.id_usuario = usuario.id_usuario;
    clientes.set(usuario.id_usuario, ws);
    console.log(`[WS] Conectado: ${usuario.id_usuario}`);

    ws.on('message', async (data) => {
      try {
        const { id_receptor, contenido } = JSON.parse(data.toString());
        if (!id_receptor || !contenido?.trim()) return;

        // Guardar mensaje en BD
        const id = uuidv4();
        await db.query(
          `INSERT INTO CHAT_MENSAJE (id_mensaje, id_emisor, id_receptor, contenido)
           VALUES ($1,$2,$3,$4)`,
          [id, usuario.id_usuario, id_receptor, contenido.trim()]
        );

        const mensaje = {
          id_mensaje: id,
          id_emisor:  usuario.id_usuario,
          id_receptor,
          contenido:  contenido.trim(),
          fecha_envio: new Date().toISOString(),
        };

        // Enviar al receptor si está conectado
        const wsReceptor = clientes.get(id_receptor);
        if (wsReceptor?.readyState === 1) {
          wsReceptor.send(JSON.stringify(mensaje));
        }

        // Confirmar al emisor
        ws.send(JSON.stringify({ ...mensaje, enviado: true }));
      } catch (err) {
        console.error('[WS] Error procesando mensaje:', err.message);
      }
    });

    ws.on('close', () => {
      clientes.delete(usuario.id_usuario);
      console.log(`[WS] Desconectado: ${usuario.id_usuario}`);
    });
  });

  console.log('[WS] Servidor WebSocket iniciado en /ws');
  return wss;
};

module.exports = { iniciarWebSocket };
