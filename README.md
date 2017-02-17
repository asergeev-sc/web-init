# ocbesbn-web-init
This module combines more general and common setup routines for creating a basic REST service environment.
Using it may help creating a more common and comparable structure over muliple services by following conventions
made by this service.

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
module.exports.init = function(app, db, config)
{
    // app => express instance.
    // db => can be defined by configuration when running the .init() method.
    // config => everything from config.routes passed when running the .init() method.
    app.get('/', (req, res) => res.send('hello world'));
}
```

Go to your code file and put in the minimum setup code.
```JS
const server = require('ocbesbn-web-init');

// You might want to pass a configuration object to the init method. A list of parameters and their default values
// can be found at the .DefaultConfig module property.
server.init({});
```
This code applies a lot of conventions that of course can, but may not be overwritten by passing a configuration object
to the init() method.
