const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db       = require('../config/database');

/* ─── helpers ─────────────────────────────────────────────── */
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/* ─── POST /api/auth/registro ─────────────────────────────── */
const registro = async (req, res, next) => {
  try {
    const { nombre, correo, contrasena, telefono, rol = 'dueno' } = req.body;

    // Solo admin puede crear veterinarios o admins desde este endpoint
    if (['veterinario', 'admin'].includes(rol) && req.user?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo un administrador puede asignar ese rol.' });
    }

    const hash = await bcrypt.hash(contrasena, 12);
    const id   = uuidv4();

    const { rows } = await db.query(
      `INSERT INTO USUARIO (id_usuario, nombre, correo, contrasena_hash, telefono, rol)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id_usuario, nombre, correo, rol, fecha_registro`,
      [id, nombre, correo, hash, telefono || null, rol]
    );

    const usuario = rows[0];
    const token   = signToken({ id_usuario: usuario.id_usuario, correo: usuario.correo, rol: usuario.rol });

    res.status(201).json({ token, usuario });
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/auth/login ────────────────────────────────── */
const login = async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body;

    const { rows } = await db.query(
      `SELECT id_usuario, nombre, correo, contrasena_hash, rol
       FROM USUARIO WHERE correo = $1`,
      [correo]
    );

    const usuario = rows[0];
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const valido = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const token = signToken({ id_usuario: usuario.id_usuario, correo: usuario.correo, rol: usuario.rol });
    const { contrasena_hash, ...usuarioSafe } = usuario;

    res.json({ token, usuario: usuarioSafe });
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/auth/perfil ────────────────────────────────── */
const perfil = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id_usuario, nombre, correo, telefono, rol, fecha_registro
       FROM USUARIO WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /api/auth/perfil ──────────────────────────────── */
const actualizarPerfil = async (req, res, next) => {
  try {
    const { nombre, telefono } = req.body;
    const { rows } = await db.query(
      `UPDATE USUARIO
       SET nombre = COALESCE($1, nombre),
           telefono = COALESCE($2, telefono)
       WHERE id_usuario = $3
       RETURNING id_usuario, nombre, correo, telefono, rol`,
      [nombre || null, telefono || null, req.user.id_usuario]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { registro, login, perfil, actualizarPerfil };
