const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const extend = require('extend');
const logger = require('winston');
const Promise = require('bluebird');
const ServiceClient = require('ocbesbn-service-client');

/**
 * Module for general and common initialization of the OpusCapita Business Network
 * web server module providing default behavior for RESTful services.
 * @module ocbesbn-web-init
 * @requires express
 * @requires webpack
 * @requires body-parser
 * @requires cookie-parser
 * @requires helmet
 * @requires morgan
 * @requires extend
 * @requires winston
 * @requires bluebird
 * @requires ocbesbn-service-client
 */

/**
 * Static object containing enumeration objects providing server behavior configuration.
 */
module.exports.Server = {
    /**
     * Enumeration made to control a server's environment behavior.
     * @enum {number}
     */
    Mode : { None : 0, Productive : 1, Dev : 2, Debug : 3 },

    /**
     * List of flags for security configuration.
     * @enum {number}
     */
    Security : { All : 0, AllowCrossOrigin : 1 } // Bitword
}

/**
 * Static object containing enumeration objects providing behavior for Morgan logging.
 */
module.exports.Morgan = {
    /**
     * Enumeration for preselected Morgan logging styles.
     * @enum {string}
     */
    Format : { Combined : 'combined', Common : 'common', Dev : 'dev', Short : 'short', Tiny : 'tiny', Custom : (callback) => callback },

    /**
     * Enumeration provising some standard Morgan output streams.
     * @enum {Stream}
     */
    OutputStream : { StdOut : process.stdout, StdErr : process.stderr, Console : { write : console.log }, Custom : (callback) => { write : callback } }
}

/**
 * Static object representing a default configuration set for ocbesbn-web-init. Have a look at the [actual values]{@link DefaultConfig}.
 *
 * @property {object} server - All server web server related settings.
 * @property {Server.Mode} server.mode - Environment [mode]{@link module:ocbesbn-web-init.Server.Mode} to run in.
 * @property {Server.Security} server.security - Bitword for applying multiple [security]{@link module:ocbesbn-web-init.Server.Security} presets.
 * @property {array} server.crossOrigins - A list of allowed cross-origins source domains.
 * @property {number} server.maxBodySize - Maximum size in bytes of a http-reuqest-body.
 * @property {string} server.staticFilePath - Path for all static files delivered by the web server.
 * @property {string} server.hostname - The local host name or ip-address to bind the server to.
 * @property {number} server.port - The local tcp port for the server to listen on.
 * @property {object} server.events - Object providing access points to some life cycle events.
 * @property {function} server.events.onStart - Start event fired when successfully listens for incoming connections.
 * @property {function} server.events.onEnd - End event fired whenever the server shuts down.
 * @property {function} server.events.onRequest - Fired every time, a request comes in.
 * @property {function} server.events.onError - Fired if the server could not start.
 * @property {object} server.webpack - Webpack configuration.
 * @property {boolean} server.webpack.useWebpack - Controls whenever the server should use Webpack.
 * @property {boolean} server.webpack.configFilePath - Webpack configuration file path.
 * @property {object} serviceClient - Configuration for injecting a [ServiceClient]{@link https://github.com/OpusCapitaBusinessNetwork/service-client} instance into every request.
 * @property {boolean} serviceClient.injectIntoRequest - Whenever to active ServiceClient-injection.
 * @property {boolean} serviceClient.consul - Configuration options for service discovery done by the ServiceClient.
 * @property {boolean} serviceClient.consul.host - Hostname for a Consul service discovery server.
 * @property {object} routes - Basic routing configuration for the RESTful web server.
 * @property {boolean} routes.addRoutes - Controls whenever routes should be added to be accessible via http.
 * @property {array} routes.modelPaths - List of modules to load in order to register wev server routes.
 * @property {object} routes.dbInstance - Databse object to be passed to every module registering routes.
 * @property {object} morgan - Basic morgan logging configuration.
 * @property {Morgan.Format} morgan.format - Morgan [log format]{@link module:ocbesbn-web-init.Morgan.Format}.
 * @property {Morgan.OutputStream} morgan.stream - Morgan output [stream]{@link module:ocbesbn-web-init.Morgan.OutputStream}.
 */
module.exports.DefaultConfig = {
    server : {
        mode : process.env.NODE_ENV === 'development' ? this.Server.Mode.Dev : this.Server.Mode.Productive,
        security : this.Server.Security.All,
        crossOrigins : [ '*' ],
        maxBodySize : 1048576, // 1 MiB
        staticFilePath : express.static(__dirname + '/static'),
        hostname : process.env.HOST || '0.0.0.0',
        port : process.env.PORT || 3000,
        events : {
            onStart : function(server) { },
            onEnd : function(server) { },
            onRequest : function(req, res, next) { next(); },
            onError : function(err, server) { process.stderr.write(err); }
        },
        webpack : {
            useWebpack : false,
            configFilePath : process.cwd() + '/webpack.conf'
        }
    },
    serviceClient : {
        injectIntoRequest : false,
        consul : {
            host : 'localhost'
        }
    },
    routes : {
        addRoutes : true,
        modulePaths : [ process.cwd() + '/src/server/routes' ],
        dbInstance : null
    },
    morgan : {
        format : this.Morgan.Format.Dev,
        stream : this.Morgan.OutputStream.Console
    }
}

/**
 * Initializes an instance of ocbesbn-web-init by passing a set of optional configuration values.
 * This method also registeres the process signals SIGTERM and SIGINT and runs a clean shutdown on the server.
 *
 * @param {object} config - Optional configuration object extending {@link module:ocbesbn-web-init.DefaultConfig}.
 * @returns {Promise} [Promise]{@link http://bluebirdjs.com/docs/api-reference.html} containing an [Express]{@link https://github.com/expressjs/express} instance.
 */
module.exports.init = function(config) {

    this.config = config = extend(true, { }, this.DefaultConfig, config);
    logger.level = config.server.mode === this.Server.Mode.Dev ? 'debug' : 'info';

    logger.log('info', 'Starting up web server... Host: %s, Port: %s', config.server.hostname, config.server.port);

    var app = express();
    this.app = app;

    app.use(helmet());
    app.use(cookieParser());
    app.use(bodyParser.json({ limit : config.server.maxBodySize }));
    app.use(bodyParser.urlencoded({ extended: false, limit : config.server.maxBodySize }));

    if(config.serviceClient.injectIntoRequest === true)
    {
        app.use((req, res, next) =>
        {
            req.serviceClient = new ServiceClient(config.serviceClient);
            req.serviceClient.contextify({ headers : req.headers });

            next();
        });
    }

    if(config.server.security & this.Server.Security.AllowCrossOrigin)
    {
        logger.log('debug', 'Allowing cross origin requests for: %j', config.server.crossOrigins);

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
        logger.log('debug', 'Using morgan and webpack.');

        app.use(morgan(config.morgan.format, config.morgan.stream));

        if(config.server.webpack.useWebpack)
        {
            const webpack = require('webpack');
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
        logger.log('debug', 'Adding routes...');

        var inits = ((paths, db, config) => Array.isArray(paths) ? paths.map(path => require(path).init(app, db, config))
            : [ require(paths).init(app, db, config) ])(config.routes.modulePaths, config.routes.dbInstance, config.routes);

        Promise.all(inits).reflect();
    }

    var self = this;

    var onServerListen = (err) => err ? config.server.events.onError.call(self, err, app) : config.server.events.onStart.call(self, app);
    var onServerEnd = () => config.server.events.onEnd.call(self, app);

    var server = app.listen(config.server.port, config.server.hostname, onServerListen);
    this.server = server;

    process.on('SIGTERM', () => server.close(onServerEnd));
    process.on('SIGINT', () => server.close(onServerEnd));

    logger.log('info', 'Server started.');

    return Promise.resolve(app);
}

/**
 * Ends an initialized instance of ocbesbn-web-init.
 */
module.exports.end = function()
{
    var self = this;

    if(this.server)
        this.server.close(() => self.config.server.events.onEnd.call(self, self.app));
}
