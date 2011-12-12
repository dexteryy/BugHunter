
var http = require('http');
var EventEmitter = require('events').EventEmitter;
var OAuth= require('oauth').OAuth;
var mongo = require('mongoose');
var formidable = require('formidable');
var Quiz = require('./models/quiz');
var Player = require('./models/player');
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
var streamLog = [];
var clients_timeout = {};
var clients_event = ['player:join', 'player:leave', 'quiz:begin', 'quiz:end'];
var broadcast = new EventEmitter();

exports.socketServer = function(client) {

    //console.info('connect', client.id)
    clients_event.forEach(function(topic){
        broadcast.on(topic, fn);
        client.once('disconnect', function() {
            broadcast.removeListener(topic, fn);
        });
        function fn(data){
            //console.info('send to client', client.id)
            client.emit(topic, data);
        }
    });

    client.once('hello', function(uid) {
        //console.info('hello', client.id, uid)
        if (clients_timeout[uid]) {
            clearTimeout(clients_timeout[uid]);
        }
        (playerHall[uid] || {}).socket_id = client.id;
        client.once('disconnect', function() {
            //console.info('disconnect', client.id, uid)
            clients_timeout[uid] = setTimeout(function(){
                Object.keys(playerHall).forEach(function(uid){
                    if (this[uid].socket_id == client.id) {
                        leaveHall(uid);
                    }
                }, playerHall);
                delete clients_timeout[uid];
                //console.info('offline', client.id, uid)
            }, 5000);
            client.removeAllListeners('deliver');
        });
    });

    client.on('deliver', function(uid) {
        Quiz.findById(uid, function(err, quiz){
            broadcast.emit('quiz:begin', quiz);
            streamLog.push(quiz);
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
            var player = new Player(req.session);
            checkNewPlayer(player);
            var json = {
                player: player,
                hall: playerHall,
                stream: streamLog
            };
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(json));
        }
    },

    '/api/info': {
        handler: function(req, res, next){
            var player = new Player(req.session);
            checkNewPlayer(player);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(player));
        }
    },

    '/library/list': {
        handler: function(req, res, next){
            if (!isAdmin(req.session.uid)) {
                show403(res);
            }
            res.setHeader('Content-Type', 'text/html');
            Quiz.find({}, function(err, docs){
                res.end(tpl.convertTpl('templates/library.tpl', { list: docs }));
            });
        }
    },

    '/library/quiz/:qid': {
        handler: function(req, res, next){
            if (!isAdmin(req.session.uid)) {
                show403(res);
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
                show403(res);
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

function checkNewPlayer(player){
    if (player.uid && !playerHall[player.uid]) {
        playerHall[player.uid] = player;
        broadcast.emit('player:join', player);
    }
}

function leaveHall(uid){
    var player = playerHall[uid];
    delete playerHall[uid];
    broadcast.emit('player:leave', player);
}

function isAdmin(uid){
    return uid && config.admins.indexOf(uid.toString()) !== -1;
}

function show403(res){
    res.writeHead(302, {
        'Location': config.main_domain + '/app/403.html'
    });
    res.end();
}

