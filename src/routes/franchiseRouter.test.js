const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testName = 'pizza diner';
const testEmail = 'reg@test.com';
const testPassword = 'a';
const testUser = { name: testName, email: testEmail, password: testPassword };
let testUserAuthToken;

testAdminEmail = "admin@test.com";
let testAdminAuthToken;

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  userRes = await DB.addUser(user);

  //return { ...user, password: 'toomanysecrets' };
  return [user, userRes];
}

beforeAll(async () => {
  [adminUser, adminResult] = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  testAdminAuthToken = loginRes.body.token;
  console.log(testAdminAuthToken);
  testAdminEmail = adminUser.email;
  console.log(testAdminEmail);
});

test('get all franchises', async () => {
  franchiseRes = await request(app).get('/api/franchise');
  expect(franchiseRes.status).toBe(200);
});

test('create franchise', async () => {
  const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`).send({ name: 'TestFranchise', admins: [{ email: testAdminEmail }] });
  expect(franchiseRes.status).toBe(200);
});
