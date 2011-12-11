
oz.def("bughunter::view", [
    "jquery",
    "lang",
    "template",
    "uiproxy",
    "easing",
    "mainloop",
    "dialog",
    "bughunter::bus"
], function($, _, tpl, uiproxy, easingLib, mainloop, Dialog, bus){

    var uiEventOpt = {
        ".logout-btn": function(){
            bus.fire("logout");
        },
        ".login-btn": function(){
            view.showLogin();
        }
    };

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

            this.event = uiproxy.add(document.body, 'click', uiEventOpt);

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
        },

        showConnect: function(){
            this.wrapper.find(".connect-tips").animate({
                top: 0
            }, 400);
        },

        hideConnect: function(){
            this.wrapper.find(".connect-tips").animate({
                top: -32
            }, 400);
        },

        updatePlayer: function(data){
            var card = this.wrapper.find('#hall-player-' + data.uid);
            var new_html = tpl.convertTpl("tplHallPlayer", { player: data });
            if (card[0]) {
                card.replaceWith(new_html);
            } else {
                $(new_html).hide()
                    .prependTo(view.wrapper.find(".hall-list"))
                    .fadeIn(400);
            }
        },

        removePlayer: function(uid){
            var card = this.wrapper.find('#hall-player-' + uid);
            card.animate({
                height: 0
            }, 400, function(){
                card.remove();
            });
        },

        renderBase: function(json){
            view.wrapper[0].innerHTML = tpl.convertTpl("tplBase", json);
            bus.fire("view:update");
        },

        renderPlayer: function(json){
            view.wrapper.find(".playerbox")[0].innerHTML = tpl.convertTpl("tplPlayer", {
                player: json
            });
            bus.fire("view.player:update");
        },

        renderHall: function(json){
            view.wrapper.find(".hall-list")[0].innerHTML = tpl.convertTpl("tplHall", {
                hall: json
            });
            bus.fire("view.hall:update");
        }

    };

    return view;

});
