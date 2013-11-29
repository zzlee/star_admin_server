var aeServerMgr = {};

var workingPath = process.cwd();
var path = require('path');
var http = require('http');
var url = require('url');
var fs = require('fs');
var async = require('async');
var globalConnectionMgr = require('./global_connection_mgr.js');
var youtubeTokenMgr = require( './youtube_mgr.js' );





//use long polling to ask AE Server to create Miix movie
aeServerMgr.createMiixMovie = function(movieProjectID, ownerStdID, ownerFbID, movieTitle, mediaType, createMovie_cb) {

	var starAeServerID = systemConfig.DEFAULT_AE_SERVER;
	
	//getAeServerWithLowestLoad(function(aeServerWithLowestLoad, err){
	globalConnectionMgr.getConnectedRemoteWithLowestLoad('AE_SERVER', function(err, aeServerWithLowestLoad){
        if (!err){
            starAeServerID = aeServerWithLowestLoad;
        }
    
        logger.info('[aeServerMgr.createMiixMovie] aeServer to do rendering is : '+aeServerWithLowestLoad);

        youtubeTokenMgr.getAccessToken( function(ytAccessToken){
            if (ytAccessToken) {
                //var userDataFolder = path.join( workingPath, 'public/contents/user_project', movieProjectID, 'user_data');
                
                var commandParameters = {
                    //userFileList: fs.readdirSync(userDataFolder),
                    movieProjectID: movieProjectID,
                    ownerStdID: ownerStdID,
                    ownerFbID: ownerFbID,
                    movieTitle: movieTitle,
                    ytAccessToken: ytAccessToken,
                    mediaType: mediaType
                };
                            
                globalConnectionMgr.sendRequestToRemote( starAeServerID, { command: "RENDER_MIIX_MOVIE", parameters: commandParameters }, function(responseParameters) {
                    //console.dir(responseParameters);
                    if (createMovie_cb )  {
                        createMovie_cb(responseParameters);
                    }
                });
            }
            else {
                logger.info('[%s] Cannot get Youtube access token!', movieProjectID);
            }
        
        });
        
	});

	

};

//use long polling to ask AE Server to create Story movie
// aeServerMgr.createStoryMV = function(movieProjectID, miixMovieFileExtension, ownerStdID, ownerFbID, movieTitle, createMovie_cb) {
aeServerMgr.createStoryMV = function(movieProjectID, miixMovieFileExtension, ownerStdID, ownerFbID, movieTitle, ownerFbProfilePicture, ugc_play_time, createMovie_cb) {

	var starAeServerID = systemConfig.DEFAULT_AE_SERVER;
	
    //getAeServerWithLowestLoad(function(aeServerWithLowestLoad, err){
	globalConnectionMgr.getConnectedRemoteWithLowestLoad('AE_SERVER', function(err, aeServerWithLowestLoad){
        if (!err){
            starAeServerID = aeServerWithLowestLoad;
        }
        youtubeTokenMgr.getAccessToken( function(ytAccessToken){
            if (ytAccessToken) {
                var userDataFolder = path.join( workingPath, 'public/contents/user_project', movieProjectID, 'user_data');
                var savePath = path.join( workingPath, 'public/contents/user_project', movieProjectID);
                if(!fs.existsSync(savePath)){
                    fs.mkdirSync(savePath);
                    fs.mkdirSync(userDataFolder);
                }
                
                var commandParameters = {
                    userFileList: fs.readdirSync(userDataFolder),
                    movieProjectID: movieProjectID,
                    miixMovieFileExtension: miixMovieFileExtension,
                    ownerStdID: ownerStdID,
                    ownerFbID: ownerFbID,
                    movieTitle: movieTitle,
                    ownerFbProfilePicture: ownerFbProfilePicture,
                    ugc_play_time: ugc_play_time,
                    ytAccessToken: ytAccessToken 
                };

                globalConnectionMgr.sendRequestToRemote( starAeServerID, { command: "RENDER_STORY_MOVIE", parameters: commandParameters }, function(responseParameters) {
                    //console.dir(responseParameters);
                    if (createMovie_cb )  {
                        createMovie_cb(responseParameters);
                    }
                });
            }
            else {
                logger.info('[%s] Cannot get Youtube access token!', movieProjectID);
            }
        
        });
    });

	

};


aeServerMgr.uploadMovieToMainServer = function(movieProjectID, uploadMovie_cb) {

    var starAeServerID;
    var UGCDB = require('./ugc.js');
    UGCDB.getAeIdByPid(movieProjectID,function(err, _aeID){
        
        if (!err){
            starAeServerID = _aeID;
        }
        else{
            starAeServerID = systemConfig.DEFAULT_AE_SERVER;
        }
    
        var commandParameters = {
            movieProjectID: movieProjectID
        };
        
        globalConnectionMgr.sendRequestToRemote( starAeServerID, { command: "UPLOAD_MOVIE_TO_MAIN_SERVER", parameters: commandParameters }, function(responseParameters) {
            //console.dir(responseParameters);
            if (uploadMovie_cb )  {
                uploadMovie_cb(responseParameters);
            }
        });
	
	});
	

};

aeServerMgr.downloadStoryMovieFromMainServer = function(movieProjectID, downloadMovie_cb) {


	var starAeServerID;
	var UGCDB = require('./ugc.js');
	UGCDB.getAeIdByPid(movieProjectID,function(err, _aeID){
        
        if (!err){
            starAeServerID = _aeID;
        }
        else{
            starAeServerID = systemConfig.DEFAULT_AE_SERVER;
        }

        var commandParameters = {
            movieProjectID: movieProjectID
        };
        
        globalConnectionMgr.sendRequestToRemote( starAeServerID, { command: "DOWNLOAD_STORY_MOVIE_FROM_MAIN_SERVER", parameters: commandParameters }, function(responseParameters) {
            //console.dir(responseParameters);
            if (downloadMovie_cb )  {
                downloadMovie_cb(responseParameters);
            }
        });
	
	});


};

aeServerMgr.downloadStoryMovieFromS3 = function(movieProjectID, downloadMovie_cb) {

    var starAeServerID;
    var UGCDB = require('./ugc.js');
    
    
    //getAeServerWithLowestLoad(function(_aeID, err){  //TODO: find a more robust way to get the right AE Server
    globalConnectionMgr.getConnectedRemoteWithLowestLoad('AE_SERVER', function(err, aeServerWithLowestLoad){
        if (!err){
            starAeServerID = aeServerWithLowestLoad;
        }
        else{
            starAeServerID = systemConfig.DEFAULT_AE_SERVER;
        }
        var commandParameters = {
            movieProjectID: movieProjectID
        };
        
        globalConnectionMgr.sendRequestToRemote( starAeServerID, { command: "DOWNLOAD_STORY_MOVIE_FROM_S3", parameters: commandParameters }, function(responseParameters) {
            //console.dir(responseParameters);
            if (downloadMovie_cb )  {
                downloadMovie_cb(responseParameters);
            }
        });
    });
    /*
    UGCDB.getAeIdByPid(movieProjectID,function(err, _aeID){
        
        if (!err){
            starAeServerID = _aeID;
        }
        else{
            starAeServerID = systemConfig.DEFAULT_AE_SERVER;
        }

        var commandParameters = {
            movieProjectID: movieProjectID
        };
        
        globalConnectionMgr.sendRequestToRemote( starAeServerID, { command: "DOWNLOAD_STORY_MOVIE_FROM_S3", parameters: commandParameters }, function(responseParameters) {
            //console.dir(responseParameters);
            if (downloadMovie_cb )  {
                downloadMovie_cb(responseParameters);
            }
        });
    
    });
    */

};

aeServerMgr.downloadMiixMovieFromS3 = function(miixMovieProjectID, miixMovieFileExtension, downloadMovie_cb) {

    var starAeServerID;
    var UGCDB = require('./ugc.js');
    
    //getAeServerWithLowestLoad(function(_aeID, err){
    globalConnectionMgr.getConnectedRemoteWithLowestLoad('AE_SERVER', function(err, aeServerWithLowestLoad){
        if (!err){
            starAeServerID = aeServerWithLowestLoad;
        }
        else{
            starAeServerID = systemConfig.DEFAULT_AE_SERVER;
        }
        var commandParameters = {
            miixMovieProjectID: miixMovieProjectID,
            miixMovieFileExtension: miixMovieFileExtension
        };
        
        globalConnectionMgr.sendRequestToRemote( starAeServerID, { command: "DOWNLOAD_MIIX_MOVIE_FROM_S3", parameters: commandParameters }, function(responseParameters) {
            //console.dir(responseParameters);
            if (downloadMovie_cb )  {
                downloadMovie_cb(responseParameters);
            }
        });
    });
    /*
    UGCDB.getAeIdByPid(miixMovieProjectID,function(err, _aeID){
        
        if (!err){
            starAeServerID = _aeID;
        }
        else{
            starAeServerID = systemConfig.DEFAULT_AE_SERVER;
        }
    
        var commandParameters = {
            miixMovieProjectID: miixMovieProjectID,
            miixMovieFileExtension: miixMovieFileExtension
        };
        
        globalConnectionMgr.sendRequestToRemote( starAeServerID, { command: "DOWNLOAD_MIIX_MOVIE_FROM_S3", parameters: commandParameters }, function(responseParameters) {
            //console.dir(responseParameters);
            if (downloadMovie_cb )  {
                downloadMovie_cb(responseParameters);
            }
        });
    });
    */

};


module.exports = aeServerMgr;