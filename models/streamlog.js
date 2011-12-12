var mongo = require('mongoose');
var Schema = mongo.Schema;

var StreamLog = new Schema({
    log: [{}]
});

module.exports = mongo.model('StreamLog', StreamLog);
