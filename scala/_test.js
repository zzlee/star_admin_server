//winston
// var winston = require('winston');
var winston = require('D:\\nodejs_project\\star_admin_server\\node_modules\\winston\\lib\\winston.js');
var fs = require('fs');
if(!fs.existsSync('./log')) fs.mkdirSync('log');

var logger = new(winston.Logger)({
	transports: [ 
		new winston.transports.File({ filename: './log/winston.log'})	
	],
	exceptionHandlers: [new winston.transports.File({filename: './log/exceptions.log'})]	
});  

global.logger = logger; 

var scala = require('./scalaMgr');
var scalaMgr = scala( 'http://192.168.5.189:8080', { username: 'administrator', password: '53768608' } );
// var scalaMgr = scala( 'http://www.feltmeng.idv.tw:8080', { username: 'administrator', password: '53768608' } );
// var scalaMgr = scala( 'http://220.128.120.51:8080', { username: 'administrator', password: '28469434' } );

setTimeout(function(){
    
    // ScalaMgr APIs : listTimeslot()
    /* var oneday = '2013/10/03 10:00:00';
    scalaMgr.listTimeslot( oneday, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    } ); */
    
    // ScalaMgr APIs : listTimetriggers()
    /* var oneday = '2013/12/26 10:00:00';
    var options = 
    {
        channel: { id: 1, frames: 1 }
    };
    scalaMgr.listTimetriggers(oneday, function(err, timetriggers) {
        if( err ) {
            console.log( err );
            return;
        }
        console.dir( timetriggers );
    }); */
    
    // ScalaMgr APIs : setItemToPlaylist()
    /* var option = 
    {
        // playlist: { name: 'myTest_' + new Date().getTime() },
        playTime: { start: '2013-07-21 12:30:00', end: '2013-07-22 17:50:00', duration: 35 },
        file: {
            name : 'test_0.avi',
            path : 'C:\\tmp\\',
            savepath : ''
        }
    };
    scalaMgr.setItemToPlaylist( option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    } ); */
    
    // ScalaMgr APIs : uploadMediaItem()
    /* var option = 
    {
        file: {
            name : 'test_0.avi',
            path : 'C:\\tmp\\',
            savepath : ''
        }
    };
    scalaMgr.uploadMediaItem( option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    } ); */
    
    // ScalaMgr APIs : validProgramExpired()
    /* var option =
    {
        search: 'lastModified'
    };
    scalaMgr.validProgramExpired(option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    // ScalaMgr APIs : pullPlaylistItem()
    /* var option = {
        playlistItem: { id: 47 },
        playlist: { id: 9, name: 'test_1' } // you can only input id or name
    };   
    scalaMgr.pullPlaylistItem(option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    // ScalaMgr APIs : pushMediaToPlaylist()
    /* var setting = {
        media: { name: 'Algorithm' },
        playlist:{ name: 'test_1' },
        playTime: { start: '2013-08-27 10:00:00', end: '2013-08-27 22:00:00', duration: 50 }
    };    
    scalaMgr.pushMediaToPlaylist(setting, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    // ScalaMgr APIs : clearPlaylistItems()
    /* scalaMgr.clearPlaylistItems(function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    // ScalaMgr APIs : setWebpageToPlaylist()
    /* var option = 
    {
        playlist: { name: 'myTest_' + new Date().getTime() },
        playTime: { start: '2013-07-22 18:00:00', end: '2013-07-22 19:00:00', duration: 50 },
        webpage: {
            name: 'web_test_' + new Date().getTime(),
            uri: 'www.feltmeng.idv.tw'
        }
    };
    scalaMgr.setWebpageToPlaylist(option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    // ScalaMgr APIs : removePlaylist()
    /* var option =
    {
        search: 'OnDaScreen-'
    };
    scalaMgr.removePlaylist(option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    // ScalaMgr APIs : clearMedia()
    /* var option =
    {
        search: 'web_test'
    };
    scalaMgr.clearMedia( option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    // ScalaMgr APIs : pushEvent()
    /* var option = { 
        playlist: { search: 'lastModified', play: 'OnDaScreen' },
        player: { name: 'feltmeng' } 
    };
    scalaMgr.pushEvent( option, function(res){
        console.log(res);
    }); */
    
    // ScalaMgr APIs : dumpPlaylist()
    /* var option = { 
        playlist: { name: 'OnDaScreen' },
        logger: { name: 'playlist.log' }
    };
    scalaMgr.dumpPlaylist( option, function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
    // ScalaMgr APIs : pushProgramGourpsToPlaylist()
    /* var set = 
    {
        playlist: { id: '', name: 'test_1' },
        groups : [
            { 
                no : 1, 
                content : {
                    playTime: { start: '2013-07-22 18:00:00', end: '2013-07-22 19:00:00', duration: 50 },
                    webpage: {
                        name: 'web_test',
                        uri: 'www.feltmeng.idv.tw'
                    }
                }
            },
            { 
                no : 2, 
                content : {
                    playTime: { start: '2013-07-21 12:30:00', end: '2013-07-22 17:50:00', duration: 35 },
                    file: {
                        name : 'test_0.avi',
                        path : 'C:\\tmp\\',
                        savepath : ''
                    }
                } 
            },
            { 
                no : 3, 
                content : {
                    playTime: { start: '2013-09-25 18:00:00', end: '2013-09-25 19:00:00', duration: 50 },
                    webpage: {
                        name: 'web_test_03',
                        uri: 'www.feltmeng.idv.tw'
                    }
                } 
            },
            { 
                no : 4, 
                content : {
                    playTime: { start: '2013-07-21 12:30:00', end: '2013-07-22 17:50:00', duration: 35 },
                    file: {
                        name : 'test_png.png',
                        path : 'C:\\tmp\\',
                        savepath : ''
                    }
                } 
            },
            { 
                no : 5, 
                content : {
                    playTime: { start: '2013-09-25 18:00:00', end: '2013-09-25 19:00:00', duration: 50 },
                    webpage: {
                        name: 'web_test_05',
                        uri: 'www.feltmeng.idv.tw'
                    }
                } 
            }
        ]
    };
    scalaMgr.pushProgramGourpsToPlaylist(set, function(err, res) {
        if(err)
            console.dir(err);
        else {
            console.dir(res.playlist);
            res.groups.forEach(function(entry) {
                console.dir(entry);
            });
        }
    }); */
	
	// ScalaMgr APIs : generatePlanToPlayer()
    /* var options = 
    {
        player : { name : 'feltmeng' }
    };
    scalaMgr.generatePlanToPlayer(options, function(err, res) {
        if(err)
            console.dir(err);
        else
            console.dir(res);
    }); */
    
	// ScalaMgr APIs : createTimeslot()
    /* var option = {
        id : 35,
        priority : 'ALWAYS_ON_TOP',
        playTime: { 
            start: new Date(2014,0,27,18,20,0).getTime(), 
            end: new Date(2014,0,27,18,25,0).getTime() 
        }
    };
    scalaMgr.createTimeslot( option, function(err, status){
        if(err)
            console.dir(err);
        else
            console.dir(status);
    }); */
    
        
}, 2000);
