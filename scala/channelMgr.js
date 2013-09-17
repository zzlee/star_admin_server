
var channel = (function() {
    
    var adapter, token;
    
    var _private = {
        list : function( option, list_cb ) {
            if( typeof(option) == 'function') { list_cb = option; }
            adapter.get('/ContentManager/api/rest/channels?limit=10&offset=0&sort=name&token=' + token, function(err, req, res, obj) {
                list_cb(obj);
            });
        },
        register : function( auth ) {
            adapter = auth.adapter;
            token = auth.token;
        },
        jump: function(){
            console.log( "jumping" );
        }
    };

    return {
    
        init : function(){
            var self = this;
            require('./connectMgr.js').request(function( auth ){
                _private.register( auth );
                return self;
            });
        },
        list : function( option, list_cb ) {
            _private.list( option, list_cb );
        },
    };
}());


// Outputs: "current value: 10" and "running"
module.exports = channel;