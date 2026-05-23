const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

/**
 * Crea una notificación en la BD.
 * @param {{ id_usuario: string, tipo: string, mensaje: string }} data
 */
const crear = async ({ id_usuario, tipo, mensaje }) => {
  const id = uuidv4();
  await db.query(
    `INSERT INTO NOTIFICACION (id_notificacion, id_usuario, tipo, mensaje)
     VALUES ($1,$2,$3,$4)`,
    [id, id_usuario, tipo, mensaje]
  );
};

/**
 * Lista notificaciones de un usuario.
 * @param {string} id_usuario
 * @param {boolean} [soloNoLeidas=false]
 */
const listarPorUsuario = async (id_usuario, soloNoLeidas = false) => {
  const extra = soloNoLeidas ? 'AND leida = FALSE' : '';
  const { rows } = await db.query(
    `SELECT * FROM NOTIFICACION
     WHERE id_usuario = $1 ${extra}
     ORDER BY fecha_envio DESC`,
    [id_usuario]
  );
  return rows;
};

/**
 * Marca como leída una notificación.
 */
const marcarLeida = async (id_notificacion, id_usuario) => {
  const { rows } = await db.query(
    `UPDATE NOTIFICACION SET leida = TRUE
     WHERE id_notificacion = $1 AND id_usuario = $2
     RETURNING *`,
    [id_notificacion, id_usuario]
  );
  return rows[0] || null;
};

module.exports = { crear, listarPorUsuario, marcarLeida };
