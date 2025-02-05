const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testName = 'pizza diner';
const testEmail = 'reg@test.com';
const testPassword = 'a';
const testUser = { name: testName, email: testEmail, password: testPassword };
let testUserAuthToken;

const testAdminName = 'test admin';
const testAdminEmail = 'admin@test.com';
const testAdminPassword = 'a';
const testAdmin = { name: testAdminName, email: testAdminEmail, password: testAdminPassword };
let testAdminAuthToken;

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

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

  console.log(loginAdminRes);
  adminAuthToken = loginAdminRes.body.token;
  adminEmail = adminUser.email;
});

test('get all franchises', async () => {
  franchiseRes = await request(app).get('/api/franchise');
  expect(franchiseRes.status).toBe(200);
});
/*
test('create franchises', async () => {
  console.log(adminEmail);
  franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`).send({ name: 'TestFranchise', admins: [{ email: adminEmail }] });
  expect(franchiseRes.status).toBe(200);
});
*/