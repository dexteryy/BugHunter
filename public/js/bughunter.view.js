
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
        ".rank-btn": function(){
            view.showRank();
        },
        ".library-btn": function(){
            view.showLibrary();
        },
        ".reset-btn": function(){
            view.alert("确定要清除所有答题记录和积分么？（不影响题库）", function(){
                bus.fire('reset');
            });
        },
        ".quiz-mask": function(e){
            $(this).addClass('locked');
            var qid = /#qid=(.+)/.exec(this.href)[1],
                img = $(this).parent().find("img.pic")[0],
                scale = img.naturalWidth / img.offsetWidth,
                offset = $(this).offset();
            bus.fire('showhand', [qid, [
                (e.pageX - offset.left - 5) * scale, 
                (e.pageY - offset.top - 5) * scale
            ]]);
        },
        ".quiz-mask.locked": nothing,
        ".quiz-locked": nothing,
        ".quiz-winner": nothing,
        ".quiz-answer": nothing
    };

    function nothing(){}

    function formatTime(time){
        var tstr = [];
        time = time / 1000;
        tstr.push(Math.floor(time / 60));
        tstr.push(Math.floor(time % 60));
        if (tstr[0] > 60) {
            tstr.unshift(Math.floor(tstr[0] / 60));
            tstr[1] = tstr[1] % 60;
        }
        return tstr.map(function(a){ return a.toString().length < 2 ? ('0' + a) : a; }).join(':');
    }

    var _loading_timer = 0;

    var view = {

        init: function(opt){
            this.wrapper = opt.wrapper;
            this.loading = opt.loading;
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

        showLoading: function(){
            this.loading.show();
            _loading_timer = +new Date();
        },

        hideLoading: function(){
            if (+new Date() - _loading_timer < 500) {
                var self = this;
                setTimeout(function(){
                    self.hideLoading();
                }, 100);
            } else {
                this.loading.hide();
            }
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
                title: "管理题库",
                iframeURL: '/library/list', 
                width: 600,
                buttons: []
            }).open();
        },

        showRank: function(){
            this.dialog.set({
                title: "排行榜",
                iframeURL: '/library/rank', 
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

        showQuizResult: function(quiz){
            var box = $('#stream-item-' + quiz._id),
                mask = box.find('.quiz-mask'),
                img = box.find('img.pic')[0];
            mask.addClass('locked');
            quiz.winner_cost = formatTime(quiz.winner_cost);
            mask.append(tpl.convertTpl('tplQuizResult', { 
                quiz: quiz,  
                scale: img.offsetWidth / img.naturalWidth
            }));
        },

        showMyResult: function(qid, json){
            var box = $('#stream-item-' + qid).find('.quiz-locked').html(
                !json.r ? '抢答成功！' : (json.r == -2 && '抢答失败！你慢了半拍耶～' 
                                            || json.r == -3 && '登陆之后才能参加！'
                                            || '答错了！')
            );
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

        addToStream: function(data){
            var box = this.wrapper.find(".main");
            var list = this.wrapper.find(".stream-list").append(
                tpl.convertTpl("tplStreamItem", { 
                    env: { pic_width: box[0].offsetWidth * 3/4 },
                    item: data 
                })
            );
            box[0].scrollTop = list[0].offsetHeight + 100;
        },

        renderStream: function(stream){
            var box = this.wrapper.find(".main");
            var list = this.wrapper.find(".stream-list")[0].innerHTML = tpl.convertTpl("tplStream", { 
                env: { pic_width: box[0].offsetWidth * 3/4 },
                stream: stream 
            });
            box[0].scrollTop = list[0].offsetHeight + 100;
            stream.forEach(function(item){
                if (item.winner) {
                    this.showQuizResult(item);
                }
            }, this);
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
            this.renderStream(json.stream);
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
