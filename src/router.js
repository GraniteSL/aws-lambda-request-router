const Router = {
    routes: {},
    middleware: [],

    beforeRoute: null,
    afterRoute: null,

    setActionBeforeRoute: function(handler) {
        this.beforeRoute = handler;
        return this;
    },

    setActionAfterRoute: function(handler) {
        this.afterRoute = handler;
        return this;
    },

    use: function(fn) {
        this.middleware.push(fn);
    },

    runHandlerWithMiddleware: function(request, response, routeMiddleware, handler) {

        const handlerWrapper = function(req, res, next) {
            // capture async errors (handler must return promise)
            Promise.resolve(handler.call(this, req, res, next))
            .catch(err => {
                next(err);
            });
        }

        const middleware = this.middleware.slice().concat(routeMiddleware);
        middleware.push(handlerWrapper);

        const middlewareReducer = (next, fn) => {
            return (error) => {
                if (error) {
                    response(500, error.message);
                    return;
                }

                if (fn.length < 3) {
                    next(fn.call(this, request, response));
                    return;
                }

                fn.call(this, request, response, next);
            };
        };

        const finalErrorHandler = (error, req, res) => {
            if (error) {
                if (error instanceof Error) {
                    response(500, error.message);
                    return;
                }

                response(500, error);
                return;
            }

            response(500, 'Internal Server Error');
        };

        // middleware will call functions with next which will hit the bottom
        // of the stack (the finalErrorHandler which is the beginning in the acc)
        middleware.reverse().reduce(middlewareReducer, finalErrorHandler)();
    },

    buildRouteKey: function(httpMethod, path) {
        return (`${httpMethod}:${path}`).toLowerCase();
    },
    add: function(httpMethod, path, ...middleware) {
        if (middleware.length === 0) {
            throw new Error('Route must have one handler');
        }

        const routeKey = this.buildRouteKey(httpMethod, path);
        const handler = middleware.pop();

        this.routes[routeKey] = Object.assign({
            httpMethod,
            path,
            middleware,
            handler,
        });

        return this;
    },
    post: function(path, ...middleware) {
        return this.add('POST', path, ...middleware);
    },
    get: function(path, ...middleware) {
        return this.add('GET', path, ...middleware);
    },
    put: function(path, ...middleware) {
        return this.add('PUT', path, ...middleware);
    },
    delete: function(path, ...middleware) {
        return this.add('DELETE', path, ...middleware);
    },

    handle: function(httpMethod, path, cognito, request, body, context, callback) {
        const routeKey = this.buildRouteKey(httpMethod, path);

        const beforeRoute = this.beforeRoute;
        if (beforeRoute && typeof beforeRoute === 'function') {
            beforeRoute();
        }

        const errorHandler = (error, response) => {
            const errorResponse = JSON.stringify({
                httpStatus: 500,
                typeMessage: 'Internal Server Error',
                message: error instanceof Error?error.message:'An error occurred.',
            });

            return callback(errorResponse, null);
        };

        const finalize = (error = null, response) => {
            const afterRoute = this.afterRoute;
            if (afterRoute && typeof afterRoute === 'function') {
                afterRoute();
            }

            if (error) {
                return errorHandler(error, response);
            }

            if (!response.hasOwnProperty('statusCode') || !response.hasOwnProperty('payload')) {
                throw new Error('Must send statusCode and payload to finalize handler.');
            }

            if (typeof(response.statusCode) !== 'number') {
                throw new Error('Response Status Code must be a number.');
            }

            if (response.statusCode < 0 || response.statusCode > 1000) {
                throw new Error(`Response Status Code must be between 0 and 1000. (${response.statusCode})`);
            }

            if (response.statusCode >= 400) {
                if (typeof(response.payload) !== 'string') {
                    throw new Error('Must set payload as string for status code is >= 400.')
                }

                return callback(JSON.stringify({
                    httpStatus: response.statusCode,
                    message: response.payload,
                }), null);
            }

            return callback(null, response.payload);
        };


        const reply = (statusCode, payload) => {
            return finalize(null, {
                statusCode,
                payload,
            });
        };

        const routeInfo = this.routes[routeKey];
        if (!routeInfo) {
            const error = new Error('No Route Found');
            return finalize(error, null);
        }

        if (!httpMethod || !path) {
            const error = new Error('Unable to route with empty Method or Path');
            return finalize(error, null);
        }

        const routeHandler = routeInfo.handler;
        const routeMiddleware = routeInfo.middleware;

        try {
            request = Object.assign({}, request, {
                cognito,
                body,
                context
            });

            return this.runHandlerWithMiddleware(request, reply, routeMiddleware, routeHandler);
        }
        catch (reason) {
            return errorHandler(reason, null);
        }
    },

    setupLambdaHandler: function() {
        return (event, context, callback) => {
            // console.log('LAMBDA EVENT:', event);
            // console.log('LAMBDA CONTEXT:', context);

            if (event.type && event.type === 'warming') {
                return callback(null, {});
            }

            const missingRoutingInfo = !event.apiContext || !event.apiContext['http-method']
                || !event.apiContext['resource-path'];

            if (missingRoutingInfo) {
                callback(JSON.stringify({
                    httpStatus: 500,
                    typeMessage: 'Internal Server Error',
                    message: 'Routing Information is missing in Lambda event.',
                }));

                return;
            }

            return this.handle(
                event.apiContext['http-method'],
                event.apiContext['resource-path'],
                event.apiContext.cognito,
                event.request,
                event.body,
                context,
                callback
            );
        };
    },
}

module.exports = Router;
