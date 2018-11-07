const Router = require('../');

Router
.setActionBeforeRoute(function() {
})
.setActionAfterRoute(function() {
});

const handler = Router.setupLambdaHandler();

describe('handle route async error', () => {

    test('GET /me returns an error', done => {
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

        Router.get('/me', function(request, reply, next) {
            return new Promise((resolve, reject) => {
                reject('an error occurred');
            })
            .catch(err => {
                throw err;
            })
        });

        const callback = function(err, resp) {
            expect(err).toBeDefined();
            expect(err).toEqual("{\"httpStatus\":500,\"message\":\"an error occurred\"}");

            done();
        };

        handler(event, context, callback);
    });
});


describe('route responds with error to next', () => {

    test('GET /me returns an error', done => {
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

        Router.get('/me', function(request, reply, next) {
            next('an error occurred');
        });

        const callback = function(err, resp) {
            expect(err).toBeDefined();
            expect(err).toEqual("{\"httpStatus\":500,\"message\":\"an error occurred\"}");

            done();
        };

        handler(event, context, callback);
    });
});
