var path = require('path');

module.exports = {
    context: __dirname + "/client",
    entry: "./index",
    output: {
        path: "/static",
        filename: "bundle.js"
    }
}
