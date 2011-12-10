
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
        view.base.render(data);
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
            return bus.promise("view:player.update");
        },

        closeDialog: function(){
            view.dialog.close();
        }

    };

    return app;

});
