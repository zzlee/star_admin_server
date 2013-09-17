
var scala = require('./scalaMgr');
var scalaMgr = scala( 'http://192.168.5.189:8080', { username: 'administrator', password: '53768608' } );

var async = require('async');

setTimeout(function(){

    var option =
    {
        search: 'lastModified'
    }
    scalaMgr.validProgramExpired(option, function(err, res){
        (err)?console.log(err):console.log(res);
    });
    /*
    var option =
    {
        search: 'lastModified',
        //expired: new Date().getTime()
    };
    var expired = new Date().getTime();
    
    scalaMgr.contractor.playlist.list(option, function(err, res)
    {
        //(err)?console.dir(err):console.dir(res);
        if(err)
        {
            valid_cb(err, null);
            return;
        }
        
        var validPlaylistItems = function(playlist, valid_cb){

            if(typeof(playlist.playlistItems) === 'undefined')
            {
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
            
            scalaMgr.contractor.playlist.update({
                playlist: { id: playlist.id, content: playlist },
            }, function(report){
                valid_cb(null, report);
            });
        };
        
        var eventConsole = function(target, event){
            event.push(function(callback){ validPlaylistItems(target, callback); });
        };
        
        if(res.count == 0)
            console.log('no playlist');
        else
        {
            var execute = [];
            for(var i=0; i<res.count; i++)
            {
                eventConsole(res.list[i], execute);
            }
            async.series(execute, function(err, res){
                (err)?console.dir(err):console.dir(res);
            });
        }
        
    });
    */
    /*
    var option = {
        playlistItem: { id: 35 },
        playlist: { name: 'lastModified' }
    };
    
    scalaMgr.pullPlaylistItem(option, function(err, res){
        (err)?console.dir(err):console.dir(res);
    });
    */
    /*
    scalaMgr.contractor.playlist.list(function(err, res){
        //(err)?console.dir(err):console.dir(res);
    });
    */
    /*
    var setting = {
        media: { name: 'Maid' },
        playlist:{ name: 'Audio' },
        playTime: { start: '2013-08-27 10:00:00', end: '2013-08-27 22:00:00', duration: 50 }
    };
    
    scalaMgr.pushMediaToPlaylist(setting, function(err, res){
        (err)?console.dir(err):console.dir(res);
        process.exit(1);
    });
    */
    /*
    scalaMgr.clearPlaylistItems(function(err, res){
        if(err)
            console.dir(err);
        else
            console.dir(res);
    });
    */
    /*
    var web = {
        name: 'web_test',
        uri: 'www.feltmeng.idv.tw'
    };
    
    var playTime = {
        start: '2013-07-22 18:00:00',
        end: '2013-07-22 19:00:00',
        duration: 50
    };
    
    scalaMgr.setWebpageToPlaylist(web, playTime, function(err, res){
        (err)?console.dir(err):console.dir(res);
    });
    */
    /*
    var option = { 
        playlist: { search: 'lastModified', play: 'OnDaScreen' },
        player: { name: 'feltmeng' } 
    };
    scalaMgr.pushEvent( option, function(res){
        console.log(res);
    });
    */
    /*
    var file = {
        name : 'test_1.avi',
        path : 'C:\\tmp\\',
        savepath : ''
    };
    */
    //var web = { name: 'test_yahoo', uri: 'tw.yahoo.com' };
    //var playTime = { start: '2013-08-28 10:00:00', end: '2013-08-28 22:00:00', duration: 50 };
    /*
    var option = {
        media: { name: file.name, type: '' },
        playlist: { name: 'tt01' },
        playTime: { start: '2013-07-21 12:30:00', end: '2013-07-22 17:50:00', duration: 35 },
    };
    */
    /*
    scalaMgr.setItemToPlaylist( file, playTime, function(err, res){
        console.log(res);
    } );
    */
    /*
    scalaMgr.contractor.playlist.updateOneProgram(option, function(err, res){
        console.log(res);
    });
    */
    
}, 1500);
