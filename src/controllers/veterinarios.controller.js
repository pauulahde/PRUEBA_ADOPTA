const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

/* ─── GET /api/veterinarios ───────────────────────────────── */
const listar = async (req, res, next) => {
  try {
    const { especialidad } = req.query;
    const params = [];
    let extra = '';
    if (especialidad) { extra = 'WHERE v.especialidad ILIKE $1'; params.push(`%${especialidad}%`); }

    const { rows } = await db.query(
      `SELECT v.id_veterinario, v.especialidad, v.clinica,
              v.horario_disponible, v.calificacion,
              u.nombre, u.correo, u.telefono
       FROM VETERINARIO v
       JOIN USUARIO u ON u.id_usuario = v.id_usuario
       ${extra}
       ORDER BY v.calificacion DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/veterinarios/:id ───────────────────────────── */
const obtener = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT v.*, u.nombre, u.correo, u.telefono
       FROM VETERINARIO v JOIN USUARIO u ON u.id_usuario = v.id_usuario
       WHERE v.id_veterinario = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Veterinario no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/veterinarios ──────────────────────────────── */
const crear = async (req, res, next) => {
  try {
    const { especialidad, clinica, horario_disponible } = req.body;
    const id = uuidv4();

    // Verificar que no exista ya un perfil de veterinario para este usuario
    const existe = await db.query(
      `SELECT id_veterinario FROM VETERINARIO WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );
    if (existe.rows[0]) return res.status(409).json({ error: 'Ya tienes un perfil de veterinario.' });

    const { rows } = await db.query(
      `INSERT INTO VETERINARIO (id_veterinario, id_usuario, especialidad, clinica, horario_disponible)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [id, req.user.id_usuario, especialidad||null, clinica||null,
       horario_disponible ? JSON.stringify(horario_disponible) : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /api/veterinarios/:id ─────────────────────────── */
const actualizar = async (req, res, next) => {
  try {
    const { especialidad, clinica, horario_disponible } = req.body;
    const { rows } = await db.query(
      `UPDATE VETERINARIO
       SET especialidad        = COALESCE($1, especialidad),
           clinica             = COALESCE($2, clinica),
           horario_disponible  = COALESCE($3, horario_disponible)
       WHERE id_veterinario = $4 AND id_usuario = $5
       RETURNING *`,
      [especialidad||null, clinica||null,
       horario_disponible ? JSON.stringify(horario_disponible) : null,
       req.params.id, req.user.id_usuario]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Perfil no encontrado o sin permisos.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/veterinarios/:id/disponibilidad ────────────── */
const disponibilidad = async (req, res, next) => {
  try {
    const { fecha } = req.query; // YYYY-MM-DD
    if (!fecha) return res.status(400).json({ error: 'Parámetro "fecha" requerido.' });

    // Citas ya agendadas en esa fecha
    const { rows } = await db.query(
      `SELECT fecha_hora FROM CITA
       WHERE id_veterinario = $1
         AND estado IN ('pendiente','confirmada')
         AND fecha_hora::DATE = $2::DATE`,
      [req.params.id, fecha]
    );
    const ocupadas = rows.map(r => r.fecha_hora);
    res.json({ fecha, citas_ocupadas: ocupadas });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, obtener, crear, actualizar, disponibilidad };
