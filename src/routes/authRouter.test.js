const request = require('supertest');
const app = require('../service');
const { DB, Role } = require('../../src/database/database');

// Test user data
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

// Test admin data
let testAdminAuthToken;

// Support functions
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
    testUser.email = randomName() + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);
});

// Admin/user login tests
test('create/login admin', async () => {
    [adminUser, adminResult] = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    expect(loginRes.status).toBe(200);
    expectValidJwt(loginRes.body.token);
    testAdminAuthToken = loginRes.body.token;

    const expectedUser = { ...adminUser, roles: [{ role: 'admin' }] };
    delete expectedUser.password;
    expect(loginRes.body.user).toMatchObject(expectedUser);

    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testAdminAuthToken}`);
    expect(logoutRes.status).toBe(200);
});

test('login & logout', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expectValidJwt(loginRes.body.token);

    const expectedUser = { ...testUser, roles: [{ role: Role.Diner }] };
    delete expectedUser.password;
    expect(loginRes.body.user).toMatchObject(expectedUser);

    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(logoutRes.status).toBe(200);
});

// Bad login/register/logout tests
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

