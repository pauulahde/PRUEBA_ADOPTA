const router   = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate }                = require('../middlewares/error.middleware');
const upload                      = require('../middlewares/upload.middleware');

const mascotasCtrl     = require('../controllers/mascotas.controller');
const citasCtrl        = require('../controllers/citas.controller');
const historialCtrl    = require('../controllers/historial.controller');
const vetsCtrl         = require('../controllers/veterinarios.controller');
const notifCtrl        = require('../controllers/notificaciones.controller');

// ── Todas las rutas requieren estar autenticado ─────────────
router.use(authenticate);

/* ════════════════════════════════════════════════════════════
   MASCOTAS
════════════════════════════════════════════════════════════ */
router.get   ('/mascotas',     mascotasCtrl.listar);
router.get   ('/mascotas/:id', mascotasCtrl.obtener);
router.post  ('/mascotas',
  upload.single('foto'),
  [
    body('nombre').trim().notEmpty(),
    body('especie').isIn(['perro','gato','conejo','ave','otro']),
  ],
  validate,
  mascotasCtrl.crear
);
router.patch ('/mascotas/:id', upload.single('foto'), mascotasCtrl.actualizar);
router.delete('/mascotas/:id', mascotasCtrl.eliminar);

/* ════════════════════════════════════════════════════════════
   CITAS
════════════════════════════════════════════════════════════ */
router.get   ('/citas',               citasCtrl.listar);
router.get   ('/citas/:id',           citasCtrl.obtener);
router.post  ('/citas',
  [
    body('id_mascota').isUUID(),
    body('id_veterinario').isUUID(),
    body('fecha_hora').isISO8601().toDate(),
  ],
  validate,
  citasCtrl.crear
);
router.patch ('/citas/:id/estado',
  [body('estado').isIn(['confirmada','cancelada','completada'])],
  validate,
  authorize('veterinario','admin'),
  citasCtrl.actualizarEstado
);
router.delete('/citas/:id', citasCtrl.cancelar);

/* ════════════════════════════════════════════════════════════
   HISTORIAL MÉDICO
════════════════════════════════════════════════════════════ */
router.get   ('/historial/:id_mascota', historialCtrl.listar);
router.post  ('/historial',
  authorize('veterinario','admin'),
  [
    body('id_mascota').isUUID(),
    body('tipo').isIn(['vacuna','diagnostico','tratamiento','cirugia','otro']),
    body('descripcion').trim().notEmpty(),
  ],
  validate,
  historialCtrl.registrar
);
router.delete('/historial/:id', authorize('veterinario','admin'), historialCtrl.eliminar);

/* ════════════════════════════════════════════════════════════
   VETERINARIOS
════════════════════════════════════════════════════════════ */
router.get   ('/veterinarios',                  vetsCtrl.listar);
router.get   ('/veterinarios/:id',              vetsCtrl.obtener);
router.get   ('/veterinarios/:id/disponibilidad', vetsCtrl.disponibilidad);
router.post  ('/veterinarios', authorize('veterinario','admin'), vetsCtrl.crear);
router.patch ('/veterinarios/:id', authorize('veterinario','admin'), vetsCtrl.actualizar);

/* ════════════════════════════════════════════════════════════
   NOTIFICACIONES
════════════════════════════════════════════════════════════ */
router.get  ('/notificaciones',           notifCtrl.listar);
router.patch('/notificaciones/todas',     notifCtrl.marcarTodasLeidas);
router.patch('/notificaciones/:id',       notifCtrl.marcarLeida);

module.exports = router;
