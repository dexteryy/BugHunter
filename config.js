
var os = require('os');

exports.DOUBAN_KEY = "058cb157d907c5d810a614078b175188";
exports.DOUBAN_SECRET =	"16ea285269a371a0";

var my_ip = exports.my_ip = ((os.networkInterfaces().en1 || []).filter(function(o){ return o.family === 'IPv4'; })[0] || {}).address || '127.0.0.1';
var my_port = exports.my_port = 7000;
exports.main_domain = 'http://' + my_ip + ':' + my_port;

var db_config = exports.db_config = {
    dbname: 'bughunter',
    host: '127.0.0.1',
    port: 27017,  // optional, default: 27017
    collection: 'sessions' // optional, default: sessions
};
exports.db_url = 'mongodb://' + db_config.host + '/' + db_config.dbname;

exports.admins = ['1137591'];
