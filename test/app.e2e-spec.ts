import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/configure-app';
import { PrismaService } from './../src/prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('NODE_ENV must be "test" during E2E testing.');
}
if (
  !process.env.DATABASE_URL ||
  !process.env.DATABASE_URL.includes('studiobook_test')
) {
  throw new Error(
    'DATABASE_URL must be set and contain "studiobook_test" during E2E testing.',
  );
}

describe('StudioBook API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let httpServer: App;

  let accessToken: string;
  let createdServiceId: string;
  let createdBookingId: string;

  const userEmail = `e2e-${Date.now()}@test.com`;
  const userPassword = 'password123';
  const serviceTitle = `E2E Service ${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer();

    // Clean tables before suite in dependency order
    await prisma.booking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // Clean created records
    await prisma.booking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();

    await prisma.$disconnect();
    await app.close();
  });

  describe('Health', () => {
    it('/api/health (GET)', () => {
      return request(httpServer)
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            success: true,
            message: 'StudioBook API is running',
          });
          expect(res.body.data).toBeUndefined();
        });
    });
  });

  describe('Authentication', () => {
    it('/api/auth/register (POST) - Valid', () => {
      return request(httpServer)
        .post('/api/auth/register')
        .send({
          name: 'E2E User',
          email: userEmail,
          password: userPassword,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).not.toHaveProperty('password');
          expect(res.body.data.email).toBe(userEmail);
        });
    });

    it('/api/auth/register (POST) - Duplicate', () => {
      return request(httpServer)
        .post('/api/auth/register')
        .send({
          name: 'E2E User',
          email: userEmail,
          password: userPassword,
        })
        .expect(409);
    });

    it('/api/auth/register (POST) - Invalid Request', () => {
      return request(httpServer)
        .post('/api/auth/register')
        .send({
          name: '',
          email: 'not-an-email',
          password: '123',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toBe('Validation failed');
          expect(Array.isArray(res.body.errors)).toBe(true);
        });
    });

    it('/api/auth/login (POST) - Incorrect Password', () => {
      return request(httpServer)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/api/auth/login (POST) - Valid Login', () => {
      return request(httpServer)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: userPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          accessToken = res.body.data.accessToken;
        });
    });
  });

  describe('Authentication Guard', () => {
    it('/api/auth/me (GET) - Without Token', () => {
      return request(httpServer).get('/api/auth/me').expect(401);
    });

    it('/api/auth/me (GET) - With Token', () => {
      return request(httpServer)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe(userEmail);
          expect(res.body.data).not.toHaveProperty('password');
        });
    });
  });

  describe('Services', () => {
    const servicePayload = {
      title: serviceTitle,
      description: 'E2E Test Service',
      duration: 60,
      price: 150.0,
      isActive: true,
    };

    it('/api/services (POST) - Without Token', () => {
      return request(httpServer)
        .post('/api/services')
        .send(servicePayload)
        .expect(401);
    });

    it('/api/services (POST) - With Token', () => {
      return request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(servicePayload)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.title).toBe(serviceTitle);
          expect(res.body.data.price).toBe(150.0);
          createdServiceId = res.body.data.id;
        });
    });

    it('/api/services (POST) - Duplicate Title Casing', () => {
      return request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...servicePayload, title: serviceTitle.toLowerCase() })
        .expect(409);
    });

    it('/api/services (GET) - Public List Contains Service', () => {
      return request(httpServer)
        .get('/api/services')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          const found = res.body.data.some(
            (s: any) => s.id === createdServiceId,
          );
          expect(found).toBe(true);
        });
    });
  });

  describe('Bookings', () => {
    let bookingDate: string;

    beforeAll(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      bookingDate = futureDate.toISOString().slice(0, 10);
    });

    const bookingPayload = () => ({
      customerName: 'Booking Customer',
      customerEmail: 'booking@test.com',
      serviceId: createdServiceId,
      bookingDate: bookingDate,
      bookingTime: '14:00',
    });

    it('/api/bookings (POST) - Public Creation', () => {
      return request(httpServer)
        .post('/api/bookings')
        .send(bookingPayload())
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe(BookingStatus.PENDING);
          createdBookingId = res.body.data.id;
        });
    });

    it('/api/bookings (POST) - Duplicate Slot', () => {
      return request(httpServer)
        .post('/api/bookings')
        .send(bookingPayload())
        .expect(409);
    });

    it('/api/bookings (GET) - Without Token', () => {
      return request(httpServer).get('/api/bookings').expect(401);
    });

    it('/api/bookings (GET) - With Token', () => {
      return request(httpServer)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toBeDefined();
        });
    });

    it('/api/bookings/:id/status (PATCH) - Update to CONFIRMED', () => {
      return request(httpServer)
        .patch(`/api/bookings/${createdBookingId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: BookingStatus.CONFIRMED })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe(BookingStatus.CONFIRMED);
        });
    });

    it('/api/bookings/:id/cancel (PATCH) - Cancellation', () => {
      return request(httpServer)
        .patch(`/api/bookings/${createdBookingId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe(BookingStatus.CANCELLED);
        });
    });

    it('/api/bookings/:id/status (PATCH) - CANCELLED to COMPLETED', () => {
      return request(httpServer)
        .patch(`/api/bookings/${createdBookingId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: BookingStatus.COMPLETED })
        .expect(400);
    });
  });

  describe('Relational Deletion', () => {
    it('/api/services/:id (DELETE) - Service with Bookings', () => {
      return request(httpServer)
        .delete(`/api/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
