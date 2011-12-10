
define("localmodel", [
    "lang",
    "event"
], function(_, Event){

    function LocalModel(){
        this._localModel = {};
        this._watcher = Event();
        this._records = {};
    }

    LocalModel.prototype = {

        get: function(target){
            return this.data(target);
        },

        set: function(target, v){
            if (typeof target !== "string") {
                v = target;
                target = '';
            }
            return this.data(target, v);
        },

        data: function(target, v){
            var n, holder, notify, notifyValue,
                pointer = this,
                hasV = typeof v !== 'undefined',
                action = !hasV && "get" || v && "update" || "delete";
            if (!target) {
                n = "_localModel";
                holder = ":" + action;
                if (this._records[holder]) {
                    notify = holder;
                }
            } else {
                var topic = [],
                    r = this._records,
                    q = target.split(".").reverse();
                pointer = this._localModel;
                while (n = q.pop()) {
                    if (typeof pointer[n] === 'undefined') {
                        pointer[n] = {};
                    }
                    topic.push(n);
                    holder = topic.join(".") + ":" + action;
                    if (r[holder]) {
                        notify = holder;
                        notifyValue = pointer[n];
                    }
                    if (q.length <= 0) {
                        break;
                    }
                    if (typeof pointer[n] !== "object") {
                        return false;
                    }
                    pointer = pointer[n];
                }
                if (!n) {
                    return false;
                }
            }
            if (hasV) {
                pointer[n] = v;
                if (notify === holder) {
                    notifyValue = v;
                }
            }
            if (notify) {
                this._watcher.fire(notify, [notifyValue]);
            }
            if (hasV) {
                return this;
            } else {
                return pointer[n];
            }
        },

        watch: function(topic, fn){
            this._records[topic] = true;
            this._watcher.bind(topic, fn);
        },

        unwatch: function(topic, fn){
            if (fn) {
                delete this._records[topic];
            }
            this._watcher.bind(topic, fn);
        }
    
    };

    return function(opt){
        return new LocalModel(opt);
    };

});