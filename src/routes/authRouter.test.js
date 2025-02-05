const request = require('supertest');
const app = require('../service');

const testName = 'pizza diner';
const testEmail = 'reg@test.com';
const testPassword = 'a';
const testUser = { name: testName, email: testEmail, password: testPassword };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);
  console.log(loginRes.body);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('bad login', async() => {
    const loginRes = await request(app).put('/api/auth').send();
    expect(loginRes.status).toBe(500);
});

test('bad register', async() => {
    const registerRes = await request(app).post('/api/auth').send();
    expect(registerRes.status).toBe(400);
});

test('bad logout', async() => {
    const logoutRes = await request(app).delete('/api/auth').send();
    expect(logoutRes.status).toBe(401);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

