
var schedule = (function() {
    
    var adapter, token;
    //var weekdays = [ 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY' ];
    var weekdays = {
        'SUNDAY' : 0, 
        'MONDAY' : 1, 
        'TUESDAY' : 2, 
        'WEDNESDAY' : 3, 
        'THURSDAY' : 4, 
        'FRIDAY' : 5, 
        'SATURDAY' : 6
    };
    
    Date.prototype.getWeek = function() {
        var onejan = new Date(this.getFullYear(),0,1);
        return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
    };
    
    var _private = {
        list : function( option, list_cb ){
            var playDate = new Date(option.date);
            adapter.get('/ContentManager/api/rest/channels/' + option.channel.id + '/frames/' + option.channel.frames + '/timeslots?year=' + playDate.getFullYear() + '&week=' + playDate.getWeek() + '&token=' + token, function(err, req, res, obj){
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
        findTimeslots : function( option, timeslots_cb ) {
            _private.list( option, function( list ){
                timeslots_cb(list);
            } );
        },
        checkWeekday : function( check, weekslots, check_cb ){
            if(typeof(weekslots) === 'string') {
                if(check == weekdays[weekslots]) check_cb('OK');
                else check_cb('FAILED');
            }
            else for(var i=0; i < weekslots.length; i++) {
                if(check == weekdays[weekslots[i]]) { check_cb('OK'); break; }
                if(i == weekslots.length - 1) check_cb('FAILED');
            }
        },
    };
}());


// Outputs: "current value: 10" and "running"
module.exports = schedule;