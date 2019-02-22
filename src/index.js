const Hapi = require('hapi');
const AuthBearer = require('hapi-auth-bearer-token');
const HapiSwagger = require('hapi-swagger');

const pkg = require('../package.json');

const ORM = require('@datawrapper/orm');
const config = require('../config');

ORM.init(config);

const AuthCookie = require('./auth/cookieAuth');
const bearerValidation = require('./auth/bearerValidation');
const cookieValidation = require('./auth/cookieValidation');

const Routes = require('./routes');

const OpenAPI = {
    plugin: HapiSwagger,
    options: {
        info: {
            title: 'Datawrapper API v3 Documentation',
            version: pkg.version,
            'x-info': process.env.DEV
                ? {
                      node: process.version,
                      hapi: pkg.dependencies.hapi
                  }
                : undefined
        },
        documentationPage: false,
        swaggerUI: false
    }
};

const server = Hapi.server({
    port: 3000,
    host: 'localhost'
});

async function init() {
    await server.register({
        plugin: require('hapi-pino'),
        options: {
            prettyPrint: process.env.DEV,
            logEvents: ['request', 'onPostStart']
        }
    });

    await server.register([AuthCookie, AuthBearer]);

    server.auth.strategy('simple', 'bearer-access-token', {
        validate: bearerValidation
    });

    server.auth.strategy('session', 'cookie-auth', {
        validate: cookieValidation
    });

    server.auth.default('simple');

    await server.register([OpenAPI, Routes]);

    await server.start();
}

process.on('unhandledRejection', err => {
    console.error(err);
    process.exit(1);
});

init();
