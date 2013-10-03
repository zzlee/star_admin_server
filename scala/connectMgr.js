
var connect = (function() {
    
    var auth, account;
    var EventEmitter = require('events').EventEmitter;
    var tokenListener = new EventEmitter();
    var collisionListener = new EventEmitter();
    var collisionFlag = false;
    
    var _private = {
        ping : function( adapter ) {
            adapter.get('/ContentManager/api/rest/auth/ping?token=' + auth.token, function(err, req, res, obj){
                // (err)?console.log('error!'):console.log('OK');
                if(err)
                    connect.init( auth.adapter, account );
                else
                    connect.validToken();
            });
        },
        collision : function() {},
        reserved : function() {}
    };

    return {
        init : function( adapter, option ){
            account = option;
            collisionFlag = true;
            
            adapter.post('/ContentManager/api/rest/auth/login', { "username" : option.username, "password" : option.password, "rememberMe" : true }, function(err, req, res, obj){
                adapter.headers.token = obj.token;
                adapter.headers.apiLicenseToken = obj.apiLicenseToken;
                auth = { 
                    adapter : adapter, 
                    token : obj.token, 
                    apiLicenseToken : obj.apiLicenseToken 
                };
                tokenListener.emit('login', auth);
                collisionFlag = false;
                collisionListener.emit('collision', collisionFlag);
                connect.validToken();
            });
        },
        request : function( auth ) {
            tokenListener.on('login', auth);
        },
        checkCollision : function( collision_cb ) {
            if(!collisionFlag)
                collision_cb('OK');
            else {
                // console.log('collision!!');
                collisionListener.once('collision', function(status){
                    collision_cb('OK');
                });
            }
        },
        validToken : function() {
            setTimeout(function(){
                _private.ping(auth.adapter);
            }, 90 * 1000);
        }
    };
}());

module.exports = connect;