var fs = require('fs');
var path = require('path');
var workingPath = process.cwd();
var ytToken = null;
var yt_feed = require('youtube-feeds');
var request = require("request");
var http = require('http');

var FM = { youtubeMgr: {} };

FM.youtubeMgr.uploadVideo = function( ytAccessToken, videoFile, videoTitle, movieProjectID, _uploadVideo_cb  ) {

    var uploadUrl;
    var http = require('http');
    
    //a temporary workaround solution to avoid a strange phenomenon that a video is sometimes uploaded 3 times to YouTube
    //TODO: debug this strange phenomenon 
    var uploadVideo_cb = function ( err, videoURL ) {
        if (!uploadVideo_cb.isCalledOnce) {
            _uploadVideo_cb( err, videoURL );
            uploadVideo_cb.isCalledOnce = true; 
        }   
    };
    uploadVideo_cb.isCalledOnce = false;
    
    var uploadingVideoData_cb = function(res) {
        
        logger.info('['+ movieProjectID +'] uploadingVideoData_cb() res STATUS: ' + res.statusCode);
        //logger.info('uploadingVideoData_cb() res HEADERS: ' + JSON.stringify(res.headers));
        
        //for log file
        var log;
        log = 'STATUS:\n' + res.statusCo + '\n';
        log += 'HEADERS:\n' + JSON.stringify(res.headers) + '\n';
        
        var resBody = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            //logger.info('uploadingVideoData_cb() res BODY chunk: ' + chunk);
            
            resBody += chunk;
        });
        
        res.on('close', function (chunk) {
            logger.info('['+ movieProjectID +'] "close" event fired: Possibly abnormally terminated before getting the complete response chunk!!');
        });
        
        res.on('end', function () {
        
            //for log file
            log += 'BODY:\n' + resBody + '\n';
            
            var xml2js = require('xml2js');
            var parser = new xml2js.Parser();
            parser.addListener('end', function(result) {
                //console.dir(result);
                
                //for log file
                log += 'BODY (JSON):\n' + JSON.stringify(result);
                fs.writeFile(workingPath+'/public/log/yt_upload_log_'+(new Date()).toISOString().replace(/[-:.]/g, "")+'.txt', log, function (err) {
                    if (err) logger.error(JSON.stringify(err));
                    logger.info('[' + movieProjectID + '] log file is saved!');
                });
                        
                if (result.entry){
                    if (result.entry.id) {
                        var youtubeVideoID = result.entry.id.toString().split(':');
                        youtubeVideoID = youtubeVideoID[ youtubeVideoID.length-1 ];
                        
                        var i=0;
                        var timeout_cb = function(){
                            yt_feed.video(youtubeVideoID, function(err,data){
                                //console.log('check video status #'+i);
                                //console.log(data);
                                i++;
                                if ( (!data.status)||(i>30)){
                                    logger.info('check video status #'+i+': video finished processing!!');
                                    uploadVideo_cb( {err:null, youtubeVideoID:youtubeVideoID } );
                                }
                                else{
                                    logger.info('check video status #'+i+': video is still UNDER PROCESSING');
                                    setTimeout(timeout_cb, 20000);
                                }
                            });
                        };
                        setTimeout(timeout_cb, 20000);
                        
                        
                        /*
                        //add to video DB
                        var videoDB = require(workingPath+'/video.js');
                        var url = {"youtube":"http://www.youtube.com/embed/"+youtubeVideoID};
                            
                        var vjson = {"title": movieProjectID,
                                     "ownerId": {"_id": ownerID._id, "userID": ownerID.userID},
                                     "url": url,
                                     "projectId":movieProjectID};
                        //logger.info("video " + JSON.stringify(vjson));
                        videoDB.addVideo(vjson, function(err, vdoc){
                            logger.info('Seccessfully add %s to videoDB!', movieProjectID);
                        });
                        */
                    }
                    else {
                        uploadVideo_cb( {err:'Fail to upload the video to YouTube!!', youtubeVideoID:null} );
                    }
                }
                else {
                    uploadVideo_cb( {err:'Fail to upload the video to YouTube!!', youtubeVideoID:null} );
                }
                
                
            });
            parser.parseString(resBody);
            
            
                        
        }); 
    };

    var readVideoFile_cb = function (err, videoFileData) {
        if (err) logger.error(JSON.stringify(err));
        logger.info( '['+ movieProjectID +'] Finished reading the video file');
        
        var parsedUploadUrl = require('url').parse(uploadUrl);
        var uploadUrlPath = parsedUploadUrl.pathname+parsedUploadUrl.search;
        //logger.info( 'uploadUrlPath='+uploadUrlPath );
        

        var header = {  'Content-Type': 'video/mp4',
                        'Content-Length': videoFileData.length
                        };
        
        var options = {
            host: 'uploads.gdata.youtube.com',
            port: 80,
            path: uploadUrlPath,
            headers: header,
            method: 'POST'
        };
                
        logger.info('[' + movieProjectID + '] Start uploading the video body to YouTube....' );
        var client_req = http.request(options, uploadingVideoData_cb);
        client_req.write(videoFileData);
        client_req.end();
        
    };  
    
    
    var uploadingMetadata_cb = function(res) {
        logger.info('['+ movieProjectID +'] uploadingMetadata_cb() res STATUS: ' + res.statusCode);
        //logger.info('uploadingMetadata_cb() res HEADERS: ' + JSON.stringify(res.headers));
        uploadUrl = res.headers.location;
        //logger.info( 'uploadUrl='+uploadUrl);
        
        if ( res.statusCode == 200 ) {
            fs.readFile( videoFile, readVideoFile_cb);
        }
        else {
            logger.info('['+ movieProjectID +'] Fail to upload the metadata to YouTube.');
            uploadVideo_cb( {err:"Fail to upload the metadata to YouTube", youtubeVideoID:null } );
        }

        
    };

    
    var body = '\
<?xml version="1.0" encoding="UTF-8"?> \n \
<entry xmlns="http://www.w3.org/2005/Atom" \n \
xmlns:media="http://search.yahoo.com/mrss/" \n \
xmlns:yt="http://gdata.youtube.com/schemas/2007"> \n \
<media:group> \n \
<media:title type="plain">';
    body += videoTitle;
    body += '\
</media:title> \n \
<media:description type="plain"> \n \
  MiixCard video.  \n \
</media:description> \n \
<media:category \n \
  scheme="http://gdata.youtube.com/schemas/2007/categories.cat">People \n \
</media:category> \n \
</media:group> \n \
</entry>'; 

    //console.log('body= '+ body);

    if (ytAccessToken) {
        var header = {  'Authorization': 'Bearer '+ytAccessToken,
                        'GData-Version': 2,
                        'X-GData-Key': 'key=AI39si4ESFoS_HSwufFF4CEVYW9sdz4xi2-hAjs2BXJAMuHy1NzwQXB_gulxiS-YSJzWBOAi-anICzfrjFdLxdQgG5SXMRrl8Q',
                        'Slug':'super.mp4',
                        'Content-Type': 'application/atom+xml; charset=UTF-8',
                        'Content-Length': body.length
                        };
                        
        
        var options = {
            host: 'uploads.gdata.youtube.com',
            port: 80,
            path: '/resumable/feeds/api/users/default/uploads',
            headers: header,
            //auth: 'Bearer:' + ytToken.access_token ,
            method: 'POST'
        };
        
        
        logger.info('['+ movieProjectID +'] Use the access token: ' + ytAccessToken);                           
        logger.info('['+ movieProjectID +'] Send the video metadata to YouTube....' );
        var client_req = http.request(options, uploadingMetadata_cb);
        client_req.write(body);
        client_req.end();
    }
    else {
        logger.info('['+ movieProjectID +'] Cannot upload video due to the absence of YouTube token.' );
        uploadVideo_cb( {err:"Cannot upload video due to the absence of YouTube token", youtubeVideoID:null } );
    }
                    
};

FM.youtubeMgr.uploadVideoWithRetry = function( ytAccessToken, videoFile, videoTitle, movieProjectID, uploadedVideo_cb  ) {
    //retry 3 times if failed
    var i = 0, tryMax = 3;
    var uploadVideoToYoutubeSteps = function() {
        
        youtubeMgr.uploadVideo( ytAccessToken, videoFile, videoTitle, movieProjectID, function(result) {
            if (result.err) {
                if ( i < tryMax ) {
                    setTimeout(function(){ 
                        uploadVideoToYoutubeSteps();
                        i++;
                        logger.error("["+ movieProjectID +"] "+ result.err +" -->try again #" + i);
                    }, 5000);
                }
                else {
                    if (uploadedVideo_cb) {
                        uploadedVideo_cb(result);
                    }           
                }
            }
            else {
                if (uploadedVideo_cb) {
                    uploadedVideo_cb(result);
                }           
            }
        });
                
    };
    uploadVideoToYoutubeSteps();

};


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