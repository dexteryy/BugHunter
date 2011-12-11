
oz.def("bughunter::view", [
    "jquery",
    "lang",
    "template",
    "uiproxy",
    "easing",
    "mainloop",
    "scrollbar",
    "dialog",
    "bughunter::bus"
], function($, _, tpl, uiproxy, easingLib, mainloop, scrollbar, Dialog, bus){

    var uiEventOpt = {
        ".logout-btn": function(){
            view.alert("注意：注销操作会清除你的所有历史记录", function(){
                bus.fire("logout");
            });
        },
        ".login-btn": function(){
            view.showLogin();
        },
        ".library-btn": function(){
            view.showLibrary();
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

        alert: function(msg, cb){
            msg = msg || "操作失败";
            var dlg = this.dialog;
            var buttons = [];
            if (cb) {
                buttons.push({
                    text: "确定",
                    method: function(){
                        cb();
                        dlg.close();
                    }
                }, "cancel");
            } else {
                buttons.push("confirm");
            }
            dlg.set({
                title: "提示",
                content: '<div class="alert-dlg">' + msg + '</div>',
                width: 450,
                buttons: buttons
            }).open();
        },

        showLogin: function(){
            this.dialog.set({
                title: "用豆瓣账号登陆",
                iframeURL: '/app/login.html', 
                width: 500,
                buttons: []
            }).open();
        },

        showLibrary: function(){
            this.dialog.set({
                title: "题库",
                iframeURL: '/library/quiz', 
                width: 600,
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

        updateHallSize: function(){
            scrollbar.init(this.wrapper.find(".aside")[0], {
                fix: 10
            });
        },

        updatePlayer: function(data){
            var card = this.wrapper.find('#hall-player-' + data.uid);
            var new_html = tpl.convertTpl("tplHallPlayer", { player: data });
            if (card[0]) {
                card.stop().replaceWith(new_html);
            } else {
                $(new_html).hide()
                    .prependTo(this.wrapper.find(".hall-list"))
                    .fadeIn(400);
            }
            this.updateHallSize();
        },

        removePlayer: function(uid){
            var card = this.wrapper.find('#hall-player-' + uid);
            card.stop().animate({
                height: 0
            }, 400, function(){
                card.remove();
            });
            this.updateHallSize();
        },

        renderBase: function(json){
            this.wrapper[0].innerHTML = tpl.convertTpl("tplBase", json);
            this.updateHallSize();
            bus.fire("view:update");
        },

        renderStatus: function(json){
            this.wrapper.find(".playerbox")[0].innerHTML = tpl.convertTpl("tplPlayer", {
                player: json
            });
            bus.fire("view.player:update");
        },

        renderHall: function(json){
            this.wrapper.find(".hall-list")[0].innerHTML = tpl.convertTpl("tplHall", {
                hall: json
            });
            this.updateHallSize();
            bus.fire("view.hall:update");
        }

    };

    return view;

});
