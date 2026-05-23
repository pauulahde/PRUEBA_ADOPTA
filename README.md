# AdoptaSoft – Backend API REST

Backend de la plataforma veterinaria AdoptaSoft construido con **Node.js 18+**, **Express 4** y **PostgreSQL 15**.

## Requisitos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 18.0.0        |
| PostgreSQL   | 15            |
| npm          | 9.0.0         |

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/adoptasoft-backend.git
cd adoptasoft-backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 4. Crear la base de datos
psql -U postgres -c "CREATE DATABASE adoptasoft_db;"
psql -U postgres -d adoptasoft_db -f adoptasoft_database.sql

# 5. Iniciar en desarrollo
npm run dev

# 6. Iniciar en producción
npm start
```

## Estructura del proyecto

```
src/
├── app.js                        # Punto de entrada
├── config/
│   ├── database.js               # Pool de conexiones PostgreSQL
│   └── firebase.js               # Firebase Admin SDK
├── controllers/
│   ├── auth.controller.js        # Registro, login, perfil
│   ├── mascotas.controller.js    # CRUD mascotas + foto
│   ├── citas.controller.js       # Agendamiento con validación de disponibilidad
│   ├── historial.controller.js   # Historial médico
│   ├── veterinarios.controller.js
│   └── notificaciones.controller.js
├── middlewares/
│   ├── auth.middleware.js        # JWT + autorización por rol
│   ├── error.middleware.js       # Manejo global de errores
│   └── upload.middleware.js      # Multer para fotos
├── routes/
│   ├── auth.routes.js
│   └── api.routes.js             # Todas las rutas protegidas
└── services/
    ├── notificacion.service.js   # CRUD notificaciones
    └── websocket.service.js      # Chat en tiempo real
```

## Endpoints

### Autenticación (`/api/auth`)

| Método | Ruta            | Acceso | Descripción                  |
|--------|-----------------|--------|------------------------------|
| POST   | `/registro`     | Público | Crear cuenta nueva           |
| POST   | `/login`        | Público | Iniciar sesión → JWT         |
| GET    | `/perfil`       | Auth   | Ver perfil del usuario actual |
| PATCH  | `/perfil`       | Auth   | Actualizar nombre y teléfono |

### Mascotas (`/api/mascotas`)

| Método | Ruta       | Roles             | Descripción                    |
|--------|------------|-------------------|--------------------------------|
| GET    | `/`        | Todos             | Listar mascotas propias        |
| GET    | `/:id`     | Todos             | Detalle de una mascota         |
| POST   | `/`        | dueno             | Registrar mascota (+ foto)     |
| PATCH  | `/:id`     | dueno             | Actualizar mascota             |
| DELETE | `/:id`     | dueno, admin      | Soft delete                    |

### Citas (`/api/citas`)

| Método | Ruta               | Roles                  | Descripción                      |
|--------|--------------------|------------------------|----------------------------------|
| GET    | `/`                | Todos                  | Listar citas filtradas por rol   |
| GET    | `/:id`             | Todos                  | Detalle de una cita              |
| POST   | `/`                | dueno                  | Agendar cita                     |
| PATCH  | `/:id/estado`      | veterinario, admin     | Confirmar / completar / cancelar |
| DELETE | `/:id`             | dueno                  | Cancelar cita propia             |

### Historial médico (`/api/historial`)

| Método | Ruta                  | Roles              | Descripción                |
|--------|-----------------------|--------------------|----------------------------|
| GET    | `/:id_mascota`        | Todos              | Historial de una mascota   |
| POST   | `/`                   | veterinario, admin | Registrar evento médico    |
| DELETE | `/:id`                | veterinario, admin | Eliminar registro          |

### Veterinarios (`/api/veterinarios`)

| Método | Ruta                     | Roles              | Descripción             |
|--------|--------------------------|--------------------|-------------------------|
| GET    | `/`                      | Todos              | Listar veterinarios     |
| GET    | `/:id`                   | Todos              | Detalle                 |
| GET    | `/:id/disponibilidad`    | Todos              | Citas ocupadas por fecha|
| POST   | `/`                      | veterinario, admin | Crear perfil            |
| PATCH  | `/:id`                   | veterinario, admin | Actualizar perfil       |

### Notificaciones (`/api/notificaciones`)

| Método | Ruta       | Descripción                     |
|--------|------------|---------------------------------|
| GET    | `/`        | Listar notificaciones propias   |
| PATCH  | `/todas`   | Marcar todas como leídas        |
| PATCH  | `/:id`     | Marcar una como leída           |

### WebSocket (`ws://localhost:3000/ws?token=JWT`)

Mensajes JSON de entrada:
```json
{ "id_receptor": "uuid", "contenido": "Hola doctor!" }
```
Mensajes de salida:
```json
{ "id_mensaje": "uuid", "id_emisor": "uuid", "id_receptor": "uuid", "contenido": "...", "fecha_envio": "ISO" }
```

## Seguridad implementada

- Contraseñas con **bcrypt** (12 rounds) — nunca en texto plano
- Tokens **JWT** con expiración configurable
- Comunicación **HTTPS/TLS** en producción
- **CORS** restringido al frontend
- Protección de datos (Ley 1581 de 2012)

## Tests

```bash
npm test
```
