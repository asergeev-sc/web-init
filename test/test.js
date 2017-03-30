const server = require('../index.js');
const assert = require('assert');
const fs = require('fs');
const http = require('http');

var routeScript = "module.exports.init = (app) => { app.get('/hello', (req, res) => res.send('world!')); return require('bluebird').resolve() }";

describe('Main', () =>
{
    describe('#init()', () =>
    {
        var removeRoutes = () => fs.existsSync('routes') && (fs.unlinkSync('routes/index.js') | fs.rmdirSync('routes'));
        var testHttp = (onResult) => http.get('http://localhost:3000/hello', (res) => res.on('data', (buffer) => onResult(buffer.toString())));
        var testStatic = (onResult) => http.get('http://localhost:3000/static/test.css', (res) => res.on('data', (buffer) => onResult(buffer.toString())));

        removeRoutes();

        fs.mkdirSync('routes');
        fs.writeFile('routes/index.js', routeScript);

        it('Basic routing test', (done) =>
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
                    mode : server.Server.Mode.Dev,
                    security : server.Server.Security.AllowCrossOrigin,
                    staticFilePath : './static',
                    events : {
                        onStart : () => testHttp((res) => { httpResult1 = res; testStatic((res) => { httpResult2 = res; server.end();}) }),
                        onEnd : () => assert.equal(httpResult1, 'world!') | assert.equal(httpResult2.trim(), 'Empty') | removeRoutes() | done()
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
                        onStart : () => testHttp((res) => { httpResult1 = res; testStatic((res) => { httpResult2 = res; server.end();}) }),
                        onEnd : () => assert.equal(httpResult1, 'world!') | assert.equal(httpResult2.trim(), 'Empty') | removeRoutes() | done()
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

        it('Creating an error', (done) =>
        {
            var httpResult1;
            var httpResult2;

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
    });
});
