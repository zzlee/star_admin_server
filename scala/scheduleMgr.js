
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
				
				/* var dateTransfer = function(date, cbOfDateTransfer){
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
				}); */
                
                var fillNumber = function( number ) {
                    if( number < 10 ) {
                        return '0' + number;
                    }
                    else {
                        return number;
                    }
                };
                
                var playStart = new Date(playTime.start)
                    playEnd = new Date(playTime.end);
				var playStartDate, playEndDate, 
                    playStartTime, playEndTime;
                
                playStartDate = playStart.getFullYear() + '-' + 
                                fillNumber(playStart.getMonth() + 1) + '-' + 
                                fillNumber(playStart.getDate());
                playStartTime = fillNumber(playStart.getHours()) + ':' + 
                                fillNumber(playStart.getMinutes()) + ':' + 
                                fillNumber(playStart.getSeconds());
                playEndDate = playEnd.getFullYear() + '-' + 
                              fillNumber(playEnd.getMonth() + 1) + '-' + 
                              fillNumber(playEnd.getDate());
                playEndTime = fillNumber(playEnd.getHours()) + ':' + 
                              fillNumber(playEnd.getMinutes()) + ':' + 
                              fillNumber(playEnd.getSeconds());
                
                var colorRender = function() {
                    var code = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 
                                'A', 'B', 'C', 'D', 'E', 'F'];
                    return '#' + 
                           code[Math.floor(Math.random()*15)] + 
                           code[Math.floor(Math.random()*15)] + 
                           code[Math.floor(Math.random()*15)] + 
                           code[Math.floor(Math.random()*15)] + 
                           code[Math.floor(Math.random()*15)] + 
                           code[Math.floor(Math.random()*15)];
                };
                
                /* var timeslots = 
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
                            description: 'Created by Feltmeng',
                            startTime: playStartTime,
                            endTime: playEndTime,
                            hasPriorityClassChanged: true,
                            locked : false,
                            // name :"somename",   //
                            playFullScreen : "false",
                            playlist: {
                                id: playList_id,
                            },
                            priorityClass : priority,
                            recurrencePattern  : "WEEKLY",
                            // sortOrder : 1,
                            startDate : playStartDate,
                            endDate : playEndDate,
                            tempName: "N0",
                            // weekdays : [ playWeekday[0] ],
                            weekdays : [ "SUNDAY","MONDAY","TUESDAY","WEDNESDAY"
                                        ,"THURSDAY","FRIDAY","SATURDAY" ],
                            deleteFlag : "false",
                        }]
                    }]
                }; */
                
                var timeslots = {
                    "1":{"silent":true},
                    "frames":[{
                        "eventTriggers":[],
                        "timeTriggers":[],
                        "timeslots":[
                            {
                                "playlist":{
                                    "id":playList_id,
                                    // "name":"WTA-20140129t104500-20140129t104800"
                                },
                                "audioDucking":false,
                                "playFullScreen":false,
                                "startDate":playStartDate.toString(),
                                "endDate":playEndDate.toString(),
                                "startTime":playStartTime.toString(),
                                "endTime":playEndTime.toString(),
                                "recurrencePattern":"WEEKLY",
                                "weekdays":["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"],
                                "locked":"false",
                                "color":colorRender(),
                                // "sortOrder":1,
                                "priorityClass":priority,
                                "hasPriorityClassChanged":true,
                                // "name":"WTA-20140129t104500-20140129t104800",
                                "tempName":"N0"
                            }
                        ],
                        "id":1
                    }],
                    "id":""
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