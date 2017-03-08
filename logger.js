'use strict'

const extend = require('extend');
const util = require('util');

var Logger = function(config)
{
    this.config = config = extend(true, this.DefaultConfig, { }, config);
}

Logger.LogLevel = { Invalid : '', Info : 'info', Warning : 'warn', Error : 'error', Exception : 'execpt' };

Logger.prototype.onWrite = function(level, message)
{
    message = Array.prototype.slice.call(message);
    var rejectCallback;

    if(typeof message[message.length - 1] === 'function')
    {
        rejectCallback =  message[message.length - 1];
        message = message.slice(0, -1);
    }

    var obj = {
        timestamp : new Date().toISOString(),
        level : level,
        message : util.format.apply(util, message)
    };

    obj = extend(false, this.config.context, obj);

    var formatted = util.format('%j', obj);
    this.config.outputStreams[level].write(formatted);

    if(typeof rejectCallback === 'function')
        rejectCallback(new Error(formatted));
}

Logger.prototype.info = function(message, params)
{
    this.onWrite(Logger.LogLevel.Info, arguments);
}

Logger.prototype.warn = function(message, params, rejectCallback)
{
    this.onWrite(Logger.LogLevel.Warning, arguments);
}

Logger.prototype.error = function(message, params, rejectCallback)
{
    this.onWrite(Logger.LogLevel.Error, arguments);
}

Logger.prototype.except = function(message, params, rejectCallback)
{
    this.onWrite(Logger.LogLevel.Exception, arguments);
}

Logger.prototype.log = function(message, params)
{
    this.onWrite(this.config.defaultLogLevel, arguments);
}

Logger.prototype.write = function(message, params)
{
    this.onWrite(this.config.defaultLogLevel, arguments);
}

Logger.prototype.contextify = function(context)
{
    this.config.context = extend(true, this.config.context, { }, context);
}

Logger.prototype.DefaultConfig = {
    defaultLogLevel : Logger.LogLevel.Info,
    outputStreams : {
        [Logger.LogLevel.Info] : process.stdout,
        [Logger.LogLevel.Warning] : process.stdout,
        [Logger.LogLevel.Error] : process.stderr,
        [Logger.LogLevel.Exception] : process.stderr
    },
    context : {
        serviceName : 'default',
        serviceInstanceId : 0,
        correlationId : null,
        userId : null,
        requestUri : null
    }
}

module.exports = Logger;
