/**
 * @import lib/oz.js
 * @import mod/lang.js
 */
define("template", ["lang"], function(_, require, exports){

    function escapeHTML(str){
        str = str || '';
        var xmlchar = {
            //"&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
            "{": "&#123;",
            "}": "&#125;",
            "@": "&#64;"
        };
        return str.replace(/[<>'"\{\}@]/g, function($1){
            return xmlchar[$1];
        });
    }

    /**
     * @public 按字节长度截取字符串
     * @param {string} str是包含中英文的字符串
     * @param {int} limit是长度限制（按英文字符的长度计算）
     * @param {function} cb返回的字符串会被方法返回
     * @return {string} 返回截取后的字符串,默认末尾带有"..."
     */
    function substr(str, limit, cb){
        if(!str || typeof str !== "string")
            return '';
        var sub = str.substr(0, limit).replace(/([^\x00-\xff])/g, '$1 ').substr(0, limit).replace(/([^\x00-\xff])\s/g, '$1');
        return cb ? cb.call(sub, sub) : (str.length > sub.length ? sub + '...' : sub);
    }


    exports.escapeHTML = escapeHTML;
    exports.substr = substr;

    exports.trueSize = function(str){
        return str.replace(/([^\x00-\xff]|[A-Z])/g, '$1 ').length;
    };

	exports.str2html = function(str){
		var temp = document.createElement("div");
        temp.innerHTML = str;
		var child = temp.firstChild;
        if (temp.childNodes.length == 1) {
            return child;
        }
		var fragment = document.createDocumentFragment();
		do {
			fragment.appendChild(child);
		} while (child = temp.firstChild);
		return fragment;
	};

    exports.format = function(tpl, op){
        return tpl.replace(/\{\{(\w+)\}\}/g, function(e1,e2){
            return op[e2] != null ? op[e2] : "";
        });
    };

    // From Underscore.js 
    // JavaScript micro-templating, similar to John Resig's implementation.
    var tplSettings = {
        cache: {},
        evaluate: /\<%([\s\S]+?)%\>/g,
        interpolate: /\<%=([\s\S]+?)%\>/g
    };
    var tplMethods = {
        mix: _.mix,
        escapeHTML: escapeHTML,
        substr: substr,
        include: convertTpl,
        _has: function(obj){
            return function(name){
                return _.ns(name, undefined, obj);
            };
        }
    };
    function convertTpl(str, data, namespace){
        var c  = tplSettings, tplbox, suffix = namespace ? '#' + namespace : '';
        var func = !/[\t\r\n% ]/.test(str)
            ?  (c.cache[str + suffix] = c.cache[str + suffix] 
                        || (tplbox = document.getElementById(str)) && convertTpl(tplbox.innerHTML, false, namespace))
            : new Function(namespace || 'obj', 'api', 'var __p=[];' 
                + (namespace ? '' : 'with(obj){')
                    + 'var mix=api.mix,escapeHTML=api.escapeHTML,substr=api.substr,include=api.include,has=api._has(' + (namespace || 'obj') + ');'
                    + '__p.push(\'' +
                    str.replace(/\\/g, '\\\\')
                        .replace(/'/g, "\\'")
                        .replace(c.interpolate, function(match, code) {
                            return "'," + code.replace(/\\'/g, "'") + ",'";
                        })
                        .replace(c.evaluate || null, function(match, code) {
                            return "');" + code.replace(/\\'/g, "'")
                                                .replace(/[\r\n\t]/g, ' ') + "__p.push('";
                        })
                        .replace(/\r/g, '\\r')
                        .replace(/\n/g, '\\n')
                        .replace(/\t/g, '\\t')
                    + "');" 
                + (namespace ? "" : "}")
                + "return __p.join('');");
        return data ? func(data, tplMethods) : func;
    }

    exports.convertTpl = convertTpl;
    exports.reloadTpl = function(str){
        delete tplSettings.cache[str];
    };

});

