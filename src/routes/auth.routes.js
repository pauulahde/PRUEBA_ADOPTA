const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/auth.controller');
const { authenticate }      = require('../middlewares/auth.middleware');
const { validate }          = require('../middlewares/error.middleware');

const reglasRegistro = [
  body('nombre').trim().notEmpty().withMessage('El nombre es requerido.'),
  body('correo').isEmail().withMessage('Correo inválido.').normalizeEmail(),
  body('contrasena').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
];

const reglasLogin = [
  body('correo').isEmail().normalizeEmail(),
  body('contrasena').notEmpty(),
];

// POST /api/auth/registro
router.post('/registro', reglasRegistro, validate, ctrl.registro);

// POST /api/auth/login
router.post('/login', reglasLogin, validate, ctrl.login);

// GET  /api/auth/perfil  (requiere token)
router.get('/perfil', authenticate, ctrl.perfil);

// PATCH /api/auth/perfil
router.patch('/perfil', authenticate, ctrl.actualizarPerfil);

module.exports = router;
