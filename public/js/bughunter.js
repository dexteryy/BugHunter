
oz.def("bughunter", [
    "jquery",
    "lang",
    "event",
    "network",
    "localmodel",
    "uiproxy",
    "template",
    "easing",
    "mainloop",
    "dialog"
], function($, _, Event, net, LocalModel, uiEvent, tpl, easingLib, mainloop, Dialog){

    var bus = Event();

    var view = {

        init: function(opt){
            this.wrapper = opt.wrapper;
            this.dialog = Dialog({
                titile: "",
                content: "",
                width: 400,
                autoupdate: true,
                isHideMask: false,
                isTrueShadow: true,
                buttons: []
            });
            mainloop.config({
                easing: easingLib,
                fps: 60
            }).run();
        },

        showLogin: function(){
            this.dialog.set({
                title: "用豆瓣账号登陆",
                iframeURL: '/app/login.html', 
                width: 500,
                buttons: []
            }).open();
        }

    };

    view.base = {

        render: function(json){
            view.wrapper[0].innerHTML = tpl.convertTpl("tplBase", json);
        }

    };


    var API_BASE = '/api/base',
        API_INFO = '/api/info';
    
    var localModel = LocalModel();

    localModel.watch(":update", function(data){
        console.info(":update", data);
        view.base.render(data);
    });

    localModel.watch("player:update", function(data){
        console.info("player:update", data);
    });

    localModel.watch("hall:update", function(data){
        console.info("hall:update", data);
    });

    //
    localModel.watch("player.a:update", function(data){
        console.info("player:a", data);
    });
    localModel.watch("player.a.y:update", function(data){
        console.info("player:a.y", data);
    });
    localModel.watch("player.b.y:update", function(data){
        console.info("player:b.y", data);
    });
    //localModel.watch("hall.a.y:update", function(data){
        //console.info("hall:a.y", data);
    //});
    localModel.watch("player:get", function(data){
        console.info("player:get", data);
    });
    //

    var app = {

        setup: function(opt){
            var self = this;
            view.init(opt);
            net.getJSON(API_BASE, {}, function(json){
                localModel.set(json);
                //
                localModel.set("player", { j: 1 });
                localModel.set("player.a", 2);
                localModel.set("player.a.y", 3);
                localModel.set("player.b.y", 4);
                localModel.set("hall.a.y", 5);
                console.log(localModel.get("player.b"));
                //
                if (!json.player.uid) {
                    view.showLogin();
                }
            });
        },

        updatePlayer: function(){
            net.getJSON(API_INFO, {}, function(json){
                localModel.set("player", json);
            });
            return bus.promise("view:player.update");
        },

        closeDialog: function(){
            view.dialog.close();
        }

    };

    return app;

});
