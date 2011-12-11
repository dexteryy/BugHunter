var mongo = require('mongoose');
var Schema = mongo.Schema;

var PlayerSchema = new Schema({
    uid: Number,
    usr: String,
    nic: String,
    avatar: { type: String, default: 'http://img3.douban.com/icon/user_large.jpg' },
    isAdmin: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    mistake: { type: Number, default: 0 }
});

module.exports = mongo.model('Player', PlayerSchema);
