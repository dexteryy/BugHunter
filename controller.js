
var http = require('http');
var EventEmitter = require('events').EventEmitter;
var OAuth= require('oauth').OAuth;
var mongo = require('mongoose');
var formidable = require('formidable');
var Quiz = require('./models/quiz');
var Player = require('./models/player');
var StreamLog = require('./models/streamlog');
var _ = require('./lib/lang');
var config = require('./config');
var tpl = require('./lib/template');

var oa = new OAuth(
	"http://www.douban.com/service/auth/request_token",
	"http://www.douban.com/service/auth/access_token",
    config.DOUBAN_KEY,
    config.DOUBAN_SECRET,
	"1.0",
    null,
	"HMAC-SHA1",
    null,
    null,
    config.main_domain // hack node-oauth for Douban
);

var playerHall = {};
var clients_timeout = {};
var clients_event = ['player:join', 'player:leave', 'quiz:begin', 'quiz:end', 'app:reset'];
var broadcast = new EventEmitter();

var quid = 1;
var streamLogs = [];
var streamLogList;
StreamLog.find({}, function(err, docs){
    streamLogList = docs[0];
    if (!streamLogList) {
        streamLogList = new StreamLog({ log: [], round: 0 });
        streamLogList.save();
    }
    streamLogList.log.forEach(function(log){
        //(log.type === 'Quiz' && Quiz || Talk)
        Quiz.findById(log.iid, function(err, item){
            streamLogs.push(item);
            if (log.type === 'Quiz') {
                quid++;
            }
        });
    });
});

exports.socketServer = function(client) {

    clients_event.forEach(function(topic){
        broadcast.on(topic, fn);
        client.once('disconnect', function() {
            broadcast.removeListener(topic, fn);
        });
        function fn(data){
            client.emit(topic, data);
        }
    });

    client.once('hello', function(uid) {
        if (clients_timeout[uid]) {
            clearTimeout(clients_timeout[uid]);
        }
        (playerHall[uid] || {}).socket_id = client.id;
        client.once('disconnect', function() {
            clients_timeout[uid] = setTimeout(function(){
                Object.keys(playerHall).forEach(function(uid){
                    if (this[uid].socket_id == client.id) {
                        leaveHall(uid);
                    }
                }, playerHall);
                delete clients_timeout[uid];
            }, 5000);
        });
    });

};

exports.routes = {

    '/': {
        handler: function(req, res, next){
            res.setHeader('Content-Type', 'text/html');
            res.write('<a href="/app">[ENTER]</a>');
            res.end();
        }
    },

    '/api/base': {
        handler: function(req, res, next){
            var json = {
                player: checkPlayer(req.session),
                hall: playerHall,
                stream: streamLogs
            };
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(json));
        }
    },

    '/api/info': {
        handler: function(req, res, next){
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
                player: checkPlayer(req.session),
                hall: playerHall
            }));
        }
    },

    '/api/reset': {
        type: 'post',
        handler: function(req, res, next){
            if (!isAdmin(req.session.uid)) {
                return show403(res);
            }
            streamLogs.length = 0;
            quid = 1;
            streamLogList.round = 0;
            Object.keys(playerHall).forEach(function(uid){
                this[uid].score = 0;
                this[uid].correct = 0;
                this[uid].mistake = 0;
            }, playerHall);
            exports.saveStream(function(){
                Quiz.update({}, {
                    '$set': { 
                        winner: 0,
                        winner_avatar: '',
                        winner_usr: '',
                        winner_nic: '',
                        winner_cost: 0,
                        release: null, 
                        num: 0
                    }
                }, { multi: true }, function(err, quiz){
                    broadcast.emit('app:reset');
                });
            });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end('');
        }
    },

    '/api/deliver': {
        type: 'post',
        handler: function(req, res, next){
            if (!isAdmin(req.session.uid)) {
                return show403(res);
            }
            Quiz.findById(req.body.qid, function(err, quiz){
                quiz.release = new Date();
                quiz.num = quid++;
                quiz.save();
                broadcast.emit('quiz:begin', quiz);
                streamLogs.push(quiz);
                streamLogList.round++;
            });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end('');
        }
    },

    '/api/showhand': {
        type: 'post',
        handler: function(req, res, next){
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            var result = { r: 0, msg: '' };
            var player = playerHall[req.session.uid];
            if (!req.session.uid || !player) {
                result.r = -3;
                res.end(JSON.stringify(result));
            }
            var qid = req.body.qid;
            var pos = req.body.pos.split(',');
            Quiz.findById(qid, isAdmin(req.session.uid) ? win : check);
            function check(err, quiz){
                if (checkQuizAnswer(quiz, pos)) {
                    if (parseInt(quiz.winner)) {
                        lose(-2, quiz);
                    } else {
                        win(err, quiz);
                    }
                } else {
                    lose(-1, quiz);
                }
            }
            function win(err, quiz){
                quiz.winner = player.uid;
                quiz.winner_avatar = player.avatar;
                quiz.winner_usr = player.usr;
                quiz.winner_nic = player.nic;
                quiz.winner_cost = Date.now() - quiz.release.getTime();
                quiz.save();
                replaceStreamLog(quiz);
                player.score += quiz.score;
                player.correct++;
                broadcast.emit('quiz:end', quiz);
                res.end(JSON.stringify(result));
            }
            function lose(r, quiz){
                if (r == -1) {
                    if (quiz.punish) {
                        player.score += quiz.punish;
                    }
                    player.mistake++;
                }
                result.r = r;
                res.end(JSON.stringify(result));
            }
        }
    },

    '/library/list': {
        handler: function(req, res, next){
            if (!isAdmin(req.session.uid)) {
                return show403(res);
            }
            res.setHeader('Content-Type', 'text/html');
            Quiz.find({}, function(err, docs){
                res.end(tpl.convertTpl('templates/library.tpl', { list: docs }));
            });
        }
    },

    '/library/rank': {
        handler: function(req, res, next){
            res.setHeader('Content-Type', 'text/html');
            var list = Object.keys(playerHall).map(function(uid){
                return this[uid];
            }, playerHall).sort(function(p1, p2){
                return p1.score < p2.score;
            });
            res.end(tpl.convertTpl('templates/rank.tpl', { list: list }));
        }
    },

    '/library/quiz/:qid': {
        handler: function(req, res, next){
            if (!isAdmin(req.session.uid)) {
                return show403(res);
            }
            res.setHeader('Content-Type', 'text/html');
            if (req.params.qid === 'create') {
                res.end(tpl.convertTpl('templates/upload.tpl', {
                    quiz: {}
                }));
            } else {
                Quiz.findById(req.params.qid, function(err, quiz){
                    res.end(tpl.convertTpl('templates/upload.tpl', {
                        quiz: quiz
                    }));
                });
            }
        }
    },

    '/library/upload': {
        type: 'post',
        handler: function(req, res, next){
            if (!isAdmin(req.session.uid)) {
                return show403(res);
            }
            var form = new formidable.IncomingForm();
            var quiz = {};
            form.uploadDir = './public/uploads/';
            form.on('field', function(field, value) {
                quiz[field] = value;
            }).on('file', function(field, file) {
                quiz[field] = file.path.replace(/public/, 'app');
            }).on('end', function() {
                res.setHeader('Content-Type', 'text/html');
                if (!quiz.qid) {
                    new Quiz(quiz).save(goback);
                } else {
                    Quiz.findById(quiz.qid, function(err, q){
                        if (quiz.opt === 'delete') {
                            q.remove(goback);
                        } else {
                            _.mix(q, quiz);
                            q.save(goback);
                        }
                    });
                }
                function goback(){
                    res.writeHead(302, {
                        'Location': config.main_domain + '/library/list'
                    });
                    res.end();
                }
            });
            form.parse(req);
        }
    },

    '/auth/logout': {
        handler: function(req, res, next){
            leaveHall(req.session.uid);
            req.session.destroy(function(){
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(new Player()));
            });
        }
    },

    '/auth/douban': {
        handler: function(req, res){
            oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
                if (error) {
                    res.setHeader('Content-Type', 'text/html');
                    res.write('<p>status: ' + error.statusCode + '</p>');
                    res.write('<pre>' + error.data + '</pre>');
                    res.end();
                } else {
                    req.session.oauth = {};
                    req.session.oauth.token = oauth_token;
                    req.session.oauth.token_secret = oauth_token_secret;
                    res.writeHead(302, {
                        'Location': 'http://www.douban.com/service/auth/authorize?oauth_token=' 
                                    + oauth_token + '&oauth_callback='
                                    + config.main_domain + '/auth/douban/callback'
                    });
                    res.end();
                }
            });
        }
    },

    '/auth/douban/callback': {
        handler: function(req, res, next){
            if (req.session.oauth) {
                var oauth = req.session.oauth;
                oa.getOAuthAccessToken(oauth.token, oauth.token_secret, function(error, oauth_access_token, oauth_access_token_secret, results){
                        if (error){
                            res.writeHead(302, {
                                'Location': config.main_domain + '/app/login_fail.html'
                            });
                            res.end();
                        } else {
                            oauth.token = oauth_access_token;
                            oauth.token_secret = oauth_access_token_secret;
                            req.session.uid = results.douban_user_id;
                            http.get({
                                host: 'api.douban.com',
                                port: 80,
                                path: '/people/' + results.douban_user_id + '?alt=json'
                            }).on('response', function (res2) {
                                var data = '';
                                res2.on("data", function(chunk){
                                    data += chunk;
                                }).on("end", function(){
                                    var json = JSON.parse(data);
                                    req.session.avatar = (json.link.filter(function(i){
                                        return i["@rel"] === "icon";
                                    })[0] || {})["@href"];
                                    req.session.nic = json["title"]["$t"];
                                    req.session.usr = json["db:uid"]["$t"];
                                    if (isAdmin(req.session.uid)) {
                                        req.session.isAdmin = true;
                                    }
                                    res.writeHead(302, {
                                        'Location': config.main_domain + '/app/login_success.html'
                                    });
                                    res.end();
                                });
                            });
                        }
                    }
                );
            } else {
                next(new Error("没有权限"));
            }
        }
    }

};

exports.saveStream = function(cb){
    streamLogList.save();
    StreamLog.update({}, { $pull: { log: {} } }, function(){
        StreamLog.update({}, { 
            $pushAll: { 
                log: streamLogs.map(function(item){
                    return { 
                        iid: item._id, 
                        type: item.score ? 'Quiz' : 'Talk' 
                    };
                })
            }
        }, cb);
    });
};

function checkPlayer(session){
    var player = playerHall[session.uid];
    if (session.uid) {
        if (!player) {
            player = new Player(session);
            playerHall[player.uid] = player;
            broadcast.emit('player:join', player);
        }
        session.round = player.round = streamLogList.round;
        session.score = player.score;
        session.correct = player.correct;
        session.mistake = player.mistake;
    }
    return player || {};
}

function leaveHall(uid){
    var player = playerHall[uid];
    delete playerHall[uid];
    broadcast.emit('player:leave', player);
}

function isAdmin(uid){
    return uid && config.admins.indexOf(uid.toString()) !== -1;
}

function checkQuizAnswer(quiz, pos){
    return pos[0] && pos[0] > quiz.x && pos[0] < quiz.x + quiz.w 
        && pos[1] && pos[1] > quiz.y && pos[1] < quiz.y + quiz.h;
}

function replaceStreamLog(quiz){
    var n;
    streamLogs.forEach(function(q, i){
        if (q._id.toString() == this._id.toString()) {
            n = i;
        }
    }, quiz);
    if (typeof n !== 'undefined') {
        streamLogs.splice(n, 1, quiz);
    }
}

function show403(res){
    res.writeHead(302, {
        'Location': config.main_domain + '/app/403.html'
    });
    res.end();
}

