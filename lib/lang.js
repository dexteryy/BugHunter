
var toString = Object.prototype.toString,
    typeMap = {};

Array.prototype.forEach.call("Boolean Number String Function Array Date RegExp Object".split(" "), function(name , i){
    typeMap[ "[object " + name + "]" ] = name.toLowerCase();
}, typeMap);

function type(obj) {
    return obj == null ?
        String(obj) :
        typeMap[ toString.call(obj) ] || "object";
}

exports.type = type;

exports.isFunction = function(obj) {
    return type(obj) === "function";
};

exports.fnQueue = function(){
    var queue = [], dup = false;
    
    function getCallMethod(type){
        return function(){
            var re, fn;
            for (var i = 0, l = this.length; i < l; i++) {
                fn = this[i];
                if (fn) {
                    re = fn[type].apply(fn, arguments);
                } else {
                    break;
                }
            }
            return re;
        };
    }

    mix(queue, {
        call: getCallMethod('call'),
        apply: getCallMethod('apply'),
        clear: function(func){
            if (!func) {
                this.length = 0;
            } else {
                var size = this.length,
                    popsize = size - dup.length;
                for (var i = this.length - 1; i >= 0; i--) {
                    if (this[i] === func) {
                        this.splice(i, 1);
                        if (dup && i >= popsize)
                            dup.splice(size - i - 1, 1);
                    }
                }
                if (i < 0)
                    return false;
            }
            return true;
        }
    });

    return queue;
};

exports.ns = function(namespace, v, parent){
    var i, p = parent || global, n = namespace.split(".").reverse();
    while ((i = n.pop()) && n.length > 0) {
        if (typeof p[i] === 'undefined') {
            p[i] = {};
        } else if (typeof p[i] !== "object") {
            return false;
        }
        p = p[i];
    }
    if (typeof v !== 'undefined')
        p[i] = v;
    return p[i];
};

var mix = exports.mix = function(target) {
    var objs = arguments, l = objs.length, o, copy;
    if (l == 1) {
        objs[1] = target;
        l = 2;
        target = this;
    }
    for (var i = 1; i < l; i++) {
        o = objs[i];
        for (var n in o) {
            copy = o[n];
            target[n] = copy;
        }
    }
    return target;
};

exports.config = function(cfg, opt, default_cfg){
    for (var i in default_cfg) {
        cfg[i] = opt.hasOwnProperty(i) ? opt[i] : default_cfg[i];
    }
    return cfg;
};
