module.exports = {
    name: 'routes',
    version: '1.0.0',
    register: (server, options) => {
        server.register(require('./users'), {
            routes: {
                prefix: '/users'
            }
        });

        server.register(require('./me'), {
            routes: {
                prefix: '/me'
            }
        });

        server.register(require('./auth'), {
            routes: {
                prefix: '/auth'
            }
        });

        server.register(require('./charts'), {
            routes: {
                prefix: '/charts'
            }
        });
    }
};
