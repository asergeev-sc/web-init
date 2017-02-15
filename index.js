const express = require('express');
const webpack = require('webpack');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const extend = require('extend');
const fs = require('fs');

// -- Enums -> ----------------------------------------------------------------------------
module.exports.Server = {
    Mode : { None : 0, Productive : 1, Dev : 2, Debug : 3 },
    Security : { All : 0, AllowCrossOrigin : 1 } // Bitword
}

module.exports.Morgan = {
    Format : { Combined : 'combined', Common : 'common', Dev : 'dev', Short : 'short', Tiny : 'tiny', Custom : (callback) => callback },
    OutputStream : { StdOut : process.stdout, StdErr : process.stderr, Console : { write : console.log }, Custom : (callback) => { write : callback } }
}
// -- <- Enums  ---------------------------------------------------------------------------

// -- Config -> ----------------------------------------------------------------------------
module.exports.DefaultConfig = {
    server : {
        mode : this.Server.Mode.Productive,
        security : this.Server.Security.All,
        crossOrigins : [ '*' ],
        maxBodySize : 1048576, // 1 MiB
        staticFilePath : express.static(__dirname + '/static'),
        hostname : '0.0.0.0',
        port : process.env.PORT || 3000,
        events : {
            onStart : function(server) { },
            onEnd : function(server) { },
            onRequest : function(req, res, next) { next(); },
            onError : function(err, server) { process.stderr.write(err); }
        },
        webpack : {
            useWebpack : false,
            configFilePath : './webpack.conf'
        }
    },
    routes : {
        addRoutes : true,
        modulePaths : [ fs.realpathSync('./src/server/routes') ],
        dbInstance : null
    },
    morgan : {
        format : this.Morgan.Format.Dev,
        stream : this.Morgan.OutputStream.Console
    }
}
// -- <- Config ----------------------------------------------------------------------------

module.exports.init = function(config) {

    this.config = config = extend(true, { }, this.DefaultConfig, config);

    var app = express();

    app.use(helmet());
    app.use(cookieParser());
    app.use(bodyParser.json({ limit : config.server.maxBodySize }));
    app.use(bodyParser.urlencoded({ extended: false, limit : config.server.maxBodySize }));

    if(config.server.security & this.Server.Security.AllowCrossOrigin)
    {
        app.use((req, res, next) =>
        {
        	res.header('Access-Control-Allow-Origin', config.server.crossOrigins.join(' ')); // TODO: Only trusted hosts.
        	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Vary', 'Origin');

        	next();
        });
    }

    if(config.server.mode === this.Server.Mode.Productive)
    {
        app.use('/static', config.server.staticFilePath);
    }
    else
    {
        app.use(morgan(config.morgan.format, config.morgan.stream));

        if(config.server.webpack.useWebpack)
        {
            const webpackMiddleware = require('webpack-dev-middleware');
            const webpackCompiler = webpack(require(config.server.webpack.configFilePath));

            app.use(webpackMiddleware(webpackCompiler,
            {
                publicPath: config.server.staticFilePath,
                stats: { colors: true, chunks: false },
                noInfo: true
            }));
        }
    }

    app.use(config.server.events.onRequest);

    if(config.routes.addRoutes === true)
    {
        ((paths, db, config) => Array.isArray(paths) ? paths.forEach(path => require(path).init(app, db, config))
            : [ require(paths).init(app, db, config) ])(config.routes.modulePaths, config.routes.dbInstance, config.routes);
    }

    var self = this;

    var onServerListen = (err) => err ? config.server.events.onError.call(self, err, app) : config.server.events.onStart.call(self, app);
    var onServerEnd = () => config.server.events.onEnd.call(self, app);

    var server = app.listen(config.server.port, config.server.hostname, onServerListen);
    this.server = server;

    process.on('SIGTERM', () => server.close(onServerEnd));
    process.on('SIGINT', () => server.close(onServerEnd));

    return app;
}

module.exports.end = function()
{
    if(this.server)
        this.server.close(onServerEnd);
}
