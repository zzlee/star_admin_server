
var connect = (function() {
    
    var auth = {};
    var EventEmitter = require('events').EventEmitter;
    var tokenListener = new EventEmitter();
    
    var _private = {
        temp : function() {}
    };

    return {
        init : function( adapter, option ){
            adapter.post('/ContentManager/api/rest/auth/login', { "username" : option.username, "password" : option.password }, function(err, req, res, obj){
                tokenListener.emit('login', { adapter : adapter, token : obj.token });
            });
        },
        request : function( auth ) {
            tokenListener.on('login', auth);
        }
    };
}());


// Outputs: "current value: 10" and "running"
module.exports = connect;