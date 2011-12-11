var mongo = require('mongoose');
var Schema = mongo.Schema;

var QuizSchema = new Schema({
    qid: { type: Schema.ObjectId },
    title: { type: String, default: '' },
    score: { type: Number, min: 0, required: true },
    punish: { type: Number, default: 0, max: 0 },
    pic: { type: String, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true }
});

module.exports = mongo.model('Quiz', QuizSchema);
