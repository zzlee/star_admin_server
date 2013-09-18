
var connect = (function() {
    
    var auth = {};
    var EventEmitter = require('events').EventEmitter;
    var tokenListener = new EventEmitter();
    
    var _private = {
        temp : function() {}
    };

    return {
        init : function( adapter, option ){
            adapter.post('/ContentManager/api/rest/auth/login', { "username" : option.username, "password" : option.password, "rememberMe" : true }, function(err, req, res, obj){
                adapter.headers.token = obj.token;
                adapter.headers.apiLicenseToken = obj.apiLicenseToken;
                tokenListener.emit('login', { adapter : adapter, token : obj.token, apiLicenseToken : obj.apiLicenseToken });
            });
        },
        request : function( auth ) {
            tokenListener.on('login', auth);
        }
    };
}());


// Outputs: "current value: 10" and "running"
module.exports = connect;