
oz.def("bughunter::bus", ["event"], function(Event){
    return Event();
});

oz.def("bughunter", [
    "lang",
    "key",
    "network",
    "socket.io",
    "localmodel",
    "bughunter::bus",
    "bughunter::view"
], function(_, Key, net, io, LocalModel, bus, view){

    var API_BASE = '/api/base',
        API_INFO = '/api/info',
        API_LOGOUT = '/auth/logout',
        
        quid = 1,
    
        key = Key(),
        localModel = LocalModel();

    key.down("esc", function(e){
        e.preventDefault();
    });

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

    localModel.watch("stream[*]:update", function(data){
        view.addToStream(data);
    });

    bus.bind("login", function(){
        view.showLoading();
        net.getJSON(API_INFO, {}, function(json){
            localModel.set("player", json.player);
            view.hideLoading();
        });
    });

    bus.bind("logout", function(){
        net.getJSON(API_LOGOUT, {}, function(){
            localModel.set("player", {});
        });
    });

    bus.bind("reset", function(){
        net.ajax({
            type: 'POST',
            url: '/api/reset'
        })
    });

    bus.bind("showhand", function(qid, pos){
        app.showhand(qid, pos);
    });

    var server_events = {

        'player:join': function (player) {
            localModel.set("hall." + player.uid, player);
        },

        'player:leave': function (player) {
            localModel.remove("hall." + player.uid);
        },

        'quiz:begin': function (quiz) {
            localModel.push("stream", quiz);
        },

        'quiz:end': function (quiz) {
            view.showQuizResult(quiz);
            app.updatePlayers();
        },

        'app:reset': function (data) {
            view.showLoading();
            net.getJSON(API_BASE, {}, function(json){
                localModel.set(json);
                view.hideLoading();
            });
        }

    };

    var app = {

        setup: function(opt){
            var self = this;

            view.init(opt);
            view.showLoading();

            net.getJSON(API_BASE, {}, function(json){
                localModel.set(json);
                view.hideLoading();
                if (!json.player.uid) {
                    view.showLogin();
                }
                self.connectServer();
            });
        },

        connectServer: function(){
            var self = this;
            var server = this.server;

            //if (server && typeof server === "object" && server.socket.connected) {
                //server.disconnect();
                //return;
            //}

            view.showConnect();
            server = this.server = io.connect("http://" + location.hostname, {
                port: 7100
            });

            server.once('connect', function(){
                view.hideConnect();
                var uid = localModel.get('player.uid');
                if (uid) {
                    server.emit('hello', uid);
                }
            });
            //server.once('disconnect', reconnect);

            Object.keys(server_events).forEach(function(topic){
                server.on(topic, this[topic]);
            }, server_events);

            //function reconnect(){
                //view.showConnect();
                //self.server = null;
                //self.connectServer();
            //}

            return server;
        },

        updatePlayers: function(){
            net.getJSON(API_INFO, {}, function(json){
                localModel.set("player", json.player);
                localModel.set("hall", json.hall);
            });
        },

        deliver: function(qid){
            net.ajax({
                type: 'POST',
                url: '/api/deliver',
                data: { qid: qid }
            });
        },

        showhand: function(qid, pos){
            pos = pos || [];
            net.ajax({
                type: 'POST',
                url: '/api/showhand',
                data: { qid: qid, pos: pos.join(',') },
                dataType: 'json',
                success: function(json){
                    view.showMyResult(qid, json);
                }
            });
        },

        closeDialog: function(){
            view.dialog.close();
        }

    };

    return app;

});
