const { v4: uuidv4 } = require('uuid');
const db     = require('../config/database');
const { bucket } = require('../config/firebase');

/* ─── GET /api/mascotas ───────────────────────────────────── */
const listar = async (req, res, next) => {
  try {
    // Dueños solo ven sus mascotas; vets y admins pueden filtrar por usuario
    const idUsuario = req.user.rol === 'dueno'
      ? req.user.id_usuario
      : (req.query.id_usuario || null);

    const { rows } = await db.query(
      `SELECT * FROM MASCOTA
       WHERE ($1::UUID IS NULL OR id_usuario = $1)
         AND estado != 'inactivo'
       ORDER BY nombre`,
      [idUsuario]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/mascotas/:id ───────────────────────────────── */
const obtener = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM MASCOTA WHERE id_mascota = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Mascota no encontrada.' });

    // Dueño solo puede ver sus propias mascotas
    if (req.user.rol === 'dueno' && rows[0].id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ error: 'No tienes acceso a esta mascota.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/mascotas ──────────────────────────────────── */
const crear = async (req, res, next) => {
  try {
    const { nombre, especie, raza, edad_meses, peso_kg, sexo } = req.body;
    const id        = uuidv4();
    const idUsuario = req.user.id_usuario;
    let foto_url    = null;

    // Si viene una imagen, subirla a Firebase Storage
    if (req.file) {
      const fileName  = `mascotas/${id}/${Date.now()}_${req.file.originalname}`;
      const fileRef   = bucket.file(fileName);
      await fileRef.save(req.file.buffer, { contentType: req.file.mimetype });
      await fileRef.makePublic();
      foto_url = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${fileName}`;
    }

    const { rows } = await db.query(
      `INSERT INTO MASCOTA
         (id_mascota, id_usuario, nombre, especie, raza, edad_meses, peso_kg, sexo, foto_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id, idUsuario, nombre, especie, raza || null, edad_meses || null,
       peso_kg || null, sexo || null, foto_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /api/mascotas/:id ─────────────────────────────── */
const actualizar = async (req, res, next) => {
  try {
    const { nombre, raza, edad_meses, peso_kg, sexo, estado } = req.body;

    // Verificar propiedad
    const check = await db.query(
      `SELECT id_usuario FROM MASCOTA WHERE id_mascota = $1`, [req.params.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Mascota no encontrada.' });
    if (req.user.rol === 'dueno' && check.rows[0].id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ error: 'No puedes modificar esta mascota.' });
    }

    let foto_url = null;
    if (req.file) {
      const fileName = `mascotas/${req.params.id}/${Date.now()}_${req.file.originalname}`;
      const fileRef  = bucket.file(fileName);
      await fileRef.save(req.file.buffer, { contentType: req.file.mimetype });
      await fileRef.makePublic();
      foto_url = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${fileName}`;
    }

    const { rows } = await db.query(
      `UPDATE MASCOTA SET
         nombre     = COALESCE($1, nombre),
         raza       = COALESCE($2, raza),
         edad_meses = COALESCE($3, edad_meses),
         peso_kg    = COALESCE($4, peso_kg),
         sexo       = COALESCE($5, sexo),
         estado     = COALESCE($6, estado),
         foto_url   = COALESCE($7, foto_url)
       WHERE id_mascota = $8
       RETURNING *`,
      [nombre||null, raza||null, edad_meses||null, peso_kg||null,
       sexo||null, estado||null, foto_url, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── DELETE /api/mascotas/:id ────────────────────────────── */
const eliminar = async (req, res, next) => {
  try {
    const check = await db.query(
      `SELECT id_usuario FROM MASCOTA WHERE id_mascota = $1`, [req.params.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Mascota no encontrada.' });
    if (req.user.rol === 'dueno' && check.rows[0].id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ error: 'No puedes eliminar esta mascota.' });
    }

    // Soft delete
    await db.query(
      `UPDATE MASCOTA SET estado = 'inactivo' WHERE id_mascota = $1`,
      [req.params.id]
    );
    res.json({ mensaje: 'Mascota eliminada correctamente.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
