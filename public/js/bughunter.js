
oz.def("bughunter::bus", ["event"], function(Event){
    return Event();
});

oz.def("bughunter", [
    "lang",
    "network",
    "localmodel",
    "bughunter::bus",
    "bughunter::view"
], function(_, net, LocalModel, bus, view){

    var API_BASE = '/api/base',
        API_INFO = '/api/info',
        API_LOGOUT = '/auth/logout';
    
    var localModel = LocalModel();

    localModel.watch(":update", function(data){
                console.info(data)
        view.renderBase(data);
    });

    localModel.watch("player:update", function(data){
        view.renderPlayer(data);
    });

    bus.bind("logout", function(){
        net.getJSON(API_LOGOUT, {}, function(){
            app.updatePlayer();
        });
    });

    var app = {

        setup: function(opt){
            var self = this;
            view.init(opt);
            net.getJSON(API_BASE, {}, function(json){
                localModel.set(json);
                if (!json.player.uid) {
                    view.showLogin();
                }
            });
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
