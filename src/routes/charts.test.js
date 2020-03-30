const test = require('ava');
const { setup } = require('../../test/helpers/setup');

test.before(async t => {
    const { server, getUser, getTeamWithUser } = await setup({ usePlugins: false });
    const data = await getUser('admin');

    t.context.server = server;
    t.context.data = data;
    t.context.getUser = getUser;
    t.context.getTeamWithUser = getTeamWithUser;
    t.context.auth = {
        strategy: 'session',
        credentials: data.session,
        artifacts: data.user
    };
});

test('It should be possible to create, fetch, edit and delete charts', async t => {
    let chart = await t.context.server.inject({
        method: 'POST',
        url: '/v3/charts',
        auth: t.context.auth
    });

    t.is(chart.result.authorId, t.context.data.user.id);
    t.is(chart.result.id.length, 5);
    t.is(typeof chart.result.metadata, 'object');

    chart = await t.context.server.inject({
        method: 'GET',
        url: `/v3/charts/${chart.result.id}`,
        auth: t.context.auth
    });

    t.truthy(chart.result.authorId);
    t.is(chart.result.id.length, 5);

    chart = await t.context.server.inject({
        method: 'PATCH',
        url: `/v3/charts/${chart.result.id}`,
        auth: t.context.auth,
        payload: {
            title: 'TEST TITLE'
        }
    });

    t.is(chart.result.title, 'TEST TITLE');

    chart = await t.context.server.inject({
        method: 'DELETE',
        url: `/v3/charts/${chart.result.id}`,
        auth: t.context.auth
    });

    t.is(chart.statusCode, 204);
});

test('Admins should see author information', async t => {
    let chart = await t.context.server.inject({
        method: 'POST',
        url: '/v3/charts',
        auth: t.context.auth
    });

    chart = await t.context.server.inject({
        method: 'GET',
        url: `/v3/charts/${chart.result.id}`,
        auth: t.context.auth
    });

    t.truthy(chart.result.author);
    t.is(chart.result.author.email, t.context.data.user.email);
});

test('Should be possible to search in multiple fields', async t => {
    let chart = await t.context.server.inject({
        method: 'POST',
        url: '/v3/charts',
        auth: t.context.auth,
        payload: {
            title: 'title-search',
            metadata: {
                describe: {
                    intro: 'intro-search',
                    byline: 'byline-search',
                    'source-name': 'source-search',
                    'source-url': 'https://source.com'
                },
                annotate: {
                    notes: 'notes-search'
                }
            }
        }
    });

    const chartId = chart.result.id;

    const searchQueries = ['title', 'intro', 'byline', 'source', 'source.com', 'notes'];

    for (const query of searchQueries) {
        chart = await t.context.server.inject({
            method: 'GET',
            url: `/v3/charts?search=${query}`,
            auth: t.context.auth
        });

        t.is(chart.result.list.length, 1);
        t.is(chart.result.list[0].id, chartId);
    }
});

test('Users can not change the author ID of a chart', async t => {
    const { user, session } = await t.context.getUser();
    let chart = await t.context.server.inject({
        method: 'POST',
        url: '/v3/charts',
        headers: {
            cookie: `DW-SESSION=${session.id}`
        }
    });

    t.is(chart.result.authorId, user.id);

    chart = await t.context.server.inject({
        method: 'PATCH',
        url: `/v3/charts/${chart.result.id}`,
        headers: {
            cookie: `DW-SESSION=${session.id}`
        },
        payload: {
            authorId: null
        }
    });

    t.is(chart.result.authorId, user.id);
});

test('Users can create charts in a team they have access to', async t => {
    const { team, session } = await t.context.getTeamWithUser('member');

    const chart = await t.context.server.inject({
        method: 'POST',
        url: '/v3/charts',
        headers: {
            cookie: `DW-SESSION=${session.id}`
        },
        payload: {
            organizationId: team.id
        }
    });

    t.is(chart.statusCode, 201);
});

test('Users cannot create chart in a team they dont have access to', async t => {
    const { session } = await t.context.getUser();
    const { team } = await t.context.getTeamWithUser('member');

    const chart = await t.context.server.inject({
        method: 'POST',
        url: '/v3/charts',
        headers: {
            cookie: `DW-SESSION=${session.id}`
        },
        payload: {
            organizationId: team.id
        }
    });

    t.is(chart.statusCode, 401);
});

test('Users can edit chart medatata', async t => {
    const { session } = await t.context.getUser();
    let chart = await t.context.server.inject({
        method: 'POST',
        url: '/v3/charts',
        headers: {
            cookie: `DW-SESSION=${session.id}`
        },
        payload: {
            metadata: {
                annotate: {
                    notes: 'note-1'
                }
            }
        }
    });

    t.is(chart.result.metadata.annotate.notes, 'note-1');

    chart = await t.context.server.inject({
        method: 'PATCH',
        url: `/v3/charts/${chart.result.id}`,
        headers: {
            cookie: `DW-SESSION=${session.id}`
        },
        payload: {
            metadata: {
                annotate: {
                    notes: 'note-2'
                }
            }
        }
    });

    t.is(chart.result.metadata.annotate.notes, 'note-2');

    chart = await t.context.server.inject({
        method: 'GET',
        url: `/v3/charts/${chart.result.id}`,
        headers: {
            cookie: `DW-SESSION=${session.id}`
        }
    });

    t.is(chart.result.metadata.annotate.notes, 'note-2');
});

test('User can read and write chart data', async t => {
    const { session } = await t.context.getUser();
    const headers = {
        cookie: `DW-SESSION=${session.id}`
    };
    // create a new chart
    const chart = await t.context.server.inject({
        method: 'POST',
        url: '/v3/charts',
        headers,
        payload: {}
    });

    // chart data is missing by default
    let res = await getData();
    t.is(res.statusCode, 404);
    // set chart data
    res = await putData('hello world');
    t.is(res.statusCode, 200);
    // confirm chart data was set
    res = await getData();
    t.is(res.statusCode, 200);
    t.is(res.result, 'hello world');
    // check if data is written to asset, too
    res = await getAsset(`${chart.result.id}.csv`);
    t.is(res.statusCode, 200);
    t.is(res.result, 'hello world');
    // write some JSON to another asset
    res = await putAsset(`${chart.result.id}.map.json`, { answer: 42 }, 'application/json');
    t.is(res.statusCode, 200);
    // see if that worked
    res = await getAsset(`${chart.result.id}.map.json`);
    t.is(res.statusCode, 200);
    t.is(JSON.parse(res.result).answer, 42);

    async function getData() {
        return t.context.server.inject({
            method: 'GET',
            headers,
            url: `/v3/charts/${chart.result.id}/data`
        });
    }

    async function getAsset(asset) {
        return t.context.server.inject({
            method: 'GET',
            headers,
            url: `/v3/charts/${chart.result.id}/assets/${asset}`
        });
    }

    async function putData(data, contentType = 'text/csv') {
        return t.context.server.inject({
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': contentType
            },
            url: `/v3/charts/${chart.result.id}/data`,
            payload: data
        });
    }

    async function putAsset(asset, data, contentType = 'text/csv') {
        return t.context.server.inject({
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': contentType
            },
            url: `/v3/charts/${chart.result.id}/assets/${asset}`,
            payload: data
        });
    }
});
