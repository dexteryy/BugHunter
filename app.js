
var io = require('socket.io');
var connect = require('connect');
var MongoStore = require('connect-mongodb');
var mongo = require('mongoose');
var config = require('./config');
var controller = require('./controller');

delete connect.bodyParser.parse['multipart/form-data'];

var ONEYEAR = 1000*60*60*24*365;

var server = connect(
    connect.bodyParser(),
    connect.cookieParser(),
    connect.session({ 
        key: 'sid',
        secret: 'yyyy',
        cookie: { path: '/', httpOnly: true, maxAge: ONEYEAR },
        store: new MongoStore({ url: config.db_url })
    }),
    connect.router(function(app){
        Object.keys(controller.routes).forEach(function(url){
            app[this[url].type || 'get'](url, this[url].handler);
        }, controller.routes);
    })
).use('/app',
    connect.static(__dirname + '/public/', {
        maxAge: ONEYEAR
    })
);

mongo.connect(config.db_url);
mongo.connection.on('open', function() {
    server.listen(config.my_port);
    console.log(config.my_ip + ":" + config.my_port);
});

var sio = io.listen(7100, {
    "log level": 1 
});
sio.sockets.on('connection', controller.socketServer);

setInterval(function(){
    controller.saveStream();
}, 3*60*1000);

process.on('SIGINT', function() {
    controller.saveStream(function(){
        process.exit(1);
    });
});

