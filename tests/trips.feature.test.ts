import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Trip } from '../src/models/trip.model';
import { createAccessToken } from '../src/utils/jwt';

// Usuaria de prueba con sesión iniciada (cookie accessToken válida).
const userId = new Types.ObjectId().toString();
const cookie = `accessToken=${createAccessToken(userId, 'USER')}`;

beforeAll(async () => {
  await connectDatabase();
  if (!mongoose.connection.name.includes('test')) {
    throw new Error('Los tests solo pueden usar una base de pruebas');
  }
});

beforeEach(async () => {
  await Trip.deleteMany({});
});

afterAll(async () => {
  await Trip.deleteMany({});
  await disconnectDatabase();
});

describe('Gestión de itinerario por día', () => {
  test('HP-01: crea un viaje, agrega una cena al Día 1 y lo muestra en la lista con el gasto actualizado', async () => {
    // Arrange
    const trip = { name: 'Oaxaca', destination: 'Oaxaca, México', days: 3, budget: 800 };
    const dinner = { title: 'Cena', time: '20:00', category: 'Comida', cost: 50 };

    // Act
    const created = await request(app).post('/api/trips').set('Cookie', cookie).send(trip);
    const tripId = created.body.trip._id;
    await request(app).post(`/api/trips/${tripId}/days/0/activities`).set('Cookie', cookie).send(dinner);
    const list = await request(app).get('/api/trips').set('Cookie', cookie);

    // Assert
    expect(created.status).toBe(201);
    expect(list.status).toBe(200);
    expect(list.body.trips).toHaveLength(1);
    expect(list.body.trips[0].spent).toBe(50);
    expect(list.body.trips[0].activityCount).toBe(1);
  });

  test('EC-01: responde 401 si la petición no trae sesión', async () => {
    // Arrange
    const url = '/api/trips';

    // Act
    const response = await request(app).get(url);

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  test('EC-02: rechaza con 400 un viaje con presupuesto negativo y no lo guarda', async () => {
    // Arrange
    const trip = { name: 'Oaxaca', budget: -100 };

    // Act
    const response = await request(app).post('/api/trips').set('Cookie', cookie).send(trip);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_BUDGET');
    expect(await Trip.countDocuments()).toBe(0);
  });

  test('EC-02: rechaza con 400 una actividad con costo negativo', async () => {
    // Arrange
    const created = await request(app).post('/api/trips').set('Cookie', cookie).send({ name: 'Oaxaca', days: 3 });
    const activity = { title: 'Cena', category: 'Comida', cost: -5 };

    // Act
    const response = await request(app)
      .post(`/api/trips/${created.body.trip._id}/days/0/activities`)
      .set('Cookie', cookie)
      .send(activity);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_COST');
  });

  test('EDGE-01: guarda una actividad aunque exceda el presupuesto y recalcula el gasto', async () => {
    // Arrange
    const created = await request(app).post('/api/trips').set('Cookie', cookie).send({ name: 'Oaxaca', days: 3, budget: 100 });
    const activitiesUrl = `/api/trips/${created.body.trip._id}/days/0/activities`;
    await request(app).post(activitiesUrl).set('Cookie', cookie).send({ title: 'Mercado', category: 'Comida', cost: 40 });
    await request(app).post(activitiesUrl).set('Cookie', cookie).send({ title: 'Museo Textil', category: 'Cultura', cost: 35 });

    // Act
    const response = await request(app)
      .post(activitiesUrl)
      .set('Cookie', cookie)
      .send({ title: 'Hierve el Agua', category: 'Aventura', cost: 60 });

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.trip.spent).toBe(135);
    expect(response.body.trip.activityCount).toBe(3);
  });

  test('EDGE-02: rechaza un viaje de 15 días con 400 y no lo guarda', async () => {
    // Arrange
    const trip = { name: 'Japón', destination: 'Tokio, Japón', days: 15, budget: 2000 };

    // Act
    const response = await request(app).post('/api/trips').set('Cookie', cookie).send(trip);

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DAYS');
    expect(await Trip.countDocuments()).toBe(0);
  });

  test('EDGE-02: acepta un viaje de 14 días, el máximo permitido', async () => {
    // Arrange
    const trip = { name: 'Japón', destination: 'Tokio, Japón', days: 14, budget: 2000 };

    // Act
    const response = await request(app).post('/api/trips').set('Cookie', cookie).send(trip);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.trip.days).toHaveLength(14);
  });
});
