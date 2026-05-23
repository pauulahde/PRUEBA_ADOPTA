const jwt = require('jsonwebtoken');

/**
 * Verifica el token JWT del header Authorization: Bearer <token>
 * Adjunta req.user = { id_usuario, correo, rol } si es válido.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso requerido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Token expirado. Inicia sesión nuevamente.'
      : 'Token inválido.';
    return res.status(401).json({ error: msg });
  }
};

/**
 * Genera un middleware que autoriza solo los roles indicados.
 * Uso: authorize('admin') | authorize('veterinario', 'admin')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
  }
  next();
};

module.exports = { authenticate, authorize };
