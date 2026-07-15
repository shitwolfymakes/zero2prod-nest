import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { subscriptions } from '../src/database/schema';
import { createTestApp, TestApp } from './utils/test-app';

describe('zero2prod (e2e)', () => {
  let ctx: TestApp;
  let http: App;

  beforeAll(async () => {
    ctx = await createTestApp();
    http = ctx.app.getHttpServer() as App;
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  beforeEach(async () => {
    await ctx.db.delete(subscriptions);
  });

  describe('GET /health', () => {
    it('reports the service and its database as up', async () => {
      const response = await request(http).get('/health');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toMatchObject({
        status: 'ok',
        info: { database: { status: 'up' } },
      });
    });
  });

  describe('POST /subscriptions', () => {
    it('returns 201 and persists the subscriber for valid form data', async () => {
      const response = await request(http)
        .post('/subscriptions')
        .type('form')
        .send({ email: 'ursula_k_le_guin@gmail.com', name: 'le guin' });

      expect(response.status).toBe(HttpStatus.CREATED);

      const saved = await ctx.db
        .select({ email: subscriptions.email, name: subscriptions.name })
        .from(subscriptions);

      expect(saved).toEqual([
        { email: 'ursula_k_le_guin@gmail.com', name: 'le guin' },
      ]);
    });

    it.each([
      ['missing the email', { name: 'le guin' }],
      ['missing the name', { email: 'ursula_k_le_guin@gmail.com' }],
      ['missing both name and email', {}],
      [
        'an invalid email',
        { email: 'definitely-not-an-email', name: 'le guin' },
      ],
    ])('returns 400 when %s', async (_description, body) => {
      const response = await request(http)
        .post('/subscriptions')
        .type('form')
        .send(body);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns 409 when the email is already subscribed', async () => {
      const payload = { email: 'ursula_k_le_guin@gmail.com', name: 'le guin' };

      await request(http).post('/subscriptions').type('form').send(payload);
      const response = await request(http)
        .post('/subscriptions')
        .type('form')
        .send(payload);

      expect(response.status).toBe(HttpStatus.CONFLICT);
    });
  });
});
