const server = require('../index.js');
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const Promise = require('bluebird');

var routeScript = `
module.exports.init = (app) =>
{
    app.get('/hello', (req, res) => res.send('world!'));
    app.get('/error', (req, res) => { throw new Error('Gone!'); });

    return require('bluebird').resolve();
}
`;

describe('Main', () =>
{
    describe('#init()', () =>
    {
        var complexRequestOptions = {
            host : 'localhost',
            port : 3000,
            path : '/',
            headers : { 'X-Text-Header' : 'Hello!' }
        };

        var testMain = () => new Promise((resolve, reject) => http.get(complexRequestOptions, (res) => res.on('data', (buffer) => resolve(buffer.toString()))));
        var testHello = () => new Promise((resolve, reject) => http.get('http://localhost:3000/hello', (res) => res.on('data', (buffer) => resolve(buffer.toString()))));
        var testStatic = () => new Promise((resolve, reject) => http.get('http://localhost:3000/static/test.css', (res) => res.on('data', (buffer) => resolve(buffer.toString()))));
        var testError = () => new Promise((resolve, reject) => http.get('http://localhost:3000/error', (res) => res.on('data', (buffer) => resolve(buffer.toString()))));

        var removeRoutes = () => fs.existsSync('routes') && (fs.unlinkSync('routes/index.js') | fs.rmdirSync('routes'));

        removeRoutes();

        fs.mkdirSync('routes');
        fs.writeFileSync('routes/index.js', routeScript);

        it('Basic routing test', (done) =>
        {
            var httpResult1;
            var httpResult2;
            var httpResult3;
            var httpResult4;

            var errorData = fs.readFileSync('./errorData.json', 'utf8');

            var app = server.init({
                serviceClient : {
                    injectIntoRequest : false
                },
                routes : {
                    modulePaths : './routes'
                },
                server : {
                    mode : server.Server.Mode.Dev,
                    security : server.Server.Security.AllowCrossOrigin,
                    staticFilePath : './static',
                    indexFilePath : process.cwd() + '/static/test.css',
                    events : {
                        onStart : () =>
                        {
                            testMain().then(res => httpResult1 = res)
                            .then(testHello).then(res => httpResult2 = res)
                            .then(testStatic).then(res => httpResult3 = res)
                            .then(testError).then(res => httpResult4 = res)
                            .finally(() => server.end());
                        },
                        onEnd : () =>
                        {
                            assert.equal(httpResult1.trim(), 'Empty');
                            assert.equal(httpResult2, 'world!');
                            assert.equal(httpResult3.trim(), 'Empty');
                            assert.equal(httpResult4, errorData);
                            removeRoutes();
                            done();
                        }
                    },
                    webpack : {
                        useWebpack : true,
                        configFilePath : process.cwd() + '/webpack.config.js'
                    }
                }
            });

            assert.equal('object', typeof app);
            assert.equal('function', typeof app.then);
            app.then((app) => assert.equal('function', typeof app));
        });

        it('Basic routing test extra middleware', (done) =>
        {
            var httpResult1;
            var httpResult2;
            var httpResult3;
            var middlewareResult;

            var app = server.init({
                serviceClient : {
                    injectIntoRequest : true
                },
                routes : {
                    modulePaths : [ './routes' ]
                },
                server : {
                    mode : server.Server.Mode.Dev,
                    security : server.Server.Security.AllowCrossOrigin,
                    staticFilePath : './static',
                    indexFilePath : process.cwd() + '/static/test.css',
                    events : {
                        onStart : () =>
                        {
                            testMain().then(res => httpResult1 = res)
                            .then(testHello).then(res => httpResult2 = res)
                            .then(testStatic).then(res => httpResult3 = res)
                            .finally(() => server.end())
                        },
                        onEnd : () => assert.equal(httpResult1.trim(), 'Empty') | assert.equal(httpResult2, 'world!') | assert.equal(httpResult3.trim(), 'Empty') | assert.equal(middlewareResult, true) | removeRoutes() | done()
                    },
                    webpack : {
                        useWebpack : true,
                        configFilePath : process.cwd() + '/webpack.config.js'
                    },
                    middlewares : [ (req, res, next) => { middlewareResult = true; next() } ]
                }
            });

            assert.equal('object', typeof app);
            assert.equal('function', typeof app.then);
            app.then((app) => assert.equal('function', typeof app));
        });

        it('Basic routing test productive mode', (done) =>
        {
            var httpResult1;
            var httpResult2;

            var app = server.init({
                serviceClient : {
                    injectIntoRequest : true
                },
                routes : {
                    modulePaths : './routes'
                },
                server : {
                    mode : server.Server.Mode.Productive,
                    events : {
                        onStart : () =>
                        {
                            testHello().then(res => httpResult1 = res)
                            .then(testStatic).then(res => httpResult2 = res)
                            .finally(() => server.end())
                        },
                        onEnd : () => assert.equal(httpResult1, 'world!') | assert.equal(httpResult2.trim(), 'Empty') | removeRoutes() | done()
                    },
                    webpack : {
                        useWebpack : true,
                        configFilePath : process.cwd() + '/webpack.config.js'
                    },
                    middlewares : null,
                    indexFilePath : process.cwd() + '/static/test.css',
                }
            });

            assert.equal('object', typeof app);
            assert.equal('function', typeof app.then);
            app.then((app) => assert.equal('function', typeof app));
        });

        it('Creating an error', (done) =>
        {
            var app = server.init({
                routes : {
                    addRoutes : false
                },
                server : {
                    hostname : '1.2.3.4',
                    port : 80,
                    mode : server.Server.Mode.Dev,
                    events : {
                        onEnd : () =>  done()
                    },
                    webpack : {
                        useWebpack : false
                    }
                }
            });
        });

        it('Health check', (done) =>
        {
            var testHealth = (onResult) => http.get('http://localhost:3000/api/health/check', (res) => res.on('data', (buffer) => onResult(buffer.toString())));
            var result;

            var app = server.init({
                routes : {
                    addRoutes : false
                },
                server : {
                    mode : server.Server.Mode.Dev,
                    events : {
                        onStart : () => { testHealth((res) => { result = res; server.end(); }); },
                        onEnd : () =>  { assert.equal(result, '{"message":"Yes, I\'m alive!"}'); done(); }
                    },
                    webpack : {
                        useWebpack : false
                    }
                }
            });
        });

        it('Ending not Initialized server', (done) =>
        {
            server.end();
            done();
        });
    });
});
