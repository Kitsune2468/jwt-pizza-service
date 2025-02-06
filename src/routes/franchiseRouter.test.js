const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

// Test user data
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

// Test admin data
var testAdminEmail = "admin@test.com";
var testAdminID = 0;
let testAdminAuthToken;

// Test franchise data
var testFranchiseID = "";
var testStoreID = 0;

// Support functions
function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  const userRes = await DB.addUser(user);

  return { ...userRes, password: 'toomanysecrets' };
  //return [user, userRes];
}

beforeAll(async () => {
  var adminUser;
  adminUser = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  testAdminAuthToken = loginRes.body.token;
  testAdminEmail = adminUser.email;
  testAdminID = loginRes.body.id;

  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});

// Get all franchises test
test('get all franchises', async () => {
  const franchiseRes = await request(app).get('/api/franchise');
  expect(franchiseRes.status).toBe(200);
});

// Create Franchise Tests
test('create franchise', async () => {
  const franchiseName = randomName();
  const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`).send({ name: `${franchiseName}`, admins: [{ email: `${testAdminEmail}` }] });
  expect(franchiseRes.status).toBe(200);
  testFranchiseID = franchiseRes.body.id;
});

test('bad create franchise by user', async () => {
  const franchiseName = randomName();
  const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testUserAuthToken}`).send({ name: `${franchiseName}`, admins: [{ email: `${testUser.email}` }] });
  expect(franchiseRes.status).toBe(403);
});

// Get admin franchise test
test('get user franchise', async () => {
  const franchiseRes = await request(app).get(`/api/franchise/${testAdminID}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
  expect(franchiseRes.status).toBe(200);
});

// Create store tests
test('create store', async () => {
  const storeName = randomName();
  const storeRes = await request(app).post(`/api/franchise/${testFranchiseID}/store`).set('Authorization', `Bearer ${testAdminAuthToken}`).send({ franchiseID: `${testFranchiseID}`,name: `${storeName}`});
  expect(storeRes.status).toBe(200);
  testStoreID = storeRes.body.id;
});

test('bad create store user', async () => {
  const storeName = randomName();
  const storeRes = await request(app).post(`/api/franchise/${testFranchiseID}/store`).set('Authorization', `Bearer ${testUserAuthToken}`).send({ franchiseID: `${testFranchiseID}`,name: `${storeName}`});
  expect(storeRes.status).toBe(403);
});

// Delete store tests
test('delete store', async () => {
  const storeRes = await request(app).delete(`/api/franchise/${testFranchiseID}/store/${testStoreID}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
  expect(storeRes.status).toBe(200);
});

test('bad delete store user', async () => {
  const storeRes = await request(app).delete(`/api/franchise/${testFranchiseID}/store/${testStoreID}`).set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(storeRes.status).toBe(403);
});

// Delete franchise test
test('delete franchise', async () => {
  const deleteRes = await request(app).delete(`/api/franchise/${testFranchiseID}`).set('Authorization', `Bearer ${testAdminAuthToken}`);
  expect(deleteRes.status).toBe(200);
});
