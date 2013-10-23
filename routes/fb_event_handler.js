/**
 *  fb_event_handler.js
 */
 
var FM = { fb_event_handler: {} };
var workingPath = process.cwd();

var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info( typeof(str)==='string' ? str : JSON.stringify(str)); } : function(str){} ;

var facebookMgr = require('../facebook_mgr.js');
// var canvasProcessMgr = require('../canvas_process_mgr.js');

var fs = require('fs');
var path = require('path');

var FMDB = require('../db.js');
var async = require('async');

/* ------ Handler API ------ */    

//POST /fb/image_uplaod/base64
FM.fb_event_handler.fbUploadImageByBase64 = function(req, res) {
    
    var myToken = req.body.access_token;
    var base64Data = req.body.image.replace(/^data:image\/png;base64,/,"");
    var liveContent_Id = req.body.liveContent_Id;
    var ugcProjectId = req.body.ugcProjectId;
    // var filename = path.join(__dirname, "out.png");
    var filename = new Date().getTime() + ".png";
    fs.writeFile(filename, base64Data, 'base64', function(err) {
        // console.log(err);
        var filepath = filename;
        facebookMgr.postPhotoFromLocal(myToken, filepath, function(err, res){
            // (err)?console.dir('facebookMgr: ' + err):console.dir('facebookMgr: ' + res);
            if(err)
                logger.info('Post FB Text on Photo is Status: ' + err);
            else{
                logger.info('Post FB Text on Photo is Status: ' + res);
                
                var fbObj = JSON.parse(res);
                console.log('liveContent_Id'+liveContent_Id);
                console.log('ugcProjectId'+ugcProjectId);
                if(liveContent_Id !== null && liveContent_Id !== undefined){
                    console.log('liveContent_Id'+liveContent_Id, fbObj.id);
                    putFbPostIdLiveContentsBy_id(liveContent_Id, fbObj.id, function(err, res){
                        logger.info('The status of save FB post id to DB is: ' + res);
                        fs.unlinkSync(filepath);
                    });
                }else if(ugcProjectId !== null && ugcProjectId !== undefined){
                    console.log('ugcProjectId'+ugcProjectId, fbObj.id);
                    putFbPostIdUgcs(ugcProjectId, fbObj.id, function(err, res){
                        logger.info('The status of save FB post id to DB is: ' + res);
                        fs.unlinkSync(filepath);
                    });
                }
            }
        });
    });
    res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin' : '*'
    });
    res.send('done');
    res.end();
    
    var putFbPostIdUgcs = function(ugcProjectID, fbPostId, cbOfPutFbPostIdUgcs){
        var ugcModel = FMDB.getDocModel("ugc");
        
        async.waterfall([
            function(callback){
                ugcModel.find({ "projectId": ugcProjectID}).sort({"createdOn":-1}).exec(function (err, ugcObj) {
                    if (!err)
                        callback(null, ugcObj);
                    else
                        callback("Fail to retrieve UGC Obj from DB: "+err, ugcObj);
                });
                
            },
            function(ugcObj, callback){
                var vjson;
                var arr = [];
                
                if(ugcObj[0].fb_postId[0]){
                  ugcObj[0].fb_postId.push({'postId': fbPostId});
                  vjson = {"fb_postId" :ugcObj[0].fb_postId};
                }else{
                    arr = [{'postId': fbPostId}];
                    vjson = {"fb_postId" : arr};
                }
                
                FMDB.updateAdoc(ugcModel, ugcObj[0]._id, vjson, function(errOfUpdateUGC, resOfUpdateUGC){
                    if (!errOfUpdateUGC){
                        callback(null, resOfUpdateUGC);
                    }else
                        callback("Fail to update UGC Obj from DB: "+errOfUpdateUGC, resOfUpdateUGC);
                });
                
            }
        ],
        function(err, result){
            if (cbOfPutFbPostIdUgcs){
                cbOfPutFbPostIdUgcs(err, result);
            } 
        });
    };
    
    var putFbPostIdLiveContentsBy_id = function(liveContent_id, fbPostId, cbOfPutFbPostIdLiveContents){
        var userLiveContentModel = FMDB.getDocModel("userLiveContent");
        
        async.waterfall([
            function(callback){
                userLiveContentModel.find({ "_id": liveContent_id}).sort({"createdOn":-1}).exec(function (err, userLiveContentObj) {
                    if (!err)
                        callback(null, userLiveContentObj);
                    else
                        callback("Fail to retrieve UGC Obj from DB: "+err, userLiveContentObj);
                });
                
            },
            function(userLiveContentObj, callback){
                var vjson;
                var arr = [];
                
                if(userLiveContentObj[0].fb_postId[0]){
                    userLiveContentObj[0].fb_postId.push({'postId': fbPostId});
                  vjson = {"fb_postId" :userLiveContentObj[0].fb_postId};
                }else{
                    arr = [{'postId': fbPostId}];
                    vjson = {"fb_postId" : arr};
                }
                
                FMDB.updateAdoc(userLiveContentModel, liveContent_id, vjson, function(errOfUpdateUserLiveContent, resOfUpdateUserLiveContent){
                    if (!errOfUpdateUserLiveContent){
                        callback(null, resOfUpdateUserLiveContent);
                    }else
                        callback("Fail to update liveContent Obj from DB: "+errOfUpdateUserLiveContent, resOfUpdateUserLiveContent);
                });
                
            }
        ],
        function(err, result){
            if (cbOfPutFbPostIdLiveContents){
                cbOfPutFbPostIdLiveContents(err, result);
            } 
        });
    };
};


//POST /fb/image_uplaod
FM.fb_event_handler.fbUploadImage = function(req, res){
    
};

module.exports = FM.fb_event_handler;