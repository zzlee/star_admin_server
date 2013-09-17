
var item = (function() {
    
    var adapter, token;
    
    var _private = {
        register : function( auth ) {
            adapter = auth.adapter;
            token = auth.token;
        },
        addItem : function( option, addItem_cb ) {
            //console.log(option.playlist.id, option.media.id);
            adapter.put('/ContentManager/api/rest/playlists/' + option.playlist.id + '/playlistItems/' + option.media.id + '?token=' + token, {}, function(err, req, res, obj){
                addItem_cb(err, obj);
            });
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
        addItemToPlaylist : function( option, addItem_cb ){
            _private.addItem( option, addItem_cb );
        },
    };
}());


// Outputs: "current value: 10" and "running"
module.exports = item;