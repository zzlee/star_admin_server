/**
 *  story_cam_controller_handler.js
 */
 
var FM = { storyCamControllerHandler: {} };
var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info( typeof(str)==='string' ? str : JSON.stringify(str)); } : function(str){} ;

var storyContentMgr = require('../story_content_mgr.js');  

var fs = require('fs'),
    path = require('path'),
    request = require('request');
var async = require('async');
var awsS3 = require('../aws_s3.js');
var facebookMgr = require('../facebook_mgr.js');
var pushMgr = require('../push_mgr.js');
var db = require('../db.js');
var UGCDB = require(process.cwd()+'/ugc.js');
var programTimeSlotModel = db.getDocModel("programTimeSlot");
var ugcModel = db.getDocModel("ugc");
var memberModel = db.getDocModel("member");
var execFile = require('child_process').execFile;
var recordTime = '';
var savePath = '';
var fileList = [];
var ownerList = [];
var awsS3List = [];
var doohPreviewList = [];
    
//POST /internal/story_cam_controller/available_story_movie
FM.storyCamControllerHandler.availableStoryMovie_post_cb = function(req, res) {

    if ( req.headers.miix_movie_project_id ) {
        storyContentMgr.generateStoryMV( req.headers.miix_movie_project_id, req.headers.record_time );
        res.send(200);
    }
	else {
		res.send(400, {error: "Bad Request!"} );
	}

};

FM.storyCamControllerHandler.availableStreetMovies = function(req, res){

    logger.info('get story cam report: ' + req.params.playTime);
    
    recordTime = req.params.playTime;
    
    async.waterfall([
        //step.1 : get video file by aws s3
        function(callback){
            getStreetVideo(recordTime, function(err, res){
                //console.log('step.1 : done');
                (err) ? callback(err, null) : callback(null, res);
            });
        },
        //step.2 : find member from database
        function(status, callback){
            findMember(recordTime, function(err, programInterval){
                //console.log('step.2 : done');
                (err) ? callback(err, null) : callback(null, programInterval);
            });
        },
        //step.3 : determine ugc type
        function(programInterval, callback){
            //console.log('step.3 : done');
            (programInterval.count == 1) ? callback(null, 'miix', programInterval) : callback(null, 'other', programInterval);
            /*
            determineUGCType(programInterval, function(err, res){
                console.log('step.3 : done');
                (err) ? callback(err, null) : callback(null, res, programInterval);
            });
            */
        },
        //step.4 : (type == 'video') ? upload video to aws S3 : cutting image from video
        function(type, programInterval, callback){
            if(type == 'miix'){
                uploadVideoToAwsS3(programInterval, function(err, res){
                    //console.log('step.4 : done (video)');
                    (err) ? callback(err, null) : callback(null, type, programInterval);
                });
            }
            else {
                //cuttingImage
                cuttingImageFromVideo(programInterval, function(err, res){
                    //console.log('step.4 : done (image)');
                    (err) ? callback(err, null) : callback(null, type, programInterval);
                });
            }
        },
        //step.5 : (type == 'video') ? update to ugc database : upload image to aws S3
        function(type, programInterval, callback){
            if(type == 'miix'){
                updateVideoToUGC(programInterval, function(err, res){
                    //console.log('step.5 : done (video)');
                    (err) ? callback(err, null) : callback(null, type, programInterval);
                });
            }
            else {
                uploadToAwsS3(function(err, awsStatus){
                    //console.log('step.5 : done (image)');
                    (err) ? callback(err, null) : callback(null, type, programInterval);
                });
            }
        },
        //step.6 : (type == 'video') ? push to AE server : update to ugc database
        function(type, programInterval, callback){
            if(type == 'miix'){
                //console.log('step.6 : done (video)');
                var projectId = awsS3List[0].split('/');
                projectId = projectId[projectId.length-1].split('__');
                //callback(null, type, 'done');
                var url = 'http://127.0.0.1/internal/story_cam_controller/available_story_movie';
                var headers = { 'miix_movie_project_id' : projectId, 'record_time' : recordTime };
                request.post({ url: url, headers: headers }, function (e, r, body) {
                    callback(null, type, 'done');
                });
            }
            else {
                updateToUGC(function(err, ugc_cb){
                    //console.log('step.6 : done (image)');
                    (err) ? callback(err, null) : callback(null, type, 'done');
                });
            }
        },
    ], function(err, type, res){
        //step.final : clear temp file
        (type)?logger.info('UGC video push to AE server : ok!'):logger.info('UGC image cutting from video : ok!');
        //clear file
        savePath = '';
        for(var i=0; i<fileList.length; i++){
            fs.unlink(fileList[i]);
        };
        fileList = [];
        ownerList = [];
        awsS3List = [];
        doohPreviewList = [];
    });
    
    res.end();
};

var getStreetVideo = function(recordTime, report_cb){
    var s3Path =  '/camera_record/' + recordTime + '/'+ recordTime + '__story.avi';
    savePath = path.join(__dirname, recordTime + '__story.avi');
    fileList.push(savePath);
    awsS3.downloadFromAwsS3(savePath, s3Path, function(err, res){
        report_cb(err, res);
    });
};

var findMember = function(recordTime, find_cb){
    var count = 0;
    var schema = {};
    
    programTimeSlotModel.find({ 
        "timeslot.start": {$lte: recordTime}, 
        "timeslot.end": {$gte: recordTime}, 
        //"type": "UGC",
    }).sort({timeStamp:1}).exec(function (_err, result) {
        for(var i=0; i<result.length; i++)
            (result[i].type == 'UGC') ? count++ : '';
        schema.count = count;
        schema.list = result;
        find_cb(_err, schema);
    });
};

var cuttingImageFromVideo = function(programInterval, cuttingImage_cb){

    var cuttingTime = programInterval.count;
    var source = savePath;
    var name = '',
        part = 0,
        playTime = 0.0;

    var cuttingImage = function(){
        
        if(programInterval.list[part].type != 'UGC') {
            playTime += parseInt(programInterval.list[part].timeslot.playDuration / 1000);
            if(0 == cuttingTime)
                cuttingImage_cb(null, 'ok');
            else if(part > programInterval.list.length)
                cuttingImage_cb(null, 'no find program');
            else {
                part++;
                cuttingImage();
            }
        }
        else {
            imageNaming(programInterval.list[part], function(dest){
                fileList.push(path.join(__dirname, dest));
                cutImage(source, path.join(__dirname, dest), parseInt(playTime)+1, function(status){
                    playTime += parseInt(programInterval.list[part].timeslot.playDuration / 1000);
                    cuttingTime--;
                    if(0 == cuttingTime)
                        cuttingImage_cb(null, 'ok');
                    else if(part > programInterval.list.length)
                        cuttingImage_cb(null, 'no find program');
                    else {
                        part++;
                        cuttingImage();
                    }
                });
            });
        }
    };
    cuttingImage();
};

var cutImage = function(source, dest, specificTime, cutImage_cb){
    //ffmpeg -i {source} -y -f image2 -ss {specificTime} -vframes 1 {dest}
    execFile(path.join('ffmpeg.exe'), ['-y', '-i', source, '-f', 'image2', '-ss', specificTime, '-frames:v', '1', '-an', dest], function(error, stdout, stderr){
        logger.info('image content: ' + path.join(__dirname, dest));
        cutImage_cb('done');
    });
};

var imageNaming = function(ugcInfo, naming_cb){
    //[contentGenre]-[ownerId._id]-[time stamp]
    var name = '';
    ugcModel.find({"_id": ugcInfo.content._id}).exec(function (_err, result) {
        ownerList.push(result[0].ownerId);
        doohPreviewList.push({ doohPreviewUrl: result[0].doohPreviewUrl, url: result[0].url.s3 });
        name = ugcInfo.contentGenre + '-' + 
               result[0].ownerId._id + '-' + 
               ugcInfo.timeStamp + '.jpg';
        naming_cb(name);
    });
};

var uploadToAwsS3 = function(awsS3_cb){

    var s3Path = '';
    var projectFolder = '';
    
    var i = 0;
    var upload = function(){
        var filetype = fileList[i].split('.');
        if((filetype[filetype.length-1] == 'jpg')||(filetype[filetype.length-1] == 'png')) {
            projectFolder = filetype[0].split('\\');
            s3Path = '/user_project/' + projectFolder[projectFolder.length-1] + '/' + projectFolder[projectFolder.length-1] + '.' + filetype[filetype.length-1];
            awsS3List.push('https://s3.amazonaws.com/miix_content' + s3Path);
            awsS3.uploadToAwsS3(fileList[i], s3Path, 'image/jpeg', function(err,result){
                if (!err){
                    logger.info('Live content image was successfully uploaded to S3 '+s3Path);
                }
                else {
                    logger.info('Live content image failed to be uploaded to S3 '+s3Path);
                }
            });
        }
        i++;
        (i < fileList.length)?upload():awsS3_cb(null, 'done');
    };
    upload();
};

var updateToUGC = function(updateUGC_cb){

    var i = 0;
    
    var update = function(){
        var projectId = awsS3List[i].split('/');
        projectId = projectId[projectId.length-1].split('.');
        var vjson = {
            "ownerId": { '_id': ownerList[i]._id, 
                         'fbUserId': ownerList[i].userID,
                         'userID': ownerList[i].userID },
            'url': { 's3': awsS3List[i], 'longPhoto': doohPreviewList[i].url },
            'genre': 'miix_image_live_photo',
            'projectId': projectId[0],
            'liveTime': parseInt(recordTime)
        };
        var photoUrl = 
        {
            preview: doohPreviewList[i].url,
            simulate: doohPreviewList[i].doohPreviewUrl,
            play: awsS3List[i]
        };
        postMessageAndPicture(ownerList[i].userID, photoUrl, function(err, res){
            if(err)
                logger.info('Post message and pictrue to user is Error: ' + err);
            else
                logger.info('Post message and pictrue to user is Success: ' + res);
            
            db.addUserLiveContent(vjson, function(err, result){
                //if(err) console.log(err);
                //else console.log(result);
                //if(!err) fmapi._fbPostUGCThenAdd(vjson);
                i++;
                (i < ownerList.length)?update():updateUGC_cb(null, 'done');
            });
        });
    };
    update();
};

var clearMemory = function(clear_cb){
    savePath = '';
    for(var i=0; i<fileList.length; i++){
        fs.unlink(fileList[i]);
    };
    fileList = [];
    ownerList = [];
    awsS3List = [];
    
    clear_cb('done');
};
//subject to modification
var determineUGCType = function(programInterval, determine_cb){
    console.log('determineUGCType : enter');
    var type = '';
    var i;
    for(i=0; i<programInterval.list.length; i++) {
        ugcModel.find({"_id": programInterval.list[i].content._id}).exec(function (_err, result) {
            console.log(result);
            if((result.length > 0) && (result[0].genre == 'miix'))
                type = 'miix';
            console.log('find: ' + type);
        });
        console.log('out: ' + type);
        if(i == programInterval.list.length-1)
            (type == 'miix') ? determine_cb(null, 'miix') : determine_cb(null, 'other');
    }
};

var uploadVideoToAwsS3 = function(programInterval, awsS3_cb){

    var contentId = '';
    var s3Path = '';
    var upload = function(contentId){
        ugcModel.find({"_id": contentId}).exec(function (_err, result) {
            var name = result[0].projectId + '__story.avi';
            s3Path = '/user_project/' + result[0].projectId + '/' + name;
            awsS3List.push('https://s3.amazonaws.com/miix_content' + s3Path);
            awsS3.uploadToAwsS3(fileList[0], s3Path, 'video/x-msvideo', function(err,result){
                if (!err){
                    logger.info('Live content video was successfully uploaded to S3 '+s3Path);
                    awsS3_cb(null, 'success');
                }
                else {
                    logger.info('Live content video failed to be uploaded to S3 '+s3Path);
                    awsS3_cb(null, 'failed');
                }
            });
        });
    };
    
    for(var i=0; i<programInterval.list.length; i++){
        if(programInterval.list[i].type == 'UGC')
            upload(programInterval.list[i].content._id);
    }
};

var updateVideoToUGC = function(programInterval, updateVideoToUGC_cb){
    
    var update = function(contentId){
        ugcModel.find({"_id": contentId}).exec(function (_err, result) {
            var projectId = awsS3List[0].split('/');
            projectId = projectId[projectId.length-1].split('__');
            //TODO 'liveTime' need to implement
            var vjson = {
                "ownerId": { '_id': result[0].ownerId._id, 
                             'userID': result[0].ownerId.userID,
                             'fbUserId': result[0].ownerId.userID },
                'url': { 's3': awsS3List[0]},
                'genre': 'miix_story',
                'projectId': projectId[0],
                'liveTime': parseInt(recordTime)
            };
            db.addUserLiveContent(vjson, function(err, result){
                //if(err) console.log(err);
                //else console.log(result);
                updateVideoToUGC_cb(null, 'done');
            });
        });
    };
    
    for(var i=0; i<programInterval.list.length; i++){
        if(programInterval.list[i].type == 'UGC')
            update(programInterval.list[i].content._id);
    }
};

var postMessageAndPicture = function(fb_id, photoUrl, postPicture_cb){
    
    var access_token;
    var fb_name, playTime, start, link;
    
    var pushPhotosToUser = function(albumId, pushPhotos_cb){
        async.series([
            /*function(simulate){
                message = fb_name + '於' + playTime + '，登上台北天幕LED，上大螢幕APP特此感謝他精采的作品！\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                facebookMgr.postPhoto(access_token, message, photoUrl.simulate, albumId, simulate);
            },*/
            function(preview){
                var message = fb_name + '於' + playTime + '，登上台北天幕LED，，這是原始刊登素材，天幕尺寸：100公尺x16公尺。\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                //facebookMgr.postPhoto(access_token, message, photoUrl.preview, albumId, preview);
                facebookMgr.postMessage(access_token, message, photoUrl.preview, preview);
            },
            function(play){
                var message = fb_name + '於' + playTime + '，登上台北天幕LED，特此感謝他精采的作品！\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                //facebookMgr.postPhoto(access_token, message, photoUrl.play, albumId, play);
                facebookMgr.postMessage(access_token, message, photoUrl.play, play);
            },
        ], function(err, res){
            //(err)?console.log(err):console.dir(res);
            if(!err){
                logger.info('post message to user on facebook, fb id is ' + fb_id);
                pushPhotos_cb(null, 'done');
            }
            else
                pushPhotos_cb(err, null);
        });
    };
    //
    async.waterfall([
        function(memberSearch){
            memberModel.find({'fb.userID': fb_id}).exec(memberSearch);
        },
    ], function(err, member){
        access_token = member[0].fb.auth.accessToken;
        fb_name = member[0].fb.userName;
        start = new Date(parseInt(recordTime));
        if(start.getHours()>12)
            playTime = start.getFullYear()+'年'+(start.getMonth()+1)+'月'+start.getDate()+'日下午'+(start.getHours()-12)+':'+start.getMinutes();
        else
            playTime = start.getFullYear()+'年'+(start.getMonth()+1)+'月'+start.getDate()+'日上午'+start.getHours()+':'+start.getMinutes();
        
        var album_name = '實況記錄：' + start.getFullYear()+'年'+(start.getMonth()+1)+'月'+start.getDate()+'日' + '登上台北天幕LED';
        var album_message = '';
        var message = fb_name + '於' + playTime + '，登上台北天幕LED，特此感謝您精采的作品！\n' + 
                      '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
        
        async.waterfall([
            function(push_cb){
                pushMgr.sendMessageToDeviceByMemberId(member[0]._id, message, function(err, res){
                    logger.info('push played notification to user, member id is ' + member[0]._id);
                    push_cb(err, res);
                });
            }
        ], function(err, res){
            /*facebookMgr.createAlbum(access_token, album_name, album_message, function(err, res){
                logger.info('create fb album for user, member id is ' + member[0]._id);
                pushPhotosToUser(JSON.parse(res).id, postPicture_cb);
            });*/
            pushPhotosToUser('', postPicture_cb);
            //postPicture_cb(err, res);
        });
        
    });
};

module.exports = FM.storyCamControllerHandler;