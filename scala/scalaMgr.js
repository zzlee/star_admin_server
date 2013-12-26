/*
 * Login to server and get module function.
 * 
 * constructor
 * param {string} url The server URL.
 * param {object} account The username and password in account to login.
 * return {function} listTimeslot List timeslots from server.
 * return {function} setItemToEvent Set item in timeslot to server.
 * return {function} pushEvent Push program to scala server.
**/
/**
 * The manager who handles interfacing Scala Enterprise
 *
 * @mixin
 */
function scalaMgr( url, account ){
    
    var assert = require('assert');
    var async = require('async');
    var restify = require('restify').createJsonClient({url: url});
    var ml = require('multi-loggers');
    var fs = require('fs');
    if(!fs.existsSync('./log')) fs.mkdirSync('log');
    
    var scalaLogger = new ml.init({
        transports : [
            new ml.logger.setting({ method : 'connect', file : './log/connect.log' }),
            new ml.logger.setting({ method : 'action', file : './log/action.log' }),
        ]
    });
    global.scalaLogger = scalaLogger;
    
    var pushFlag = false;
    
    var playlist = require('./playlistMgr.js')
      , channel = require('./channelMgr.js')
      , item = require('./itemMgr.js')
      , schedule = require('./scheduleMgr.js')
      , media = require('./mediaMgr.js')
      , player = require('./playerMgr.js');
    
    playlist.init();
    channel.init();
    item.init();
    schedule.init();
    media.init();
    player.init();

    var contractor = {
        playlist : playlist,
        channel : channel,
        item : item,
        schedule : schedule,
        media : media,
        player : player
    };
    
    require('./connectMgr.js').init( restify, account );
    
    var weekdays = { 'SUNDAY' : 0, 'MONDAY' : 1, 'TUESDAY' : 2, 
                 'WEDNESDAY' : 3,'THURSDAY' : 4, 'FRIDAY' : 5, 'SATURDAY' : 6 };
    var checkWeekday = function( check, weekslots, check_cb ){
        if(typeof(weekslots) === 'string') {
            if(check == weekdays[weekslots]) check_cb('OK');
            else check_cb('FAILED');
        }
        else for(var i=0; i < weekslots.length; i++) {
            if(check == weekdays[weekslots[i]]) { check_cb('OK'); break; }
            if(i == weekslots.length - 1) check_cb('FAILED');
        }
    };
    var durationToNumber = function( time ){
        var duration = time[0].split(':');
        return (Number(duration[0]) * 60 + Number(duration[1])) * 1000;
    };
    var timeToInt = function( dateData, time ){
        time = time.split(':');
        var date = new Date(dateData);
        
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time[0], time[1], time[2]).getTime();
    };
    var cutOffPlaylistItem = function(target, playlistItemList, cutOff_cb){
        var afterPlaylistItem = '';
        for(var i=0; i<playlistItemList.length; i++){
            if(target.id == playlistItemList[i].id){
                playlistItemList[i].deleteFlag = true;
            }
            if(i == playlistItemList.length-1){
                cutOff_cb(playlistItemList);
            }
        }
    };
    var isCheckContent = function( fileInfo, check_cb ){        
        contractor.media.list({search: fileInfo.name}, function(err, res){ 
            if(typeof(res.list) === 'undefined')
                check_cb(false);
            else
                check_cb(true);
        });
    };
    var isExistedOfPlaylist = function(search, isExisted_cb){
        contractor.playlist.list({ fields: 'id', search: search }, function(err, res){
            (res.count > 0)?isExisted_cb({ exist: true, id: res.list[0].id }):isExisted_cb({ exist: false, id: null });
        });
    };
    
    /**
     * List timeslots from server.
     * 
     * @param {string} name The name is search condition for timeslot.
     * @param {string} channel The channel number for play to DOOH.
     * @param {string} frame The frame of channel playing.
     * @param {string} startDate The start date.
     * @param {string} endDate The end date.
     * @param {function} timeslot_cb Report timeslot list in json.
     *     @param {string} playlistInfo The playlistInfo have name, time, duration, mode and more.
     *     @param {boolean} valid The valid show this timeslot is valid.
     */
    var listTimeslot = function(oneday, timeslot_cb){
        var result = [];
    
        var option = {
            channel : { id: 1, frames: 1 }, //hardcode
            date : new Date(oneday),
        };
        contractor.schedule.findTimeslots(option, function(list){
            if(typeof(list.timeslots) === 'undefined') {
                scalaLogger.action('no find timeslot');
                timeslot_cb('no find timeslot', null);
            }
            else {
                for(var i=0; i < list.timeslots.length; i++){
                    if(list.timeslots[i].playlist.name.match(/FM/i)) {
                        checkWeekday(option.date.getDay(), list.timeslots[i].weekdays, function(status){
                            var timeslotDeadline;
                            if((typeof(list.timeslots[i].endDate) === 'undefined'))
                                timeslotDeadline = new Date(option.date.getTime() + 86399000);
                            else if((list.timeslots[i].endTime == '24:00:00'))
                                timeslotDeadline = new Date(list.timeslots[i].endDate + ' 23:59:59');
                            else 
                                timeslotDeadline = new Date(list.timeslots[i].endDate + ' ' + list.timeslots[i].endTime);
                            //console.log(list.timeslots[i].endDate);
                            if((option.date.getTime() <= timeslotDeadline.getTime()) && (status == 'OK')){
                                result.push({
                                    playlist: { id: list.timeslots[i].playlist.id, name: list.timeslots[i].playlist.name },
                                    interval: {
                                        start: timeToInt(oneday, list.timeslots[i].startTime),
                                        end: timeToInt(oneday, list.timeslots[i].endTime)
                                    },
                                    cycleDuration: durationToNumber(list.timeslots[i].playlist.prettifyDuration.replace('(','').replace(')','').split(' - ')),
                                    priority: list.timeslots[i].priorityClass
                                });
                            }
                        });
                    }
                    if(i == list.timeslots.length-1) {
                        scalaLogger.action('get timeslot is successfully, info: ' + JSON.stringify(result));
                        timeslot_cb(null, result);
                    }
                }
            }
        });
        
    };
    
    /**
     * List timetriggers from server.
     * 
     */
    var listTimetriggers = function( oneday, setting, timetriggers_cb ) {
        
        var options = {
            channel : { id: 1, frames: 1 }, //hardcode
            date : null,
        };
        
        if(typeof(oneday) === 'function') {
            timetriggers_cb = oneday;
            options.channel.id = 1;
            options.channel.frames = 1;
            options.date = new Date();
        }
        else if((oneday.channel) && (typeof(setting) === 'function')) {
            timetriggers_cb = setting;
            setting = oneday;
            options.channel.id = setting.channel.id;
            options.channel.frames = setting.channel.frames;
            options.date = new Date();
        }
        else if(typeof(setting) === 'function') {
            timetriggers_cb = setting;
            options.channel.id = 1;
            options.channel.frames = 1;
            options.date = new Date(oneday);
        }
        else {
            options.channel.id = setting.channel.id;
            options.channel.frames = setting.channel.frames;
            options.date = new Date(oneday);
        }
        
        contractor.schedule.findTimetrggers(options, function(err, res) {
            
            if( !res.timeTriggers ) {
                scalaLogger.action('not find time triggers info');
                timetriggers_cb('not_find_timetriggers', null);
                return;
            }
            var timetriggers = res.timeTriggers;
            var timeInterval = [];
            scalaLogger.action('get timeslot is successfully, info: ' + JSON.stringify(timetriggers));
            
            timetriggers.forEach(function(trigger) {
                
                var startDate = new Date(trigger.startDate).getTime(),
                    endDate = new Date(trigger.endDate).getTime();
                
                if((endDate < options.date.getTime()) || (startDate > options.date.getTime())) {
                    return;
                }
                
                var playlist = { id: trigger.playlist.id, name: trigger.playlist.name };
                var interval = { start:'', end: '', repeat: '' };
                
                if(!trigger.repeatStartTime) {
                    var time = trigger.time.split(':');
                    var start = 
                    new Date(
                        options.date.getFullYear(),
                        options.date.getMonth(),
                        options.date.getDate(),
                        time[0], time[1], time[2]
                    ).getTime();
                    interval.start = start;
                    interval.end = -1;
                    interval.repeat = -1;
                }
                else {
                    var time = trigger.time.split(':');
                    var start = 
                        new Date(
                            options.date.getFullYear(),
                            options.date.getMonth(),
                            options.date.getDate(),
                            time[0], time[1], time[2]
                        ).getTime();
                    interval.start = start;
                    
                    var cycle = trigger.repeatStartTime.split(':');
                    var repeat = ((parseInt(cycle[0]) * 60 + parseInt(cycle[1])) * 60 + parseFloat(cycle[2])) * 1000;
                    interval.repeat = repeat;
                    
                    var repeatEnd = trigger.repeatEndTime.split(':');
                    var end = 
                        new Date(
                            options.date.getFullYear(),
                            options.date.getMonth(),
                            options.date.getDate(),
                            repeatEnd[0], repeatEnd[1], repeatEnd[2]
                        ).getTime();
                    interval.end = end;
                }
                
                var once = trigger.playlist.prettifyDuration.replace('(', '').replace(')', '');
                if(once.indexOf('-') > 0) {
                    once  = once.split('-');
                    once = once[1].split(':');
                }
                else {
                    once = once.split(':');
                }
                var duration = (once[0] * 60 + parseFloat(once[1])) * 1000;
                
                timeInterval.push({
                    playlist: playlist,
                    interval: interval,
                    duration: duration
                });
            });
            
            // console.dir(timeInterval);
            timetriggers_cb(null, timeInterval);
            
        });
    };
    
    /**
     * Add item in timeslot to server.
     * 
     * @param {Object} item The item upload to scala server.
     *     <ul>
     *     <li> path: The path is file path.
     *     <li> filename: The filename is file title.
     *     </ul>
     * @param {Object} playTime The playTime is program play to DOOH in specific time.
     * @param {Function} reportStatus_cb Report media id and playlistItem id in playlist.
     */
    var setItemToPlaylist = function( option, reportStatus_cb ){
        
        var limit = 0;
        
        var file = option.file,
            playTime = option.playTime;
        var playlistName = '';
        if(typeof(option.playlist) === 'undefined')
            playlistName = 'OnDaScreen';
        else
            (typeof(option.playlist.name) === 'undefined')?playlistName = 'OnDaScreen':playlistName = option.playlist.name;
        
        var setting = {
            media: { name: file.name },
            playlist: { name: playlistName },
            playTime: { start: playTime.start, end: playTime.end, duration: playTime.duration }
        };
        
        async.waterfall([
            function(callback){
                if(limit < 1){
                    isCheckContent(file, function(existStatus){
                        if(existStatus){
                            callback(null, 'OK');
                        }
                        else {
                            contractor.media.fileupload(file, function(err, status){
                                callback(null, status);
                            });
                        }
                    });
                    limit++;
                }
            },
            function(status, callback){
                if(status == 'OK') {
                    pushMediaToPlaylist(setting, function(err, res){
                        callback(err, res);
                    });
                }
            }
        ],function(err, result){
            limit = 0;
            if(!err) {
                scalaLogger.action('set item to playlist is successfully, media name is ' + setting.media.name);
                reportStatus_cb(null, result);
            }
            else {
                scalaLogger.action('set item to playlist is failed, media name is ' + setting.media.name);
                reportStatus_cb(err, null);
            }
        });
    };
    
    /**
     * Add web page in timeslot to server.
     *
     */
    var setWebpageToPlaylist = function( option, reportStatus_cb ){
    
        var limit = 0;
        
        var webpage = option.webpage,
            playTime = option.playTime;
        var playlistName = '';
        if(typeof(option.playlist) === 'undefined')
            playlistName = 'OnDaScreen';
        else
            (typeof(option.playlist.name) === 'undefined')?playlistName = 'OnDaScreen':playlistName = option.playlist.name;
        
        var setting = {
            media: { name: webpage.name },
            playlist: { name: playlistName },
            playTime: { start: playTime.start, end: playTime.end, duration: playTime.duration }
        };
        
        async.waterfall([
            function(callback){
                if(limit < 1){
                    isCheckContent(webpage, function(existStatus){
                        if(existStatus){
                            callback(null, 'OK');
                        }
                        else {
                            contractor.media.createWebPage(webpage, function(err, status){
                                callback(null, status);
                            });
                        }
                    });
                    limit++;
                }
            },
            function(status, callback){
                if(status == 'OK') {
                    pushMediaToPlaylist(setting, function(err, res){
                        callback(err, res);
                    });
                }
            }
        ], function (err, result) {
            limit = 0;
            if(!err) {
                scalaLogger.action('set webpage to playlist is successfully, web page name is ' + setting.media.name);
                reportStatus_cb(null, result);
            }
            else {
                scalaLogger.action('set webpage to playlist is failed, web page name is ' + setting.media.name);
                reportStatus_cb(err, null);
            }
        });
    };
    
    /**
     * Push media to playlist item.
     *
     */
    var pushMediaToPlaylist = function(option, limit, push_cb){
        
        var playlistName = '';
        if(typeof(option.playlist) === 'undefined')
            playlistName = 'OnDaScreen';
        else
            (typeof(option.playlist.name) === 'undefined')?playlistName = 'OnDaScreen':playlistName = option.playlist.name;
        
        var setting = {
            media: { id: '', name: option.media.name },
            playlist: { id: '', name: playlistName, content: '', sort: 'name' },
            playTime: { start: option.playTime.start, end: option.playTime.end, duration: option.playTime.duration },
            playlistItem: { id: 0 }
        };
        
        var playStart = new Date(setting.playTime.start),
            playEnd = new Date(setting.playTime.end);
            
        var playStartDate = playStart.getFullYear() + '-' + (playStart.getMonth() + 1) + '-' + playStart.getDate(),
            playEndDate = playEnd.getFullYear() + '-' + (playEnd.getMonth() + 1) + '-' + playEnd.getDate();
        
        var playStartTime = '', playEndTime = '';
        playStartTime += (playStart.getHours() >= 10)?playStart.getHours():('0'+playStart.getHours());
        playStartTime += ':'; 
        playStartTime += (playStart.getMinutes() >= 10)?playStart.getMinutes():('0' + playStart.getMinutes());
        
        playEndTime += (playEnd.getHours() >= 10)?playEnd.getHours():('0'+playEnd.getHours());
        playEndTime += ':'; 
        playEndTime += (playEnd.getMinutes() >= 10)?playEnd.getMinutes():('0'+playEnd.getMinutes());
        
        if(typeof(limit) === 'function') {
            push_cb = limit;
            limit = 3;
        }
        var count = 0;
        
        var checker = function( id, itemId, check_cb) {
            var query = {
                filters: encodeURIComponent("{'id':{'values':[" + id + "]}}")
            };
            contractor.playlist.list(query, function(err, playlist) {
                for(var i=0; i<playlist.list[0].playlistItems.length; i++) {
                    if( (item.id == setting.playlistItem.id) && (!item.useValidRange) ) {
                        check_cb(false);
                        return;
                    }
                    if( i == playlist.list[0].playlistItems.length-1 ) {
                        check_cb(true);
                    }
                }
            });
        };
        
        async.series([
            function(step1) {
                //step.1 - get media info
                contractor.media.list({search: setting.media.name}, function(err, res){ 
                    if(typeof(res.list) === 'undefined')
                        step1('NO_MEDIA_INFO', null);
                    else {
                        setting.media.id = res.list[0].id;
                        setting.media.name = res.list[0].name;
                        step1(null, 'done');
                    }
                });
            },
            function(step2) {
                //step.2 - get playlist info and if not have playlist then create one.
                isExistedOfPlaylist(setting.playlist.name, function(status){
                    if(!status.exist) {
                        contractor.playlist.create({ name: setting.playlist.name }, function(err, res){
                            isExistedOfPlaylist(setting.playlist.name, function(status){
                                setting.playlist.id = status.id;
                                setting.playlist.name = status.name;
                                step2(null, 'done');
                            });
                        });
                    }
                    else {
                        setting.playlist.id = status.id;
                        step2(null, 'done');
                    }
                });
            },
            function(step3) {
                var query = {
                    filters: encodeURIComponent("{'id':{'values':[" + setting.playlist.id + "]}}")
                };
                contractor.item.addItemToPlaylist(setting, function(err, res){
                    contractor.playlist.list(query, function(err, res){
                        setting.playlist.content = res.list;
                        for(var i=0; i<res.list[0].playlistItems.length; i++) {
                            if(res.list[0].playlistItems[i].media) {
                                if(res.list[0].playlistItems[i].media.name.match(setting.media.name))
                                    setting.playlistItem.id = Math.max(setting.playlistItem.id, res.list[0].playlistItems[i].id);
                            }
                        }
                        step3(null, 'done');
                    });
                });
            },
            function(step4) {
                setting.playlist.filters = encodeURIComponent("{'id':{'values':[" + setting.playlist.id + "]}}")
                //step.4 - update playlist item by playlist item id
                contractor.playlist.updatePlaylistItemScheduleById(setting, function(err, res){
                    step4(null, 'done');
                });
            },
        ], function(err, res) {
            // step.5 - check playlistItem update status
            async.whilst(
                function () { return count < limit; },
                function (callback) {
                    checker(setting.playlist.id, setting.playlistItem.id, function(status) {
                        if(!status) {
                            contractor.playlist.updatePlaylistItemScheduleById(setting, function(err, res){
                                count++;
                                if(count != limit)
                                    setTimeout(callback, 200);
                                else
                                    callback(status);
                            });
                        }
                        else {
                            callback(status);
                            count = limit;
                        }
                    });
                },
                function (report) {
                    if( count < limit ) {
                        push_cb(null, { 
                            media: setting.media,
                            playlist: { id: setting.playlist.id, name: setting.playlist.name },
                            playlistItem: setting.playlistItem 
                        });
                    }
                    if( count == limit ) {
                        push_cb(err, null);
                    }
                }
            );
            
        });
        
    };
    
    /**
     * Push program groups to playlist.
     *
     */
    var pushProgramGourpsToPlaylist = function( set, groups_cb ) {
        var options = set;
        var query = 
        {
            search : set.playlist.name
        };
        
        var updateItemSortOrder = function( options, sort_cb ) {
            var query =
            {
                filters: encodeURIComponent("{'id':{'values':[" + options.playlist.id + "]}}")
            };
            contractor.playlist.list(query, function(err, res) {
                var playlist = res.list[0];
                for(var i=0; i<options.groups.length; i++) {
                    for(var j=0; j<playlist.playlistItems.length; j++) {
                        if(playlist.playlistItems[j].id == options.groups[i].content.playlistItem.id) {
                            playlist.playlistItems[j].sortOrder = options.groups[i].content.playlistItem.sortOrder;
                        }
                    }
                }
                contractor.playlist.update({
                    playlist: { id: playlist.id, content: playlist },
                }, function(report){
                    scalaLogger.action('update program groups sortOder');
                    sort_cb(null, report);
                });
            });
        };
        
        contractor.playlist.list(query, function(err, res) {
            
            if(err) {
                // console.dir(err);
                scalaLogger.action('playlist search error: ' + err);
                return;
            }
            
            var playlist = null;
            var sortMax = -1,
                itemNumbers = 0;
            
            res.list.forEach(function(list) {
                if(list.name === options.playlist.name) {
                    playlist = list;
                    options.playlist.id = list.id;
                }
            });
            
            if(playlist == null) {
                // console.log('not find playlist');
                scalaLogger.action('not find target playlist');
                return;
            }
            
            // step.3 - checkitem numbers and get max sortOrder
            playlist.playlistItems.forEach(function(item) {
                if( item.sortOrder > sortMax )
                    sortMax = item.sortOrder;
                itemNumbers += 1;
            });
            scalaLogger.action('find out max sortOrder in playlist');
            
            var executes = [];
            options.groups.forEach(function(program) {
                var event = 
                {
                    playlist : { id : playlist.id, name : playlist.name },
                    playTime : program.content.playTime
                };
                if(program.content.file) {
                    event.file = program.content.file;
                    executes.push(function(callback) { setItemToPlaylist(event, callback); });
                }
                else {
                    event.webpage = program.content.webpage;
                    executes.push(function(callback) { setWebpageToPlaylist(event, callback); });
                }
            });
            scalaLogger.action('push program groups to playlist');
            
            async.series(executes, function(err, items){
                for(var i=0; i<items.length; i++) {
                    var item = 
                    {
                        id : items[i].playlistItem.id,
                        sortOrder : options.groups[i].no + sortMax
                    };
                    options.groups[i].content.playlistItem = item;
                    options.groups[i].content.mdia = items[i].media;
                }
                
                updateItemSortOrder(options, function(err, res) {
                    var programGroups = 
                    {
                        playlist : options.playlist,
                        groups : []
                    };
                    options.groups.forEach(function(program) {
                        programGroups.groups.push({
                            media : program.content.mdia,
                            playlistItem : program.content.playlistItem,
                            playTime : program.content.playTime
                        });
                    });
                    scalaLogger.action('pushProgramGourpsToPlaylist is successfully');
                    groups_cb(err, programGroups);
                });
            });
            
            // update sortOrder test
            /* var temp = playlist.playlistItems[0].sortOrder;
            for(var i=0; i<playlist.playlistItems.length; i++) {
                playlist.playlistItems[i].sortOrder++;
            }
            playlist.playlistItems[playlist.playlistItems.length-1].sortOrder = temp;
            
            contractor.playlist.update({ playlist: { id: playlist.id, content: playlist } }, function(status) {
                console.log(status);
            }); */
            
        });
    };
    
    /**
     * Upload Media Item.
     * 
     */
    var uploadMediaItem = function(option, limit, upload_cb){
    
        var file = option.file;
        
        if( !file.name ) {
            upload_cb('No_File_Name', null);
            return;
        }
        if( !file.path ) {
            upload_cb('No_File_Path', null);
            return;
        }
        
        if( typeof(limit) === 'function' ) {
            upload_cb = limit;
            limit = 3;
        }
        
        var count = 0;
        var media = 
        {
            id: '',
            name: file.name
        };
        
        var upload = function( file, media, info_cb ) {
            contractor.media.fileupload(file, function(err, status){
                contractor.media.list({search: media.name}, function(err, res){ 
                    if( typeof(res.list) === 'undefined' ) {
                        scalaLogger.action('no media info response, file name is ' + media.name);
                        info_cb('NO_MEDIA_INFO', null);
                    }
                    else {
                        if( res.list[0].status != 'OK' ) {
                            scalaLogger.action('upload media is failed, file name is ' + media.name + ', please re-upload.');
                            info_cb('REUPLOAD', null);
                        }
                        else {
                            scalaLogger.action('upload media is successfully, file name is ' + media.name);
                            media.id = res.list[0].id;
                            info_cb(null, { media: media });
                        }
                    }
                });
            });
        };
        
        var mediaConsole = function( file, media, media_cb ) {
            contractor.media.list({search: media.name}, function(err, res){
                if((res.count == 0) || (res.list[0].status != 'OK') || (res.list[0].length == 0)) {
                    scalaLogger.action('upload media is failed, file name is ' + media.name + ', please re-upload.');
                    upload( file, media, media_cb );
                }
                else {
                    media.id = res.list[0].id;
                    media_cb(null, { media: media });
                }
            });
        };
        
        async.whilst(
            function () { return count < limit; },
            function (callback) {
                // upload(file, media, function(err, res) {
                mediaConsole(file, media, function(err, res) {
                    if( err ) {
                        count++;
                        if(count != limit)
                            setTimeout(callback, 200);
                        else
                            callback(err);
                    }
                    else {
                        callback(res);
                        count = limit;
                    }
                });
            },
            function (report) {
                //excute
                if( count < limit ) {
                    upload_cb(null, report);
                }
                if( count == limit ) {
                    upload_cb(err, null);
                }
            }
        );
        
    };
    
    /**
     * Pull playlist item.
     */
    var pullPlaylistItem = function(option, pull_cb){
    
        var playlistName = null,
            playlistId = null;
        
        if(typeof(option.playlistItem) === 'undefined') {
            pull_cb('NO_INPUT_PLAYLIST_ITEM_ID', null);
            return;
        }
        
        if(typeof(option.playlist) === 'undefined') {
            playlistName = 'OnDaScreen';
        }
        else {
            if(typeof(option.playlist.name) === 'undefined') { 
                playlistName = 'OnDaScreen'; 
            }
            else {
                playlistName = option.playlist.name;
            }
            if(typeof(option.playlist.id) !== 'undefined') { playlistId = option.playlist.id; }
        }
        
        if(playlistId == null) {
            contractor.playlist.list({ search: playlistName }, function(err, playlistInfo){
                if(err) {
                    scalaLogger.action('pull playlist item is error: ' + JSON.stringify(err));
                    pull_cb(err, null);
                }
                else {
                    cutOffPlaylistItem(option.playlistItem, playlistInfo.list[0].playlistItems, function(afterPlaylistItems){
                        playlistInfo.list[0].playlistItems = afterPlaylistItems;
                        contractor.playlist.update({
                            playlist: { id: playlistInfo.list[0].id, content: playlistInfo.list[0] },
                        }, function(report){
                            scalaLogger.action('pull playlist item is successfully, info: ' + JSON.stringify(report));
                            pull_cb(null, report);
                        });
                    });
                }
            });
        }
        else {
            var query =
            {
                filters: encodeURIComponent("{'id':{'values':[" + playlistId + "]}}")
            };
            contractor.playlist.list(query, function(err, playlistInfo) {
                // console.dir(playlistInfo);
                // pull_cb(err, playlistInfo);
                if(err) {
                    scalaLogger.action('pull playlist item is error: ' + JSON.stringify(err));
                    pull_cb(err, null);
                }
                else {
                    cutOffPlaylistItem(option.playlistItem, playlistInfo.list[0].playlistItems, function(afterPlaylistItems){
                        playlistInfo.list[0].playlistItems = afterPlaylistItems;
                        contractor.playlist.update({
                            playlist: { id: playlistInfo.list[0].id, content: playlistInfo.list[0] },
                        }, function(report){
                            scalaLogger.action('pull playlist item is successfully, info: ' + JSON.stringify(report));
                            pull_cb(null, report);
                        });
                    });
                }
            });
        }
    };
    
    /**
     * Clear all playlist Item
     *
     */
    var clearPlaylistItems = function(option, clear_cb){
        if(typeof(option) === 'function'){
            clear_cb = option;
            option = { playlist: { name: 'OnDaScreen' } }
        }
        contractor.playlist.list({ search: option.playlist.name }, function(err, res){
            if(err) {
                scalaLogger.action('clear playlist is error: not find playlist');
                clear_cb(err, null);
            }
            else {
                res.list[0].playlistItems = [];
                var updateOption = {
                    playlist: { id: res.list[0].id, content: res.list[0] }
                };
                contractor.playlist.update({
                    playlist: { id: res.list[0].id, content: res.list[0] },
                }, function(res){
                    scalaLogger.action('clear all playlist item is successfully, playlist name is ' + option.playlist.name);
                    clear_cb(null, res);
                });
            }
        });
    };
    
    /**
     * Valid program expired
     *
     */
    var validProgramExpired = function( option, validExpired_cb ){
        
        var target, expired;
        
        if(typeof(option) === 'function')
        {
            validExpired_cb = option;
            target = { search: 'OnDaScreen' };
            expired = new Date().getTime();
        }
        else
        {
            (typeof(option.search) === 'undefined')?target = { search: 'OnDaScreen' }:target = { search: option.search };
            (typeof(option.expired) === 'undefined')?expired = new Date().getTime():expired = new Date(option.expired).getTime();
        }
        
        contractor.playlist.list(target, function(err, res)
        {
            //(err)?console.dir(err):console.dir(res);
            if(err)
            {
                scalaLogger.action('valid program expired is error, info: ' + JSON.stringify(err));
                validExpired_cb(err, null);
                return;
            }
            
            var validPlaylistItems = function(playlist, valid_cb){

                if(typeof(playlist.playlistItems) === 'undefined')
                {
                    scalaLogger.action('valid program expired is not find item');
                    valid_cb(null, { message: 'no item.' });
                    return;
                }
                else
                {
                    for(var i=0; i<playlist.playlistItems.length; i++)
                    {
                        var programValidDate;
                        if(playlist.playlistItems[i].useValidRange == false)
                            continue;
                        else if(playlist.playlistItems[i].timeSchedules.endTime == '24:00')
                            programValidDate = new Date(playlist.playlistItems[i].endValidDate + ' 23:59:59').getTime();
                        else
                            programValidDate = new Date(playlist.playlistItems[i].endValidDate + ' ' + playlist.playlistItems[i].timeSchedules.endTime + ':00').getTime();
                        if((typeof(programValidDate) !== 'undefined')&&(programValidDate < expired))
                            playlist.playlistItems[i].deleteFlag = true;
                    }
                }
                
                contractor.playlist.update({
                    playlist: { id: playlist.id, content: playlist },
                }, function(report){
                    scalaLogger.action('valid program expired is successfully, info: ' + JSON.stringify(report));
                    valid_cb(null, report);
                });
            };
            
            var eventConsole = function(target, event){
                event.push(function(callback){ validPlaylistItems(target, callback); });
            };
            
            if(res.count == 0)
                validExpired_cb(null, 'no playlist');
            else
            {
                var execute = [];
                for(var i=0; i<res.count; i++)
                {
                    eventConsole(res.list[i], execute);
                }
                async.series(execute, function(err, res){
                    //(err)?console.dir(err):console.dir(res);
                    (err)?validExpired_cb(err, null):validExpired_cb(null, 'done');
                });
            }
            
        });
    };
    
    /**
     * Remove Playlist
     *
     */
    var removePlaylist = function( option, remove_cb ){
    
        var eventConsole = function(target, event){
            event.push(function(callback){ 
                contractor.playlist.remove({ playlist: { id: target } }, callback);
            });
        };
        async.series([
            function(list_cb){
                contractor.playlist.list({ fields: 'id', search: option.search }, function(err, playlist){
                    list_cb(err, playlist);
                });
            },
        ], function(err, res){
            var playlist = res[0];
            if(playlist.count == 0) {
                scalaLogger.action('remove playlist is error: no find playlist');
                remove_cb(err, 'no find playlist');
            }
            else {
                var execute = [];
                for(var i=0; i<playlist.count; i++)
                {
                    eventConsole(playlist.list[i].id, execute);
                }
                async.series(execute, function(err, res){
                    // (err)?remove_cb(err, null):remove_cb(null, 'done');
                    if(err) {
                        scalaLogger.action('remove playlist is error: ' + JSON.stringify(err));
                        remove_cb(err, null);
                    }
                    else {
                        scalaLogger.action('remove playlist is successfully, playlist name: ' + option.search);
                        remove_cb(null, 'done');
                    }
                });
            }
        });
    };
    
    /**
     * Clear Media
     *
     */
    var clearMedia = function( option, clear_cb ){
        // contractor.media.list({ fields: 'id', search: option.search }, clear_cb);
        var eventConsole = function(target, event){
            event.push(function(callback){ 
                contractor.media.remove({ media: { id: target } }, callback);
            });
        };
        async.series([
            function(list_cb){
                contractor.media.list({ fields: 'id', search: option.search }, function(err, media){
                    list_cb(err, media);
                });
            },
        ], function(err, res){
            var media = res[0];
            if(media.count == 0) {
                scalaLogger.action('clear media is error: not find media');
                clear_cb(err, 'no find media');
            }
            else {
                var execute = [];
                for(var i=0; i<media.count; i++)
                {
                    eventConsole(media.list[i].id, execute);
                }
                async.series(execute, function(err, res){
                    // (err)?clear_cb(err, null):clear_cb(null, 'done');
                    if(err) {
                        scalaLogger.action('clear media is error: ' + JSON.stringify(err));
                        clear_cb(err, null);
                    }
                    else {
                        scalaLogger.action('clear media is successfully, media name: ' + option.search);
                        clear_cb(null, 'done');
                    }
                });
            }
        });
    };
    
    /**
     * Dump playlist data.
     * 
     */
    var dumpPlaylist = function( option, dump_cb ){
        
        var playlist_name = option.playlist.name;
        var filepath = option.logger.name;
        
        var file = fs.createWriteStream(filepath, { 
            flags: 'a+',
            encoding: 'utf-8',
            mode: 0777 
        });
        
        contractor.playlist.list( { sort: 'name', limit: 1, search: playlist_name }, function(err, playlist){
            
            var content = 
            {
                playlist : playlist.list[0],
                timestamp : new Date()
            };
            file.write( JSON.stringify(content) + '\n' );
            
            if(err)
                scalaLogger.action('dump playlist info is error');
            else
                scalaLogger.action('dump playlist info is successfully');
            
            dump_cb(err, 'done');
        });
        
    };
    
    /**
     * Push event list to all playlist in server.
     * 
     * @param {object} option Input setting of playlist, subplaylist and player.
     *     @param {object} playlist Setting playlist and subplaylist by name.
     *         @param {string} search Find out available playlist.
     *         @param {string} play Find out subplaylist.
     *     @param {object} player Setting player.
     *         @param {string} name Player name.
     * @param {function} reportStatus_cb Report status. i.e. { value: success }
     */
    var pushEvent = function( option, reportPush_cb ){
        //if(!pushFlag) console.log(pushFlag);
        async.series([
            function(callback){
                contractor.playlist.list( { sort: 'id', fields: 'id,name,playlistItems', search: option.playlist.search }, function(err, playlist){
                    callback(null, playlist);
                });
            },
            function(callback){
                contractor.playlist.list( { sort: 'name', limit: 1, fields: 'id,name', search: option.playlist.play }, function(err, playlist){
                    //console.dir(playlist);
                    callback(null, playlist);
                });
            },
        ], function(err, result){
            
            var detectFlag = 0;
            var detectType = ['search', 'play'];
            
            var pushTrigger = function(){
                
                var pushSubplaylist = { subplaylist: { id: result[1].list[0].id, name: result[1].list[0].name } };
                
                for(var i=0; i<result[0].count; i++){
                    pushSubplaylist.id = result[0].list[i].id;
                    pushSubplaylist.name = result[0].list[i].name;
                    
                    if(!result[0].list[i].playlistItems){
                        contractor.playlist.pushSubplaylist(pushSubplaylist, function(err, res){});
                    }
                    else {
                        for(var j=0; j<result[0].list[i].playlistItems.length; j++){
                            if(result[0].list[i].playlistItems[j].subplaylist)
                                if(result[0].list[i].playlistItems[j].subplaylist.name == pushSubplaylist.subplaylist.name)
                                    break;
                            if(j == result[0].list[i].playlistItems.length-1)
                                contractor.playlist.pushSubplaylist(pushSubplaylist, function(err, res){});
                        }
                    }
                    
                    if(i == result[0].count-1) {
                        if(!option.player) playerName = 'feltmeng';
                        else playerName = option.player.name;
                        contractor.player.findPlayerIdByName(playerName, function(err, playerId){
                            contractor.player.pushProgram({"ids": [playerId]}, function(res){
                                scalaLogger.action('push event by content manager to player');
                                reportPush_cb(res);
                            });
                        });
                    }
                }
            };
            
            var detect = function(target, type){
                if((typeof(target) === 'undefined')) {
                    scalaLogger.action('no find "' + type + '" playlist: no result array');
                    reportPush_cb('no find "' + type + '" playlist: no result array');
                    return;
                }
                else if((typeof(target.list) === 'undefined')) {
                    scalaLogger.action('no find "' + type + '" playlist: no playlist');
                    reportPush_cb('no find "' + type + '" playlist: no playlist');
                    return;
                }
                else if((typeof(target.list[0]) === 'undefined')) {
                    scalaLogger.action('no find "' + type + '" playlist: no playlist to array');
                    reportPush_cb('no find "' + type + '" playlist: no playlist to array');
                    return;
                }
                else {
                    detectFlag++;
                    (detectFlag != 2)?detect(result[detectFlag], detectType[detectFlag]):pushTrigger();
                }
            };
            detect(result[detectFlag], detectType[detectFlag]);
            
        });
    };
    
    /**
     * Push event list to all playlist in server.
     *
     */
    var pushEventAndPlayOne = function(option, pushOne_cb){
        
        async.series([
            function(callback){
                contractor.playlist.list( { sort: 'id', fields: 'id,name,playlistItems', search: option.playlist.search }, function(err, playlist){
                    callback(null, playlist);
                });
            },
            function(callback){
                contractor.playlist.list( { sort: 'id', fields: 'id,name,playlistItems', search: option.playlist.play }, function(err, playlist){
                    callback(null, playlist);
                });
            },
        ], function(err, res){
            if(err)
                scalaLogger.action();
            else
                scalaLogger.action();
        });
        
    };
    
    return {
        listTimeslot : listTimeslot,
        listTimetriggers : listTimetriggers,
        setItemToPlaylist : setItemToPlaylist,
        pushEvent : pushEvent,
        setWebpageToPlaylist: setWebpageToPlaylist,
        pushMediaToPlaylist: pushMediaToPlaylist,
        pushProgramGourpsToPlaylist: pushProgramGourpsToPlaylist,
        uploadMediaItem: uploadMediaItem,
        pullPlaylistItem: pullPlaylistItem,
        clearPlaylistItems: clearPlaylistItems,
        validProgramExpired: validProgramExpired,
        removePlaylist: removePlaylist,
        clearMedia: clearMedia,
        dumpPlaylist: dumpPlaylist,
        contractor: contractor,   //test
    };
}

module.exports = scalaMgr;
