var fs = require('fs');
var path = require('path');
var workingPath = process.cwd();
var ytToken = null;
var yt_feed = require('youtube-feeds');
var request = require("request");
var http = require('http');

var FM = { youtubeMgr: {} };

FM.youtubeMgr.getAccessToken = function( getAccessToken_cb ) {
	var tokenFile = path.join( workingPath, 'yt_token.json');

	fs.readFile( tokenFile, function (err, data) {
		if (!err) {
			var myYtToken = JSON.parse(data);
			getAccessToken_cb( myYtToken.access_token );
		}
		else {
			getAccessToken_cb( null );
		}
	});

};

FM.youtubeMgr.getVideoViewCount = function( yt_video_id, gotViewCount_cb ) {
	yt_feed.video( yt_video_id, function(err, data){
	
		if (!err){
			//console.log(data.viewCount);
			gotViewCount_cb( data.viewCount, null);
		}
		else{
			gotViewCount_cb( null, err);
		}	
	});
	
};

/**
 * youtube version 2.0 http
 */
FM.youtubeMgr.deleteYoutubeVideo = function(video_ID, ytAccessToken, cb){
//    console.log('youtubeMgr'+video_ID+'--'+ytAccessToken+'--');
    if (ytAccessToken) {
        var header = {  'Authorization': 'Bearer '+ytAccessToken,
                        'GData-Version': 2,
                        'X-GData-Key': 'key=AI39si4kwr_nSwmpgwbIvG_5ZOI-ZbwYse_H4Kujthtk4xnh2At3uHfI73PqFY8qieWbQ2uHOzCHTl6xFVh7dPjvGhBlFxbBEA',
                        'Content-Type': 'application/atom+xml'
                        };
                        
        
        var options = {
            host: 'gdata.youtube.com',
            port: 80,
            path: '/feeds/api/users/default/uploads/'+video_ID,
            headers: header,
            method: 'DELETE'
        };
        
        var client_req = http.request(options,  function(response){
            if(response.statusCode == 200)
                cb(null, 'successful');
            else
                cb(response.statusCode, null);
//                cb('fail statusCode='+response.statusCode, null);

        });
        client_req.end();
    }
};

FM.youtubeMgr.refreshToken = function() {
    var ytToken = null;
    var refreshYtToken = function(ytRefreshToken){
        var https = require('https');

        var options = {
            host: 'accounts.google.com',
            port: 443,
            path: '/o/oauth2/token',
            headers: { 'content-type': 'application/x-www-form-urlencoded'  },
            method: 'POST'
        };
                
        var client_req = https.request(options, function(client_res) {
            client_res.setEncoding('utf8');
            client_res.on('data', function (res_token) {
                //logger.log("res_token= %s", res_token);
                
                ytToken = JSON.parse(res_token);
                if ( ytToken.access_token ) {
                    logger.info('['+ new Date() +'] Refreshed YouTube token: '+ ytToken.access_token );
                    //console.dir(ytToken);
                    
                    
                    var tokenFile = path.join( workingPath, 'yt_token.json');
                    fs.writeFile(tokenFile, res_token, function(err) {
                        if(!err) {
                            logger.info('Successfully save YouTube token ' + ytToken.access_token );

                        } 
                        else {
                            logger.error('Failed to save YouTube token ' + ytToken.access_token );
                        }
                    }); 
                    
                    
                }
                else {
                    logger.error('Failed to refresh YouTube token: '+res_token);              
                }
                
            });
        });
        var body = 'client_id=701982981612-434p006n3vi10ghlk6u9op178msavtu2.apps.googleusercontent.com&';
        body += 'client_secret=NhmRDngvVVHtkLLPnhAN349b&';
        body += 'refresh_token='+ytRefreshToken+"&";
        body += 'grant_type=refresh_token';
        client_req.write(body);
        client_req.end();
    };
    
    var refreshTokenFile = path.join( workingPath, 'yt_refresh_token.json');
    fs.readFile( refreshTokenFile, function (err, data) {
        if (!err) {
            var refreshToken = data;
            refreshYtToken(refreshToken);
            setInterval( function( _ytRefreshToken){
                //logger.log("_ytRefreshToken= %s", _ytRefreshToken);
                refreshYtToken(_ytRefreshToken);
            }, 3500*1000, refreshToken);

        }
        else {
            console.log('Refresh token file does not exist! Please connect to [URL of star_server]/access_youtube_force.html to get the refresh token first');
        }
    });
    
    


};



module.exports = FM.youtubeMgr;

/*
//test
FM.youtubeMgr.getVideoViewCount('zvI1iNW7LD0', function(viewCount){
	console.log(viewCount);
});
*/