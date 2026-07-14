//! test/health-check.e2e-spec.ts
import request from 'supertest';

import { subscriptions } from '../src/db/schema';
import { TestApp, spawnApp } from './helpers/spawn-app';

describe('zero2prod', () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await spawnApp();
  });

  afterEach(async () => {
    await app.teardown();
  });

  it('health check works', async () => {
    const response = await request(app.address).get('/health_check');

    expect(response.status).toBe(200);
    expect(response.text).toBe('');
  });

  it('subscribe returns a 200 for valid form data', async () => {
    const body = 'name=le%20guin&email=ursula_k_le_guin%40gmail.com';

    const response = await request(app.address)
      .post('/subscriptions')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(body);

    expect(response.status).toBe(200);

    const saved = await app.db
      .select({
        email: subscriptions.email,
        name: subscriptions.name,
      })
      .from(subscriptions);

    expect(saved).toHaveLength(1);
    expect(saved[0].email).toBe('ursula_k_le_guin@gmail.com');
    expect(saved[0].name).toBe('le guin');
  });

  it('subscribe returns a 400 when data is missing', async () => {
    const testCases: [string, string][] = [
      ['name=le%20gion', 'missing the email'],
      ['email=ursula_k_le_guin%40gmail.com', 'missing the name'],
      ['', 'missing both name and email'],
    ];

    for (const [invalidBody, errorMessage] of testCases) {
      const response = await request(app.address)
        .post('/subscriptions')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(invalidBody);

      // Comparing objects rather than bare status codes so that a failure
      // report names the payload that broke, the way the Rust suite's
      // customized assertion message does.
      expect({ status: response.status, payload: errorMessage }).toEqual({
        status: 400,
        payload: errorMessage,
      });
    }
  });
});
