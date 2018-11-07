const Router = require('../');

Router
.setActionBeforeRoute(function() {
})
.setActionAfterRoute(function() {
})
.get('/me', function(request, reply) {
    reply(200, {
        something: 'happened',
    })
})
.get('/users/rob', function(request, reply) {
    reply(404, 'User not found');
})
.get('/users/cellaflora', function(request, reply) {
    if (missingVar) {
        reply(404, 'Payload');
    }

    reply(200, {
        value: '200',
    });
})
.get('/response/-100', function(request, reply) {
    reply(-100, null);
})
.get('/response/error', function(request, reply) {
    reply(400, 'Bad Request Error');
})
.get('/response/error/invalid', function(request, reply) {
    reply(400, {
        error: 'something',
    });
});


const handler = Router.setupLambdaHandler();

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

    const callback = function(error, response) {
       expect(response).toEqual({
           something: 'happened',
       });

       done();
    }

    handler(event, context, callback);
});

test('GET /users/rob returns null response and error if handler rejects', done => {
    const event = {
        request: {},
        apiContext: {
            cognito: {
                userSubId: '12345',
            },
            'http-method': 'GET',
            'resource-path': '/users/rob'
            },
        body: {}
    };

    const context = {
        awsRequestId: 'generic-id',
    };

    const callback = function(error, response) {
        expect(error).toEqual('{\"httpStatus\":404,\"message\":\"User not found\"}');
        expect(response).toBeNull();

        done();
    }

    handler(event, context, callback);
});

test('GET /users/cellaflora returns null with handler error', done => {
    const event = {
        request: {},
        apiContext: {
            cognito: {
                userSubId: '12345',
            },
            'http-method': 'GET',
            'resource-path': '/users/cellaflora'
            },
        body: {}
    };

    const context = {
        awsRequestId: 'generic-id',
    };

    const callback = function(error, response) {
        expect(error).toEqual('{\"httpStatus\":500,\"typeMessage\":\"Internal Server Error\",\"message\":\"missingVar is not defined\"}');
        expect(response).toBeNull();

        done();
    }

    handler(event, context, callback);
});

test('GET /response/-100 returns error', done => {
    const event = {
        request: {},
        apiContext: {
            cognito: {
                userSubId: '12345',
            },
            'http-method': 'GET',
            'resource-path': '/response/-100'
            },
        body: {}
    };

    const context = {
        awsRequestId: 'generic-id',
    };

    const callback = function(error, response) {
        expect(error).toEqual("{\"httpStatus\":500,\"typeMessage\":\"Internal Server Error\",\"message\":\"Response Status Code must be between 0 and 1000. (-100)\"}")
        expect(response).toBeNull();

        done();
    }

    handler(event, context, callback);
});

test('GET /response/error returns valid json response', done => {
    const event = {
        request: {},
        apiContext: {
            cognito: {
                userSubId: '12345',
            },
            'http-method': 'GET',
            'resource-path': '/response/error'
            },
        body: {}
    };

    const context = {
        awsRequestId: 'generic-id',
    };

    const callback = function(error, response) {
        expect(error).toEqual("{\"httpStatus\":400,\"message\":\"Bad Request Error\"}")
        expect(response).toBeNull();

        done();
    }

    handler(event, context, callback);
});

test('GET /response/invalid returns error regarding payload value', done => {
    const event = {
        request: {},
        apiContext: {
            cognito: {
                userSubId: '12345',
            },
            'http-method': 'GET',
            'resource-path': '/response/error/invalid'
            },
        body: {}
    };

    const context = {
        awsRequestId: 'generic-id',
    };

    const callback = function(error, response) {
        expect(error).toEqual("{\"httpStatus\":500,\"typeMessage\":\"Internal Server Error\",\"message\":\"Must set payload as string for status code is >= 400.\"}")
        expect(response).toBeNull();

        done();
    }

    handler(event, context, callback);
});
