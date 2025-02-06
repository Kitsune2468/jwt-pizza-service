const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

// Test user data
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

// Test admin data
var testAdminEmail = "admin@test.com";
let testAdminAuthToken;

// Test franchise data
var testFranchiseID = "";
var testStoreID = 0;

// Test item/order data
var testItemID = 0;
var testItemDescription = "Test Pizza";

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
  // Create test admin
  var adminUser;
  adminUser = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  testAdminAuthToken = loginRes.body.token;
  testAdminEmail = adminUser.email;

  // Create test user
  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;

  // Create test franchise
  const franchiseName = randomName();
  const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${testAdminAuthToken}`).send({ name: `${franchiseName}`, admins: [{ email: `${testAdminEmail}` }] });
  testFranchiseID = franchiseRes.body.id;
  const storeName = randomName();
  const storeRes = await request(app).post(`/api/franchise/${testFranchiseID}/store`).set('Authorization', `Bearer ${testAdminAuthToken}`).send({ franchiseID: `${testFranchiseID}`,name: `${storeName}`});
  testStoreID = storeRes.body.id;
});

// Get menu
test('get menu', async () => {
  const menuRes = await request(app).get('/api/order/menu');
  expect(menuRes.status).toBe(200);
});

// Create item for menu
test('create item', async () => {
  const pizzaName = randomName();
  const itemRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${testAdminAuthToken}`).send({ title: `${pizzaName}`, description: `${testItemDescription}`, image: "pizza1.png", price: 0.001 });
  expect(itemRes.status).toBe(200);
  testItemID = itemRes.body[itemRes.body.length-1].id;
});

// Create order
test('create item', async () => {
  const itemRes = await request(app).post('/api/order')
  .set('Authorization', `Bearer ${testUserAuthToken}`)
  .send({ franchiseId: `${testFranchiseID}`, storeId: `${testStoreID}`, items:[{ menuId: `${testItemID}`, description: `${testItemDescription}`, price: 0.001 }] });
  expect(itemRes.status).toBe(200);
});

// Get user order
test('create item', async () => {
  const itemRes = await request(app).get('/api/order')
  .set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(itemRes.status).toBe(200);
});