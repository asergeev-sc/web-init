const server = require('../index.js');
const assert = require('assert');
const fs = require('fs');
const http = require('http');

var routeScript = "module.exports.init = (app) => { app.get('/hello', (req, res) => res.send('world!')) }";

describe('Main', () =>
{
    describe('#init()', () =>
    {
        fs.mkdirSync('routes');
        fs.writeFile('routes/index.js', routeScript);

        var testHttp = (onResult) => http.get('http://localhost:3000/hello', (res) => res.on('data', (buffer) => onResult(buffer.toString())));

        it('Basic routing test', (done) =>
        {
            var httpResult;

            var app = server.init({
                routes : {
                    modulePaths : './routes'
                },
                server : {
                    mode : server.Server.Mode.Dev,
                    security : server.Server.Security.AllowCrossOrigin,
                    events : {
                        onStart : () => testHttp((res) => { httpResult = res; server.end(); }),
                        onEnd: () => assert.equal('world!', httpResult) | done()
                    },
                    webpack : {
                        useWebpack : false
                    }
                }
            });

            assert(typeof app === 'function');
        });


    });
});
