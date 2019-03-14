import test from 'ava';
import OpenAPIValidator from 'openapi-schema-validator';

import { init } from '../src/server';

let server;

test.before(async t => {
    server = await init();
});

test('Server - should be registered', t => {
    t.truthy(server);
    t.truthy(server.registrations['dw-auth']);
});

test('Route - v3/ - should return OpenAPI doc', async t => {
    const openapi = new OpenAPIValidator({ version: 2 });

    const res = await server.inject('/v3');

    t.is(openapi.validate(res.result).errors.length, 0);
});

test('Route - 3/ should redirect to v3/', async t => {
    const res = await server.inject('/3');
    t.is(res.request.route.path, '/v3');
});

test('Plugin - "hello world" should be registered', async t => {
    t.truthy(server.registrations['hello-world']);

    const res = await server.inject('/v3/hello-world');
    t.is(res.result.data, 'Hello from plugin');
    t.is(res.statusCode, 200);
});

test('Users - GET v3/users exists', async t => {
    const res = await server.inject('/v3/users');
    t.is(res.statusCode, 401);
});

test('Auth - POST v3/auth/login exists', async t => {
    const res = await server.inject({ method: 'POST', url: '/v3/auth/login' });
    t.is(res.statusCode, 400);
    t.is(res.result.error, 'Bad Request');
});

test('Auth - POST v3/auth/logout exists', async t => {
    const res = await server.inject({ method: 'POST', url: '/v3/auth/logout' });
    t.is(res.statusCode, 401);
    t.is(res.result.error, 'Unauthorized');
});
