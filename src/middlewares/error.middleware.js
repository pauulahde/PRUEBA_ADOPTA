const { validationResult } = require('express-validator');

/**
 * Valida los resultados de express-validator.
 * Debe colocarse DESPUÉS de las reglas de validación en la ruta.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

/**
 * Manejador global de errores.
 * Express lo identifica por tener 4 parámetros (err, req, res, next).
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Error de unicidad de PostgreSQL (ej: correo duplicado)
  if (err.code === '23505') {
    return res.status(409).json({ error: 'El registro ya existe.' });
  }

  // Error de clave foránea
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia a un registro que no existe.' });
  }

  const status = err.status || 500;
  const message = err.expose ? err.message : 'Error interno del servidor.';
  res.status(status).json({ error: message });
};

/**
 * Ruta no encontrada (404).
 */
const notFound = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

module.exports = { validate, errorHandler, notFound };
