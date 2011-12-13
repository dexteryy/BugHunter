var mongo = require('mongoose');
var Schema = mongo.Schema;

var PlayerSchema = new Schema({
    uid: Number,
    usr: String,
    nic: String,
    avatar: String,
    isAdmin: { type: Boolean, default: false },
    round: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    mistake: { type: Number, default: 0 }
});

module.exports = mongo.model('Player', PlayerSchema);
