
oz.def("bughunter::bus", ["event"], function(Event){
    return Event();
});

oz.def("bughunter", [
    "lang",
    "network",
    "socket.io",
    "localmodel",
    "bughunter::bus",
    "bughunter::view"
], function(_, net, io, LocalModel, bus, view){

    var API_BASE = '/api/base',
        API_INFO = '/api/info',
        API_LOGOUT = '/auth/logout';
    
    var localModel = LocalModel();

    localModel.watch(":update", function(data){
        view.renderBase(data);
    });

    localModel.watch("player:update", function(data){
        view.renderStatus(data);
    });

    localModel.watch("hall:update", function(data){
        view.renderHall(data);
    });

    localModel.watch("hall.*:update", function(data){
        view.updatePlayer(data);
        if (data.uid == localModel.get('player.uid')) {
            view.renderStatus(data);
        }
    });

    localModel.watch("hall.*:delete", function(data){
        view.removePlayer(data.uid);
    });

    bus.bind("logout", function(){
        net.getJSON(API_LOGOUT, {}, function(){
            app.updatePlayer();
        });
    });

    var server_events = {

        'player:join': function (data) {
            localModel.set("hall." + data.uid, data);
        },

        'player:leave': function (data) {
            localModel.remove("hall." + data.uid);
        },

        'quiz:begin': function (data) {

        },

        'quiz:end': function (data) {

        }

    };

    var app = {

        setup: function(opt){
            view.init(opt);

            net.getJSON(API_BASE, {}, function(json){
                localModel.set(json);
                if (!json.player.uid) {
                    view.showLogin();
                }
            });

            this.connectServer();
        },

        connectServer: function(){
            var self = this;
            var server = this.server;

            if (server && typeof server === "object" && server.socket.connected) {
                server.disconnect();
                return;
            }

            server = this.server = io.connect("http://" + location.hostname, {
                port: 7100
            });

            Object.keys(server_events).forEach(function(topic){
                server.on(topic, this[topic]);
            }, server_events);

            view.showConnect();
            server.on('disconnect', reconnect);
            server.on('connect', function(){
                view.hideConnect();
            });

            function reconnect(){
                view.showConnect();
                self.server = null;
                self.connectServer();
            }

            return server;
        },

        updatePlayer: function(){
            net.getJSON(API_INFO, {}, function(json){
                localModel.set("player", json);
            });
            return bus.promise("view.player:update");
        },

        closeDialog: function(){
            view.dialog.close();
        }

    };

    return app;

});
