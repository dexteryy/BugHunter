var mongo = require('mongoose');
var Schema = mongo.Schema;

var StreamLog = new Schema({
    round: { type: Number, default: 0 },
    log: [{}]
});

module.exports = mongo.model('StreamLog', StreamLog);
