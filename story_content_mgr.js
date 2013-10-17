var storyContentMgr = {};

var async = require('async');
var workingPath = process.cwd();
var aeServerMgr = require(workingPath+'/ae_server_mgr.js');
var doohMgr = require(workingPath+'/dooh_mgr.js');
var storyCamControllerMgr = require(workingPath+'/story_cam_controller_mgr.js');
var memberDB = require(workingPath+'/member.js');
var UGCDB = require(workingPath+'/ugc.js');
var fmapi = require(workingPath+'/routes/api.js');

var db = require('./db.js');
var programTimeSlotModel = db.getDocModel("programTimeSlot");
var ugcModel = db.getDocModel("ugc");
var memberModel = db.getDocModel("member");
var facebookMgr = require('./facebook_mgr.js');
var pushMgr = require('./push_mgr.js');

var downloadStoryMovieFromStoryCamControllerToAeServer = function(movieProjectID, downloaded_cb){

    //storyCamControllerMgr.uploadStoryMovieToMainServer(movieProjectID, function(resParametes){
        //logger.info('uploading story movie from Story Cam Controller to Main Server finished. ');
    //storyCamControllerMgr.uploadStoryMovieToS3(movieProjectID, function(resParametes){
        //logger.info('uploading story movie from Story Cam Controller to S3 finished. ');
        //logger.info('res: _commandId='+resParametes._commandId+' err='+resParametes.err);
        
        //TODO:: check the file size. If not correct, re-upload.
        
        //if ( (resParametes.err == 'null') || (!resParametes.err) ) {
        if ( (movieProjectID == 'null') || (!movieProjectID) ) {
            if (downloaded_cb){
                downloaded_cb('Fail to download story movie from Story Cam Controllerr to S3');
            }
        }
        else{
            //aeServerMgr.downloadStoryMovieFromMainServer(movieProjectID, function(resParameter2){
                //logger.info('downloading story movie from Main Server to AE Server.');
            aeServerMgr.downloadStoryMovieFromS3(movieProjectID, function(resParameter2){
                logger.info('downloading story movie from S3 to AE Server.');
                logger.info('res: _commandId='+resParameter2._commandId+' err='+resParameter2.err);
                
                //TODO:: check the file size. If not correct, re-download.
                
                if ( (resParameter2.err == 'null') || (!resParameter2.err) ) {
                    if (downloaded_cb){
                        downloaded_cb(null);
                    }
                }
                else{
                    if (downloaded_cb){
                        downloaded_cb('Fail to download story movie from S3 to AE Server');
                    }				
                }
            }); 
        }
    //}); 
    

};

var downloadMiixMovieFromS3 = function(_miixMovieProjectID, _miixMovieFileExtension, downloaded_cb){
    aeServerMgr.downloadMiixMovieFromS3(_miixMovieProjectID, _miixMovieFileExtension, function(resParameter3){
        if ( (resParameter3.err == 'null') || (!resParameter3.err) ) {
            if (downloaded_cb){
                downloaded_cb(null);
            }
        }
        else{
            if (downloaded_cb){
                downloaded_cb('Fail to download Miix movie from S3');
            }               
        } 
    });
};

storyContentMgr.generateStoryMV = function(miixMovieProjectID, recordTime) {
    var ownerStdID = null;
    var ownerFbID = null;
    //var ownerFbName = null;
    var movieTitle = null;
    var miixMovieFileExtension = ".flv";
    
    var getUserIdAndName = function( finish_cb ){
        UGCDB.getOwnerIdByPid( miixMovieProjectID, function( err, _ownerStdID) {
            if (!err) {
                ownerStdID = _ownerStdID;
                memberDB.getUserNameAndID( ownerStdID, function(err2, result){
                    if (!err2) {
                        ownerFbID = result.fb.userID;
                        //ownerFbName = result.fb.userName;
                        movieTitle = "Miix movie playing on a DOOH";
                        if (finish_cb){
                            finish_cb(null);
                        }					
                    } 
                    else {
                        if (finish_cb){
                            finish_cb("memberDB.getUserNameAndID() failed: "+err2);
                        }
                    }
                });
            }
            else{
                if (finish_cb){
                    finish_cb("UGCDB.getOwnerIdByPid() failed: "+err);
                }
            }
        });
    
    };
    
    var postStoryMVRenderOK = function(pid, record_time, youtube_url, postStory_cb){
        //
        async.waterfall([
            function(ugcSearch){
                ugcModel.find({projectId: pid}).exec(ugcSearch);
            },
            function(ugc, memberSearch){
                memberModel.find({'_id': ugc[0].ownerId._id}).exec(function(err, member){
                    memberSearch(err, {ugc: ugc[0], member: member[0]});
                });
            }
        ], function(err, res){
            var access_token = res.member.fb.auth.accessToken;
            var fb_name = res.member.fb.userName;
            var link = youtube_url;
            var playTime, start = new Date(parseInt(record_time));
            if(start.getHours()>12)
                playTime = start.getFullYear()+'年'+(start.getMonth()+1)+'月'+start.getDate()+'日下午'+(start.getHours()-12)+':'+start.getMinutes();
            else
                playTime = start.getFullYear()+'年'+(start.getMonth()+1)+'月'+start.getDate()+'日上午'+start.getHours()+':'+start.getMinutes();
            
            var message = fb_name + '於' + playTime + '，登上台北天幕LED，上大螢幕APP特此感謝他精采的作品！\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
            
            var shareOption = { link: link };
            //facebookMgr.postMessageAndShare(access_token, message, shareOption, postStory_cb);
            async.parallel([
                function(push_cb){pushMgr.sendMessageToDeviceByMemberId(res.member._id, message, push_cb);}//,
                //function(postFB_cb){facebookMgr.postMessageAndShare(access_token, message, shareOption, postFB_cb);}
            ], function(err, res){
                //(err)?console.log(err):console.dir(res);
                postStory_cb(err, res);
            });
        });
    };
    /*
    downloadStoryMovieFromStoryCamControllerToAeServer( miixMovieProjectID, function(err){
        
        if (!err){
            getUserIdAndName(function(err2){
                if (!err2){
                    //TODO: get the file extension of this Miix movie
                    aeServerMgr.createStoryMV( miixMovieProjectID, ownerStdID, ownerFbID, movieTitle, function(responseParameters){
                    
                        logger.info('generating Story MV finished. ');
                        logger.info('res: _commandId='+responseParameters._commandId+' err='+responseParameters.err+' youtube_video_id='+responseParameters.youtube_video_id);
                        
                        if ( responseParameters.youtube_video_id ) {
                            var aeServerID = responseParameters.ae_server_id;
                            var youtubeVideoID = responseParameters.youtube_video_id;
                            var storyMovieProjectID = responseParameters.movie_project_id;
                            logger.info('storyMovieProjectID= '+storyMovieProjectID);
                            //var youtubeVideoID = "VNrn-jhmLBE"; //GZ temporarily hard code for test
                            
                            
                            
                            if ( responseParameters.err == 'null' || (!responseParameters.err) ) {
                            
                                
                                var url = {"youtube":"http://www.youtube.com/embed/"+youtubeVideoID};			
                                var vjson = {"title": movieTitle,
                                             "ownerId": {"_id": ownerStdID, "userID": ownerFbID},
                                             "url": url,
                                             "genre":"miix_story",
                                             "aeId": aeServerID,
                                             "projectId":storyMovieProjectID};
                                UGCDB.addUGC(vjson, function(err, result){
                                    if(err) {
                                        throw err;
                                    }
                                    else {
                                        fmapi._fbPostUGCThenAdd(vjson); 
                                        logger.info('fmapi._fbPostUGCThenAdd(vjson) called. vjson='+JSON.stringify(vjson));
                                    }
                                });
                            }
                            
                        }
                        
                    });
                }
                else{
                    logger.info('fail to get user ID and name');
                }
            });
        }
        else {
            logger.info('fail to download Story Movie from Cam Controller to AE Server');
        }
        
        
    });*/
    
    
    
    //------ using async -----
    async.series([
                  function(cb1){
                      //console.log('step.1 start');
                      downloadStoryMovieFromStoryCamControllerToAeServer( miixMovieProjectID, function(err1){
                          //console.log('step.1 end');
                          cb1(err1);
                      });
                  },
                  function(cb2){
                      //console.log('step.2 start');
                      getUserIdAndName(function(err2){
                          //console.log('step.2 end');
                          cb2(err2);
                      });
                  },
                  function(cb3){
                      //console.log('step.3 start');
                      //get the file extension of this Miix movie
                      UGCDB.getValueByProject(miixMovieProjectID, "fileExtension", function(err3, result){ 
                          //console.log('step.3 end');
                          if (!err3){
                              if (result){
                                  miixMovieFileExtension = result.fileExtension;
                              }                              
                              cb3(null);
                          }
                          else {
                              cb3("UGCDB.getValueByProject() failed: "+err3);
                          }
                          
                      });
                      
                  },
                  function(cb5){
                      //console.log('step.5 start');
                      downloadMiixMovieFromS3(miixMovieProjectID, miixMovieFileExtension, function(err5){
                          //console.log('step.5 end');
                          cb5(err5);
                      });
                  },
                  function(cb4){
                      //console.log('step.4 start');
                      aeServerMgr.createStoryMV( miixMovieProjectID, miixMovieFileExtension, ownerStdID, ownerFbID, movieTitle, function(responseParameters){
                          //console.log('step.4 end');
                          logger.info('generating Story MV finished. ');
                          logger.info('res: _commandId='+responseParameters._commandId+' err='+responseParameters.err+' youtube_video_id='+responseParameters.youtube_video_id);
                          
                          if ( responseParameters.youtube_video_id ) {
                              var aeServerID = responseParameters.ae_server_id;
                              var youtubeVideoID = responseParameters.youtube_video_id;
                              var storyMovieProjectID = responseParameters.movie_project_id;
                              logger.info('storyMovieProjectID= '+storyMovieProjectID);
                              //var youtubeVideoID = "VNrn-jhmLBE"; //GZ temporarily hard code for test
                              
                              
                              
                              if ( responseParameters.err == 'null' || (!responseParameters.err) ) {
                              
                                  
                                  var url = {"youtube":"http://www.youtube.com/embed/"+youtubeVideoID};           
                                  var vjson = {"title": movieTitle,
                                               "ownerId": {"_id": ownerStdID, "userID": ownerFbID},
                                               "url": url,
                                               "genre":"miix_story",
                                               "aeId": aeServerID,
                                               "projectId":storyMovieProjectID,
                                               "liveTime":parseInt(record_time)};
                                  //add story MV notification
                                  postStoryMVRenderOK(miixMovieProjectID, recordTime, url.youtube, function(err, res){
                                    if(err)
                                        logger.info('Post FB message is Error: ' + err);
                                    else
                                        logger.info('Post FB message is Success: ' + res);
                                        
                                      //UGCDB.addUGC(vjson, function(err, result){
                                      db.addUserLiveContent(vjson, function(err, result){
                                          if(err) {
                                              cb4("UGCDB.addUGC() failed : "+ err);
                                          }
                                          else {
                                              fmapi._fbPostUGCThenAdd(vjson); 
                                              logger.info('fmapi._fbPostUGCThenAdd(vjson) called. vjson='+JSON.stringify(vjson));
                                              cb4(null);
                                          }
                                      });
                                  });
                              }
                              
                          }
                          else {
                              cb4("Failed to created Story MV.");
                          }
                         
                      });
                  }
              ],
              
              
              function(err, results){
                  if (err) {
                      logger.error(err);
                  }
              });
    
};

module.exports = storyContentMgr;
