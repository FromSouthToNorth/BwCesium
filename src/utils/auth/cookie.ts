// @ts-nocheck
// 内嵌的第三方 cookie 库(UMD 格式,挂载 window.cookies),不参与类型检查
(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined"
        ? module.exports = factory(global)
        : typeof define === "function" && define.amd
            ? define(factory)
            : global.cookies = factory(global)
})(window,
    function (global) {
        "use strict";
        const cookies = global.cookies = function (data, opt) {
            function defaults(obj, defs) {
                obj = obj || {};
                for (var key in defs) {
                    if (obj[key] === undefined) {
                        obj[key] = defs[key]
                    }
                }
                return obj
            }
            defaults(cookies, {
                expires: 365 * 24 * 3600,
                path: "/",
                secure: window.location.protocol === "https:",
                nulltoremove: true,
                autojson: true,
                autoencode: true,
                encode: function (val) {
                    return encodeURIComponent(val)
                },
                decode: function (val) {
                    return decodeURIComponent(val)
                },
                fallback: false,
                namespace: 'pro__',
            });
            opt = defaults(opt, cookies);
            function _expires(time) {
                var expires = time;
                if (typeof expires === "number") {
                    expires = getDate()
                    expires.setTime(expires.getTime() + time * 1e3)
                }
                return expires
            }
            function expires(time) {
                return _expires(time).toUTCString()
            }
            function getDate() {
                if (typeof window.DateNow === "function") {
                    return new window.DateNow
                } else {
                    return new Date
                }
            }
            if (typeof data === "string") {
                var value = document.cookie.split(/;\s*/).map(opt.autoencode ? opt.decode : function (d) {
                    return d
                }).map(function (part) {
                    return part.split("=")
                }).reduce(function (parts, part) {
                    parts[part[0]] = part.splice(1).join("=");
                    return parts
                },
                    {})[data];
                //cookie 获取为空，则尝试从localStorage获取   
                if (typeof value === "undefined" && localStorage) {
                    var _temp = opt.namespace + data;
                    var _value = localStorage.getItem(_temp);
                    if (typeof _value !== "undefined" && _value !== null) {
                        try {
                            _value = JSON.parse(_value)
                            if (!_value.expire) {
                                value = _value.value
                            } else if (_value.expire >= getDate().getTime()) {
                                value = _value.value;
                            } else {
                                localStorage.removeItem(_temp)
                            }
                        } catch (e: any) {
                            console.error(e)
                        }
                    }
                }
                if (!opt.autojson) return value;
                var real;
                try {
                    real = JSON.parse(value)
                } catch (e: any) {
                    real = value
                }
                if (typeof real === "undefined" && opt.fallback) real = opt.fallback(data, opt);
                return real
            }
            for (var key in data) {
                var val = data[key];
                var expired = typeof val === "undefined" || opt.nulltoremove && val === null;
                var str = opt.autojson && typeof val !== "string" ? JSON.stringify(val) : val;
                var encoded = opt.autoencode ? opt.encode(str) : str;
                if (expired) encoded = "";
                var res = opt.encode(key) + "=" + encoded + (opt.expires ? ";expires=" + expires(expired ? -1e4 : opt.expires) : "") + ";path=" + opt.path + (opt.domain ? ";domain=" + opt.domain : "") + (opt.secure ? ";secure" : "");
                if (opt.test) opt.test(res);
                document.cookie = res;
                if (localStorage) {
                    // localStorage.setItem(key, encoded)
                    var __temp = opt.namespace + key;
                    localStorage.setItem(__temp, JSON.stringify({ value: val, expire: _expires(opt.expires).getTime() }))
                }
            }
            return cookies
        };
        cookies.get = function (key) {
            return cookies(key)
        }
        cookies.set = function (key, value, attributes) {
            var _temp: any = {};
            _temp[key] = value;
            cookies(_temp, attributes)
        }
        cookies.remove = function (key) {
            var _temp: any = {};
            _temp[key] = '';
            cookies(_temp, { expires: -(1 * 24 * 3600) })
        }
        return cookies
    });
export default cookies;
