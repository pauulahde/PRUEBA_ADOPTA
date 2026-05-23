const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const notifService = require('../services/notificacion.service');

/* ─── GET /api/historial/:id_mascota ──────────────────────── */
const listar = async (req, res, next) => {
  try {
    const { tipo } = req.query;
    const params = [req.params.id_mascota];
    let extra = '';
    if (tipo) { extra = ' AND h.tipo = $2'; params.push(tipo); }

    const { rows } = await db.query(
      `SELECT h.*, u.nombre AS veterinario_nombre
       FROM HISTORIAL_MEDICO h
       JOIN VETERINARIO v ON v.id_veterinario = h.id_veterinario
       JOIN USUARIO u ON u.id_usuario = v.id_usuario
       WHERE h.id_mascota = $1 ${extra}
       ORDER BY h.fecha DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/historial ─────────────────────────────────── */
const registrar = async (req, res, next) => {
  try {
    const { id_mascota, id_cita, tipo, descripcion, medicamento } = req.body;

    // Obtener id_veterinario del usuario autenticado
    const vet = await db.query(
      `SELECT id_veterinario FROM VETERINARIO WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );
    if (!vet.rows[0]) return res.status(403).json({ error: 'Solo veterinarios pueden registrar historial.' });

    const id = uuidv4();
    const { rows } = await db.query(
      `INSERT INTO HISTORIAL_MEDICO
         (id_historial, id_mascota, id_veterinario, id_cita, tipo, descripcion, medicamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [id, id_mascota, vet.rows[0].id_veterinario, id_cita||null, tipo, descripcion, medicamento||null]
    );

    // Notificar al dueño
    const mascota = await db.query(
      `SELECT id_usuario, nombre FROM MASCOTA WHERE id_mascota = $1`, [id_mascota]
    );
    if (mascota.rows[0]) {
      await notifService.crear({
        id_usuario: mascota.rows[0].id_usuario,
        tipo: 'mensaje_nuevo',
        mensaje: `Se registró un nuevo ${tipo} para ${mascota.rows[0].nombre}.`,
      });
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── DELETE /api/historial/:id ───────────────────────────── */
const eliminar = async (req, res, next) => {
  try {
    const vet = await db.query(
      `SELECT id_veterinario FROM VETERINARIO WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );
    const { rowCount } = await db.query(
      `DELETE FROM HISTORIAL_MEDICO
       WHERE id_historial = $1 AND id_veterinario = $2`,
      [req.params.id, vet.rows[0]?.id_veterinario]
    );
    if (!rowCount) return res.status(404).json({ error: 'Registro no encontrado o sin permisos.' });
    res.json({ mensaje: 'Registro eliminado.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, registrar, eliminar };
