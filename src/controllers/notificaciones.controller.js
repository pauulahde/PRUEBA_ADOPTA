const notifService = require('../services/notificacion.service');

const listar = async (req, res, next) => {
  try {
    const soloNoLeidas = req.query.no_leidas === 'true';
    const rows = await notifService.listarPorUsuario(req.user.id_usuario, soloNoLeidas);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const marcarLeida = async (req, res, next) => {
  try {
    const notif = await notifService.marcarLeida(req.params.id, req.user.id_usuario);
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.json(notif);
  } catch (err) {
    next(err);
  }
};

const marcarTodasLeidas = async (req, res, next) => {
  try {
    const db = require('../config/database');
    await db.query(
      `UPDATE NOTIFICACION SET leida = TRUE WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, marcarLeida, marcarTodasLeidas };
