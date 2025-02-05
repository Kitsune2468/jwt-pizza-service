const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

//Test user data
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

//Test admin data
testAdminEmail = "admin@test.com";
testAdminID = 0;
let testAdminAuthToken;

//Test franchise data
testFranchiseID = "";

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
  testAdminEmail = adminUser.email;
  testAdminID = loginRes.body.id;

  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test('get all franchises', async () => {
  franchiseRes = await request(app).get('/api/franchise');
  expect(franchiseRes.status).toBe(200);
});

test('create franchise', async () => {
  franchiseName = randomName();
  const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`).send({ name: `${testAdminAuthToken}`, admins: [{ email: `${testAdminEmail}` }] });
  expect(franchiseRes.status).toBe(200);
  testFranchiseID = franchiseRes.body.id;
});

test('get user franchise', async () => {
  const franchiseRes = await request(app).get(`/api/franchise/${testAdminID}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
  expect(franchiseRes.status).toBe(200);
});

test('delete franchise', async () => {
  deleteRes = await request(app).delete('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`);
  expect(franchiseRes.status).toBe(200);
});

test('bad create franchise by user', async () => {
  franchiseName = randomName();
  const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send({ name: `${testUserAuthToken}`, admins: [{ email: `${testUser.email}` }] });
  expect(franchiseRes.status).toBe(403);
});

