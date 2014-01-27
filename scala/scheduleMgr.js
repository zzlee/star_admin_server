
var schedule = (function() {
    
    var adapter, token;
    var connectMgr = require('./connectMgr.js');
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
        timeslots : function( option, timeslots_cb ){
            var playDate = new Date(option.date);
            connectMgr.checkCollision('schedule.timeslots', function(status){
                adapter.get('/ContentManager/api/rest/channels/' + option.channel.id + '/frames/' + option.channel.frames + '/timeslots?year=' + playDate.getFullYear() + '&week=' + playDate.getWeek() + '&token=' + token, function(err, req, res, obj){
                    timeslots_cb(obj);
                });
            });
        },
        timetrggers : function( option, timetrggers_cb ){
            connectMgr.checkCollision('schedule.timetrggers', function(status){
                adapter.get('/ContentManager/api/rest/channels/' + option.channel.id + '/frames/' + option.channel.frames + '/timetriggers?token=' + token, function(err, req, res, obj){
                    timetrggers_cb( err, obj );
                });
            });
        },
        register : function( auth ) {
            adapter = auth.adapter;
            token = auth.token;
        },
        createTimeslot : function( playList_id, priority, playTime, channel_id, createTimeslot_cb ){
            connectMgr.checkCollision('schedule.list', function(status){
				var playDate;
				var playTimeStart;
				var playTimeEnd;
				var playWeekday;
				
				var dateTransfer = function(date, cbOfDateTransfer){
					var tempDate = new Date(date).toString().substring(0,25);
					yyyy = tempDate.substring(11,15);
					mm = new Date(date).getMonth()+1;
					dd = tempDate.substring(8,10);
					time = tempDate.substring(16,25);
					tempDate = yyyy+'-'+mm+'-'+dd+' '+time;
					cbOfDateTransfer(tempDate);
				};
				
				var weekdayTransfer = function(date, cbOfWeekdayTransfer){
					var weekdays = [ 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY' ];
					var tempWeekday = new Date(date).getDay();
					cbOfWeekdayTransfer(weekdays[tempWeekday]);
				};
				
				dateTransfer(playTime.start, function(result){
					playDate = result.substring(0,10);
					playTimeStart = result.substring(10,18);
				});
				
				dateTransfer(playTime.end, function(result){
					playTimeEnd = result.substring(10,18);
				});
				
				weekdayTransfer(playTime.start, function(result){
					playWeekday = [result];
				});
				
                /* var timeslots = {
                        frames : [{
                            id : 1,
                            timeslots: 
                                [{ audioDucking: false,
//                                    color: '#16f00e',
                                    controlledByAdManager: false,
                                    description: 'Created by REST api',
                                    endTime: playTimeEnd.toString(),
//                                    id: 58,
                                    locked: false,
                                    playFullScreen: false,
                                    playlist: [
                                    {
                                        enableSmartPlaylist: false,
                                        id: playList_id,
                                        itemCount: 0,
//                                        name: 'OnDaScreen',
                                        playlistType: 'MEDIA_PLAYLIST',
                                        prettifyDuration: '(0)'
                                    }],
                                    priorityClass: priority,//ALWAYS_ON_TOP, NORMAL, ALWAYS_UNDERNEATH
                                    recurrencePattern: 'WEEKLY',
                                    sortOrder: 1,
                                    startDate: playDate.toString(),
                                    startTime: playTimeStart.toString(),
                                    weekdays: playWeekday 
                                }]
                        }]
                } */
                
                var timeslots = 
                {
                    // "1" : { silent : true },
                    id : "",
                    // eventTriggers : [],
                    // timeTriggers : [],
                    frames : 
                    [{
                        id : "1",
                        timeslots : [{
                            audioDucking: false,
                            // color: "#CEE986",
                            startTime: playTimeStart,
                            endTime: playTimeEnd,
                            hasPriorityClassChanged: true,
                            locked : false,
                            name :"somename",   //
                            playFullScreen : "false",
                            playlist: {
                                id: playList_id,
                            },
                            priorityClass : priority,
                            recurrencePattern  : "WEEKLY",
                            sortOrder : 1,
                            startDate : playDate,
                            endDate : playDate,
                            tempName: "N0",
                            // weekdays : [ playWeekday[0] ],
                            weekdays : [
                                "SUNDAY",
                                "MONDAY",
                                "TUESDAY",
                                "WEDNESDAY",
                                "THURSDAY",
                                "FRIDAY",
                                "SATURDAY" 
                            ],
                            deleteFlag : "false",
                        }]
                    }]
                };
               
                adapter.put('/ContentManager/api/rest/channels/'+ channel_id +'/schedules?token=' + token, timeslots, function(err, req, res, obj){
                    if( err ) {
                        createTimeslot_cb(err, null);
                    }
                    else {
                        createTimeslot_cb(null, obj);
                    }
                });
                
            });
                    
        },
        reserved : function() {}
    };

    return {
    
        init : function(){
            var self = this;
            connectMgr.request(function( auth ){
                _private.register( auth );
                // return self;
            });
        },
        findTimeslots : function( option, timeslots_cb ) {
            _private.timeslots( option, function( timeslots ){
                timeslots_cb(timeslots);
            } );
        },
        findTimetrggers : function( option, timetrggers_cb ) {
            _private.timetrggers( option, function( err, timetrggers ){
                timetrggers_cb( err, timetrggers );
            } );
        },
        checkWeekday : function( check, weekslots, check_cb ){
            if(typeof(weekslots) === 'string') {
                if(check == weekdays[weekslots]) check_cb('OK');
                else check_cb('FAILED');
            }
            else for(var i=0; i < weekslots.length; i++) {
                if(check == weekdays[weekslots[i]]) { check_cb('OK'); return; }
                if(i == weekslots.length - 1) check_cb('FAILED');
            }
        },
        createTimeslot : _private.createTimeslot,
    };
}());

module.exports = schedule;