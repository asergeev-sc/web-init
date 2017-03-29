# ocbesbn-web-init
[![Coverage Status](https://coveralls.io/repos/github/OpusCapitaBusinessNetwork/web-init/badge.svg?branch=master&rand=1)](https://coveralls.io/github/OpusCapitaBusinessNetwork/web-init?branch=master)
![Build status](https://circleci.com/gh/OpusCapitaBusinessNetwork/web-init.svg?style=shield&circle-token=2e3e2b7b174d781d2bf12a3fd2db7b1bb2385d03)

This module combines more general and common setup routines for creating a basic REST service environment.
Using it may help creating a more common and comparable structure over multiple services by following conventions
made by this service.

---

### Minimum setup

First got to your local code directory and run:
```
npm install ocbesbn-web-init
```
Now you would have to set up at least one basic route file that will automatically be included by the module
when initialized. The default path for routes is "./src/server/routes". This location can be changed by configuration
but may not be overwritten to stay with common service conventions.

A route module can be created using the following code:
```JS
const Promise = require('bluebird');

module.exports.init = function(app, db, config)
{
    // app => express instance.
    // db => can be defined by configuration when running the .init() method.
    // config => everything from config.routes passed when running the .init() method.
    app.get('/', (req, res) => res.send('hello world'));

    return Promise.resolve();
}
```

Go to your code file and put in the minimum setup code.
```JS
const server = require('ocbesbn-web-init');

// You might want to pass a configuration object to the init method. A list of parameters and their default values
// can be found at the .DefaultConfig module property.
server.init({}).then(console.log);
```
This code applies a lot of conventions that of course can, but may not be overwritten by passing a configuration object
to the init() method.

---

### Inter-Service-Communication
If desired, this module may provide a [ServiceClient](https://github.com/OpusCapitaBusinessNetwork/service-client) instance initialized with and injected into any incoming HTTP request (req.ocbesbn.serviceClient). This allows you to talk to other services while automatically keeping all headers and cookies sent with the original request. This will provide a full request context towards the target service. See the *serviceClient* key of the [DefaultConfig](#default-configuration) object.

---

### Default configuration

The default configuration object provides hints about what the module's standard behavior is like. It is mostly recommended to leave most settings as they are and treat them more as general conventions to a common structure
in order to maintain a common setup across different services. The internal ocbesbn middleware adds an ocbesbn sub-key to every request providing addition data and actions for every request.

```JS
{
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
            configFilePath : process.cwd() + '/webpack.conf.js'
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
```
