const test = require('ava');
const { setup } = require('../../../test/helpers/setup');

test.before(async t => {
    t.context.server = await setup({ usePlugins: false });
});

test('Can create guest sessions', async t => {
    let res = await t.context.server.inject({
        method: 'POST',
        url: '/v3/auth/session'
    });

    const sessionToken = res.result['DW-SESSION'];

    t.truthy(res.result['DW-SESSION']);
    t.truthy(res.headers['set-cookie'].find(s => s.includes(`DW-SESSION=${sessionToken}`)));

    res = await t.context.server.inject({
        method: 'POST',
        url: '/v3/auth/session',
        headers: {
            cookie: `DW-SESSION=${sessionToken}; crumb=abc`,
            'X-CSRF-Token': 'abc',
            referer: 'http://localhost'
        }
    });

    t.is(sessionToken, res.result['DW-SESSION']);

    await t.context.server.inject({
        method: 'POST',
        url: '/v3/auth/logout',
        headers: {
            cookie: `DW-SESSION=${sessionToken}; crumb=abc`,
            'X-CSRF-Token': 'abc',
            referer: 'http://localhost'
        }
    });
});

test('Guest session artifacts are valid user model instances', async t => {
    let res = await t.context.server.inject({
        method: 'POST',
        url: '/v3/auth/session'
    });
    const sessionToken = res.result['DW-SESSION'];
    t.truthy(res.result['DW-SESSION']);

    res = await t.context.server.inject({
        method: 'GET',
        url: '/v3/me',
        headers: {
            cookie: `DW-SESSION=${sessionToken}`
        }
    });
    t.is(res.result.role, 'guest');
    const user = res.request.auth.artifacts;

    t.is(user.id, null);
    t.is(user.role, 'guest');
    t.is(user.get('language'), 'en-US');
    t.is(user.isActivated(), false);
    t.is(user.isAdmin(), false);
    t.is(user.save(), false);
});
