const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const notifService = require('../services/notificacion.service');

/* ─── GET /api/citas ──────────────────────────────────────── */
const listar = async (req, res, next) => {
  try {
    const { estado, desde, hasta } = req.query;
    let where = [];
    let params = [];
    let idx = 1;

    // Filtro por rol
    if (req.user.rol === 'dueno') {
      where.push(`c.id_usuario = $${idx++}`);
      params.push(req.user.id_usuario);
    } else if (req.user.rol === 'veterinario') {
      // Obtener id_veterinario del usuario autenticado
      const vet = await db.query(
        `SELECT id_veterinario FROM VETERINARIO WHERE id_usuario = $1`,
        [req.user.id_usuario]
      );
      if (!vet.rows[0]) return res.status(403).json({ error: 'Perfil de veterinario no encontrado.' });
      where.push(`c.id_veterinario = $${idx++}`);
      params.push(vet.rows[0].id_veterinario);
    }

    if (estado) { where.push(`c.estado = $${idx++}`); params.push(estado); }
    if (desde)  { where.push(`c.fecha_hora >= $${idx++}`); params.push(desde); }
    if (hasta)  { where.push(`c.fecha_hora <= $${idx++}`); params.push(hasta); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const { rows } = await db.query(
      `SELECT c.*,
              m.nombre   AS mascota_nombre, m.especie,
              u.nombre   AS dueno_nombre,
              v.id_veterinario,
              uv.nombre  AS veterinario_nombre
       FROM   CITA c
       JOIN   MASCOTA   m  ON m.id_mascota     = c.id_mascota
       JOIN   USUARIO   u  ON u.id_usuario     = c.id_usuario
       JOIN   VETERINARIO v ON v.id_veterinario = c.id_veterinario
       JOIN   USUARIO   uv ON uv.id_usuario    = v.id_usuario
       ${whereClause}
       ORDER BY c.fecha_hora DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/citas/:id ──────────────────────────────────── */
const obtener = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, m.nombre AS mascota_nombre, uv.nombre AS veterinario_nombre
       FROM CITA c
       JOIN MASCOTA m ON m.id_mascota = c.id_mascota
       JOIN VETERINARIO v ON v.id_veterinario = c.id_veterinario
       JOIN USUARIO uv ON uv.id_usuario = v.id_usuario
       WHERE c.id_cita = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cita no encontrada.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/citas ─────────────────────────────────────── */
const crear = async (req, res, next) => {
  try {
    const { id_mascota, id_veterinario, fecha_hora, notas } = req.body;
    const id_usuario = req.user.id_usuario;

    // Verificar que el veterinario exista
    const vet = await db.query(
      `SELECT v.id_veterinario, u.nombre, u.id_usuario AS vet_usuario_id
       FROM VETERINARIO v JOIN USUARIO u ON u.id_usuario = v.id_usuario
       WHERE v.id_veterinario = $1`,
      [id_veterinario]
    );
    if (!vet.rows[0]) return res.status(404).json({ error: 'Veterinario no encontrado.' });

    // Verificar disponibilidad: no debe haber otra cita confirmada en esa franja
    const conflicto = await db.query(
      `SELECT id_cita FROM CITA
       WHERE id_veterinario = $1
         AND estado IN ('pendiente','confirmada')
         AND fecha_hora BETWEEN ($2::TIMESTAMP - INTERVAL '29 minutes')
                            AND ($2::TIMESTAMP + INTERVAL '29 minutes')`,
      [id_veterinario, fecha_hora]
    );
    if (conflicto.rows.length > 0) {
      return res.status(409).json({ error: 'El veterinario no está disponible en ese horario.' });
    }

    const id = uuidv4();
    const { rows } = await db.query(
      `INSERT INTO CITA (id_cita, id_usuario, id_mascota, id_veterinario, fecha_hora, notas)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id, id_usuario, id_mascota, id_veterinario, fecha_hora, notas || null]
    );
    const cita = rows[0];

    // Notificar a ambas partes
    await notifService.crear({
      id_usuario,
      tipo: 'cita_recordatorio',
      mensaje: `Tu cita está agendada para ${new Date(fecha_hora).toLocaleString('es-CO')}.`,
    });
    await notifService.crear({
      id_usuario: vet.rows[0].vet_usuario_id,
      tipo: 'cita_recordatorio',
      mensaje: `Nueva cita agendada el ${new Date(fecha_hora).toLocaleString('es-CO')}.`,
    });

    res.status(201).json(cita);
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /api/citas/:id/estado ────────────────────────── */
const actualizarEstado = async (req, res, next) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['confirmada', 'cancelada', 'completada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Usa: ${estadosValidos.join(', ')}.` });
    }

    const check = await db.query(`SELECT * FROM CITA WHERE id_cita = $1`, [req.params.id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Cita no encontrada.' });

    const { rows } = await db.query(
      `UPDATE CITA SET estado = $1 WHERE id_cita = $2 RETURNING *`,
      [estado, req.params.id]
    );

    // Notificar al dueño del cambio de estado
    const tipo = estado === 'confirmada' ? 'cita_confirmada' : 'cita_cancelada';
    if (['confirmada', 'cancelada'].includes(estado)) {
      await notifService.crear({
        id_usuario: check.rows[0].id_usuario,
        tipo,
        mensaje: `Tu cita ha sido ${estado}.`,
      });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── DELETE /api/citas/:id ───────────────────────────────── */
const cancelar = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE CITA SET estado = 'cancelada' WHERE id_cita = $1
       AND id_usuario = $2
       RETURNING *`,
      [req.params.id, req.user.id_usuario]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cita no encontrada o no te pertenece.' });
    res.json({ mensaje: 'Cita cancelada.', cita: rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, obtener, crear, actualizarEstado, cancelar };
