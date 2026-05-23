const request = require('supertest');
const { app }  = require('../src/app');

// Mock de la BD para no necesitar PostgreSQL en tests
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

const db = require('../src/config/database');

describe('POST /api/auth/registro', () => {
  it('crea un usuario y devuelve token', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id_usuario: 'uuid-test',
        nombre: 'Test User',
        correo: 'test@test.com',
        rol: 'dueno',
        fecha_registro: new Date().toISOString(),
      }],
    });

    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Test User',
      correo: 'test@test.com',
      contrasena: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario).toHaveProperty('correo', 'test@test.com');
  });

  it('rechaza si falta el correo', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Test',
      contrasena: 'password123',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('rechaza credenciales incorrectas', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // usuario no encontrado

    const res = await request(app).post('/api/auth/login').send({
      correo: 'noexiste@test.com',
      contrasena: 'wrong',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
