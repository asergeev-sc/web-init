const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const extend = require('extend');
const Logger = require('ocbesbn-logger');
const Promise = require('bluebird');
const accetLanguageParser = require('accept-language-parser');
const ServiceClient = require('ocbesbn-service-client');
const userIdentityMiddleware = require('useridentity-middleware');
const cwd = process.cwd();

/**
 * Module for general and common initialization of the OpusCapita Business Network
 * web server module providing default behavior for RESTful services.
 * @module ocbesbn-w©eb-init
 * @requires express
 * @requires webpack
 * @requires body-parser
 * @requires cookie-parser
 * @requires helmet
 * @requires extend
 * @requires winston
 * @requires bluebird
 * @requires ocbesbn-service-client
 * @requires useridentity-middleware
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
 * Contains the name of the current service this module is running in. It simply takes the last directory
 * name of the main processes path.
 */
module.exports.serviceName = cwd.slice(cwd.lastIndexOf('/') + 1);

/**
 * Static object representing a default configuration set for ocbesbn-web-init. Have a look at the [actual values]{@link DefaultConfig}.
 *
 * @property {object} server - All server web server related settings.
 * @property {Server.Mode} server.mode - Environment [mode]{@link module:ocbesbn-web-init.Server.Mode} to run in.
 * @property {Server.Security} server.security - Bitword for applying multiple [security]{@link module:ocbesbn-web-init.Server.Security} presets.
 * @property {array} server.crossOrigins - A list of allowed cross-origins source domains.
 * @property {number} server.maxBodySize - Maximum size in bytes of a http-reuqest-body.
 * @property {string} server.staticFilePath - Path for all static files delivered by the web server.
 * @property {string} server.indexFilePath - Path of a file delivered by the web server on client requests to /.
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
 * @property {array} server.middlewares - Array of additional middleware objects to be used with the express web server.
 * @property {object} serviceClient - Configuration for injecting a [ServiceClient]{@link https://github.com/OpusCapitaBusinessNetwork/service-client} instance into every request.
 * @property {boolean} serviceClient.injectIntoRequest - Whenever to active ServiceClient-injection.
 * @property {boolean} serviceClient.consul - Configuration options for service discovery done by the ServiceClient.
 * @property {boolean} serviceClient.consul.host - Hostname for a Consul service discovery server.
 * @property {object} serviceClient.caching - Configuration options for service-client request caching.
 * @property {string} serviceClient.caching.driver - Cache driver to use.
 * @property {number} serviceClient.caching.defaultExpire - Global cache entry expiration time in seconds.
 * @property {array} serviceClient.headersToProxy - List of source headers to be copied to the context of a [ServiceClient]{@link https://github.com/OpusCapitaBusinessNetwork/service-client} instance. Headers starting with X- are always added.
 * @property {object} routes - Basic routing configuration for the RESTful web server.
 * @property {boolean} routes.addRoutes - Controls whenever routes should be added to be accessible via http.
 * @property {array} routes.modelPaths - List of modules to load in order to register wev server routes.
 * @property {object} routes.dbInstance - Databse object to be passed to every module registering routes.
 */
module.exports.DefaultConfig = {
    server : {
        mode : process.env.NODE_ENV === 'development' ? this.Server.Mode.Dev : this.Server.Mode.Productive,
        security : this.Server.Security.All,
        crossOrigins : [ '*' ],
        maxBodySize : 1048576, // 1 MiB
        staticFilePath : express.static(__dirname + '/static'),
        indexFilePath : null,
        hostname : process.env.HOST || '0.0.0.0',
        port : process.env.PORT || 3000,
        events : {
            onStart : function(server) { },
            onEnd : function(server) { },
            onRequest : function(req, res, next) { next(); },
            onError : function(err, server) { process.stderr.write(JSON.stringify(err)); }
        },
        webpack : {
            useWebpack : false,
            configFilePath : process.cwd() + '/webpack.conf.js'
        },
        middlewares : [ ]
    },
    logger : new Logger({ context : { serviceName : module.exports.serviceName } }),
    serviceClient : {
        injectIntoRequest : true,
        consul : {
            host : 'consul'
        },
        caching : {
            driver : 'dummy',
            defaultExpire : 600
        },
        headersToProxy : [ 'Cookie', 'Authorization', 'From' ]
    },
    routes : {
        addRoutes : true,
        modulePaths : [ process.cwd() + '/src/server/routes' ],
        dbInstance : null
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
    config.serviceClient.headersToProxy = config.serviceClient.headersToProxy.map(item => item.toLowerCase());

    var logger = config.logger;

    logger.info('Starting up web server... Host: %s, Port: %s', config.server.hostname, config.server.port);

    if(typeof config.server.staticFilePath === 'string')
        config.server.staticFilePath = express.static(config.server.staticFilePath);

    var app = express();
    this.app = app;

    app.use(helmet());
    app.use(cookieParser());
    app.use(bodyParser.json({ limit : config.server.maxBodySize }));
    app.use(bodyParser.urlencoded({ extended: false, limit : config.server.maxBodySize }));
    app.use((req, res, next) => { req.opuscapita = req.opuscapita || { }; next(); })
    app.use(userIdentityMiddleware);
    app.use((req, res, next) =>
    {
        var languages = req.headers["accept-language"] || 'en';
        req.opuscapita.acceptLanguage = accetLanguageParser.parse(languages);

        req.opuscapita.logger = new Logger({
            context : {
                serviceName : this.serviceName,
                method : req.method,
                requestUri : req.originalUrl,
                correlationId : req.headers['correlation-id']
                //userId : req.opuscapita.userData('id')
            }
        });

        req.opuscapita.logger.info('Incoming request.');

        next();
    });

    if(config.serviceClient.injectIntoRequest === true)
    {
        app.use((req, res, next) =>
        {
            var headersToProxy = config.serviceClient.headersToProxy;
            var localHeaders = { };

            for(var key in req.headers)
                if(key.startsWith('x-') || headersToProxy.indexOf(key) !== -1)
                    localHeaders[key] = req.headers[key]

            var serviceClientConfig = extend(true, config.serviceClient, { logger : req.opuscapita.logger.clone() });

            req.opuscapita.serviceClient = new ServiceClient(serviceClientConfig);
            req.opuscapita.serviceClient.contextify({ headers : localHeaders });

            next();
        });
    }

    if(config.server.middlewares)
        config.server.middlewares.forEach(obj => app.use(obj));

    if(config.server.security & this.Server.Security.AllowCrossOrigin)
    {
        logger.info('Allowing cross origin requests for: %j', config.server.crossOrigins);

        app.use((req, res, next) =>
        {
        	res.header('Access-Control-Allow-Origin', config.server.crossOrigins.join(' ')); // TODO: Only trusted hosts.
        	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Vary', 'Origin');

        	next();
        });
    }

    if(config.server.staticFilePath)
        app.use('/static', config.server.staticFilePath);

    if(config.server.mode === this.Server.Mode.Productive)
    {
        if(config.server.indexFilePath)
            app.get('/', (req, res) => res.sendFile(config.server.indexFilePath));
    }
    else
    {
        logger.info('Using webpack.');

        if(config.server.webpack.useWebpack)
        {
            const webpack = require('webpack');
            const webpackMiddleware = require('webpack-dev-middleware');
            const webpackConfig = require(config.server.webpack.configFilePath);
            const webpackCompiler = webpack(webpackConfig);
            const middleware = webpackMiddleware(webpackCompiler, {
                publicPath : webpackConfig.output && webpackConfig.output.publicPath,
                noInfo : false
            });

            app.use(middleware);

            if(config.server.indexFilePath)
            {
                app.get('/', (req, res) =>
                {
                    try
                    {
                        res.set('Content-Type', 'text/html');
                        res.write(middleware.fileSystem.readFileSync(config.server.indexFilePath));
                        res.end();
                    }
                    catch(e)
                    {
                        res.sendFile(config.server.indexFilePath);
                    }
                });
            }
        }
    }

    app.use(config.server.events.onRequest);


    app.get('/api/health/check', (req, res) => res.json({ message : "Yes, I'm alive!" }));

    if(config.routes.addRoutes === true)
    {
        logger.info('Adding routes...');

        var inits = ((paths, db, config) => Array.isArray(paths) ? paths.map(path => require(path).init(app, db, config))
            : [ require(paths).init(app, db, config) ])(config.routes.modulePaths, config.routes.dbInstance, config.routes);

        Promise.all(inits).reflect();
    }

    app.use((err, req, res, next) =>
    {
        req.opuscapita.logger.error(err.stack);
        res.status(500).send(err.stack);
    });

    var onServerListen = () => config.server.events.onStart.call(this, app);
    var onServerError = (err) => { config.server.events.onError.call(this, err, app); this.end(); }
    var onServerEnd = () => config.server.events.onEnd.call(this, app);

    this.server = app.listen(config.server.port, config.server.hostname, 1000, onServerListen);
    this.server.on('error', onServerError);

    process.on('SIGTERM', () => { this.end(); process.exit(); });
    process.on('SIGINT', () => { this.end(); process.exit(); });

    logger.info('Server started.');

    return Promise.resolve(app);
}

/**
 * Ends an initialized instance of ocbesbn-web-init.
 */
module.exports.end = function()
{
    if(this.server)
    {
        this.server.close(() =>
        {
            this.config.server.events.onEnd.call(this, this.app);
            this.server = null;
        });
    }
}
