
var os = require("os");
var http = require("http");
var OAuth= require('oauth').OAuth;
var connect = require("connect");
var mongo = require('mongoose');
var MongoStore = require('connect-mongodb');
var util = require('./util');

var DOUBAN_KEY = "058cb157d907c5d810a614078b175188";
var DOUBAN_SECRET =	"16ea285269a371a0";
var ONEYEAR = 1000*60*60*24*365;

var MYIP = (os.networkInterfaces().en1.filter(function(o){ return o.family === 'IPv4'; })[0] || {}).address;
var MYPORT = 7000;
var main_domain = 'http://' + MYIP + ':' + MYPORT;

var oa = new OAuth(
	"http://www.douban.com/service/auth/request_token",
	"http://www.douban.com/service/auth/access_token",
    DOUBAN_KEY,
    DOUBAN_SECRET,
	"1.0",
    null,
	"HMAC-SHA1",
    null,
    null,
    main_domain // hack node-oauth for Douban
);

var db_config = {
    dbname: 'bughunter',
    host: '127.0.0.1',
    port: 27017,  // optional, default: 27017
    collection: 'sessions' // optional, default: sessions
};
var db_url = 'mongodb://' + db_config.host + '/' + db_config.dbname;


var server = connect(
    connect.bodyParser(),
    connect.cookieParser(),
    connect.session({ 
        key: 'sid',
        secret: 'yyyy',
        cookie: { path: '/', httpOnly: true, maxAge: ONEYEAR },
        store: new MongoStore({ url: db_url })
    }),
    connect.router(route)
).use('/app',
    connect.static(__dirname + '/public/', {
        maxAge: ONEYEAR
    })
);

mongo.connect(db_url);
mongo.connection.on('open', function() {
    server.listen(MYPORT);
});


function route(app){

    var _player_data = {
        uid: '',
        usr: '',
        nic: '',
        avatar: 'http://img3.douban.com/icon/user_large.jpg',
        score: 0
    };

    var playerHall = {};

    function playerInfo(data){
        return util.config({}, data, _player_data);
    }

    app.get('/', function(req, res, next){
        res.setHeader('Content-Type', 'text/html');
        res.write('<a href="/app">[ENTER]</a>');
        res.end();
    });

    app.get('/api/base', function(req, res, next){
        if (req.session.uid && !playerHall[req.session.uid]) {
            playerHall[req.session.uid] = req.session;
        }
        var json = {
            player: playerInfo(req.session),
            hall: Object.keys(playerHall).map(function(uid){
                return playerInfo(this[uid]);
            }, playerHall)
        };
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(json));
    });

    app.get('/api/info', function(req, res, next){
        var json = playerInfo(req.session);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(json));
    });

    app.get('/auth/logout', function(req, res, next){
        delete playerHall[req.session.uid];
        req.session.destroy(function(){
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(_player_data));
        });
    });

    app.get('/auth/douban', function(req, res){
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
                                + main_domain + '/auth/douban/callback'
                });
                res.end();
            }
        });
    });

    app.get('/auth/douban/callback', function(req, res, next){
        if (req.session.oauth) {
            var oauth = req.session.oauth;
            oa.getOAuthAccessToken(oauth.token, oauth.token_secret, function(error, oauth_access_token, oauth_access_token_secret, results){
                    if (error){
                        res.writeHead(302, {
                            'Location': main_domain + '/app/login_fail.html'
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
                                res.writeHead(302, {
                                    'Location': main_domain + '/app/login_success.html'
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
    });

}

