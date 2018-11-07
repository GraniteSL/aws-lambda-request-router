const Router = require('../');

Router
.setActionBeforeRoute(function() {
})
.setActionAfterRoute(function() {
});


const handler = Router.setupLambdaHandler();

describe('async middleware with custom middleware after test', () => {

    beforeAll(() => {
        Router.use((req, res, next) => {
            setTimeout(() => {
                req.user = {
                    id: 1,
                    name: 'test'
                };
                next();
            }, 3000);
        });
    });

    afterAll(() => {
        Router.middlewares = [];
        router.routes = {};
    });

    test('GET /me returns valid response', done => {
        const event = {
            request: {},
            apiContext: {
                cognito: {
                    userSubId: '12345',
                },
                'http-method': 'GET',
                'resource-path': '/me'
                },
            body: {}
        };

        const context = {
            awsRequestId: 'generic-id',
        };

        const callback = function() {}

        Router.get('/me', function(req, res, next) {
            req.user.id = 2;
            next();
        }, function(request, reply) {

            expect(request).toBeDefined();
            expect(request.user).toBeDefined();
            expect(request.user).toEqual({
                id: 2,
                name: 'test',
            });

            done();
        });

        handler(event, context, callback);
    });
});


describe('async middleware test with two custom route middlewares', () => {

    beforeAll(() => {
        Router.use((req, res, next) => {
            req.user = {
                id: 1,
                name: 'test'
            };
            next();
        });
    });

    afterAll(() => {
        Router.middlewares = [];
        router.routes = {};
    });

    test('GET /me returns valid response', done => {
        const event = {
            request: {},
            apiContext: {
                cognito: {
                    userSubId: '12345',
                },
                'http-method': 'GET',
                'resource-path': '/me'
                },
            body: {}
        };

        const context = {
            awsRequestId: 'generic-id',
        };

        const callback = function() {}

        Router.get('/me', function(req, res, next) {
            req.user.id = 2;
            next();
        }, function(req, res, next) {
            req.user.id = 3;
            next();
        }, function(request, reply) {

            expect(request).toBeDefined();
            expect(request.user).toBeDefined();
            expect(request.user).toEqual({
                id: 3,
                name: 'test',
            });

            done();
        });

        handler(event, context, callback);
    });
});
