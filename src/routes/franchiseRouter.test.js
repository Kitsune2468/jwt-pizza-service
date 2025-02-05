const request = require('supertest');
const app = require('../service');

const testName = 'pizza diner';
const testEmail = 'reg@test.com';
const testPassword = 'a';
const testUser = { name: testName, email: testEmail, password: testPassword };
let testUserAuthToken;

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

beforeAll(async () => {
  adminUser = createAdminUser();
  const loginAdminRes = await request(app).put('/api/auth').send(adminUser);

  adminAuthToken = loginAdminRes.body.token;
});

test('get all franchises', async () => {
  franchiseRes = await request(app).get('/api/franchise');
  expect(franchiseRes.status).toBe(200);
});