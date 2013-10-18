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
var gm = require('gm');
var db = require('../db.js');
var UGCDB = require(process.cwd()+'/ugc.js');
var programTimeSlotModel = db.getDocModel("programTimeSlot");
var ugcModel = db.getDocModel("ugc");
var memberModel = db.getDocModel("member");
var execFile = require('child_process').execFile;
var recordTime = '';
    
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
    
    var miix_story = function(option, liveVideo_cb){
        //uploadVideoToAwsS3
        //updateVideoToUGC
        //send restful api: /internal/story_cam_controller/available_story_movie
    };
    
    var miix_image_live_photo = function(option, livePhoto_cb){
        
        var list = {
            ugc: '',
            file: '',
            awsS3: '',
            highlight: '',  //highlight only.
            highlightAwsS3: '',  //highlight only.
        };
        //console.dir(option);
        async.waterfall([
            function(actionSetting_cb){
                actionSetting(option.programInterval, function(err, action, ugc){
                    // list.ugc = ugc;
                    actionSetting_cb(err, action);
                });
            },
            function(action, cuttingImage_cb){ 
                cuttingImageFromVideo(option, action, function(err, imagePath){
                    list.file = imagePath;
                    cuttingImage_cb(null);
                }); 
            },
            // For highlight only : start
//            function(highlight_cb){
//                getHighlightPhoto(list.file, function(err, highlightPath){
//                    list.highlight = highlightPath;
//                    highlight_cb(null);
//                });
//            },
//            function(highlightAwsS3_cb){
//                uploadHighlightPhotoToAwsS3(list.highlight, function(err, highlightS3Path){
//                    list.highlightAwsS3 = highlightS3Path;
//                    highlightAwsS3_cb(null);
//                });
//            },
            // For highlight only : end
            function(uploadAwsS3_cb){
                uploadToAwsS3(list.file, function(err, s3Path){
                    list.awsS3 = s3Path;
                    uploadAwsS3_cb(null);
                });
            },
            function(updateLiveContent_cb){
                updateLiveContent(option.programInterval, list, function(err, res){
                    updateLiveContent_cb(null, res);
                });
            },
        ], function(err, res){
            //clear
            // clearMemory(option.filePath, list.file, function(status){
                // livePhoto_cb(null, status);
            // });
            clearMemoryAndHighlight(option.filePath, list.file, list.highlight, function(status){
                livePhoto_cb(null, status);
            });
        });
    };
    
    async.parallel([
        function(filepath){ getLiveVideo(recordTime, filepath); },
        function(programInterval){ findMember(recordTime, programInterval); },
    ], function(err, res){
        var option =
        {
            filePath: res[0],
            programInterval: res[1]
        };
        if(option.programInterval.count == 0)
        {
            logger.info('Get live record video is failed: ' + recordTime);
            return;
        }
        else if(option.programInterval.count == 1)
            miix_story(option, function(err, res){ /* no work */ });
        else
            miix_image_live_photo(option, function(err, status){ 
                logger.info('Live content process is success: ' + recordTime);
            });
    });
    
    res.end();
};

var getLiveVideo = function(recordTime, report_cb){
    var s3Path =  '/camera_record/' + recordTime + '/'+ recordTime + '__story.avi';
    var savePath = path.join(__dirname, recordTime + '__story.avi');
    awsS3.downloadFromAwsS3(savePath, s3Path, function(err, res){
        (err)?report_cb(err, null):report_cb(null, savePath);
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

var cuttingImageFromVideo = function(option, action, cuttingImage_cb){

    var source = option.filePath;
    var part = 0,
        playTime = 0.0;
    var imagePath = [];
    
    var cutting = function(source, dest, specificTime, cutImage_cb){
        //ffmpeg -i {source} -y -f image2 -ss {specificTime} -vframes 1 {dest}
        execFile(path.join('ffmpeg.exe'), ['-y', '-i', source, '-f', 'image2', '-ss', specificTime, '-frames:v', '1', '-an', path.join(__dirname, dest)], function(error, stdout, stderr){
            if(error){
                logger.info('Get image content is failed: ' + path.join(__dirname, dest));
                cutImage_cb(error, null);
            }
            else{
                logger.info('Get image content is success: ' + path.join(__dirname, dest));
                cutImage_cb(null, path.join(__dirname, dest));
            }
        });
    };
    
    var cuttingImage = function(setting){
        if(setting.type != 'UGC'){
            playTime += setting.duration;
            part++;
            (part != action.length)?cuttingImage(action[part]):cuttingImage_cb(null, imagePath);
        }
        else{
            var interval = (parseFloat(playTime) + (parseFloat(setting.duration)/2)) / 1000;
            cutting(source, action[part].name, interval, function(err, filepath){
                imagePath.push(filepath);
                playTime += setting.duration;
                part++;
                (part != action.length)?cuttingImage(action[part]):cuttingImage_cb(null, imagePath);
            });
        }
    };
    cuttingImage(action[part]);
};

var actionSetting = function(programList, action_setting_cb){
    //[contentGenre]-[ownerId._id]-[time stamp]-[record time]
    var part = 0,
        ugcList = [],
        action = [];
    var naming = function(program, naming_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            ugcList.push(result[0]);
            naming_cb( program.contentGenre + '-' + 
                       result[0].ownerId._id + '-' + 
                       program.timeStamp + '-' +
                       recordTime + '.jpg' );
        });
    };    
    var setting = function(program){
        if(program.type != 'UGC'){
            var set = {
                type: 'padding',
                duration: parseFloat(program.timeslot.playDuration)
            };
            action.push(set);
            part++;
            (part != programList.list.length)?setting(programList.list[part]):action_setting_cb(null, action, ugcList);
        }
        else{
            var set = {
                type: 'UGC',
                name: '',
                duration: parseFloat(program.timeslot.playDuration)
            };
            //action.push(set);
            naming(program, function(imageName){
                set.name = imageName;
                action.push(set);
                part++;
                (part != programList.list.length)?setting(programList.list[part]):action_setting_cb(null, action, ugcList);
            });
        }
    }
    setting(programList.list[part]);
};

// Highlight page only : start
var getHighlightPhoto = function(fileset, highlight_cb){
    
    var part = 0;
    var highlightList = [];
    
    var photoResize = function(filepath){
        var hightlightName = filepath.replace(__dirname + '\\', '').split('.');
        var target = path.join(__dirname, hightlightName[0]+'-highlight.'+hightlightName[1]);
        gm( filepath )
        .resize(1920, 713, "!")
        .write(target, function (err) {
            // if (!err) {
                // console.log('Resize done');
            // }
            // else {
                // console.log('err='+err);
            // }
            highlightList.push(target);
            // (err)?highlight_cb(err, null):highlight_cb(null, 'Resize done');
            part++;
            (part != fileset.length)?photoResize(fileset[part]):highlight_cb(null, highlightList);
        });
    };
    photoResize(fileset[part]);
};

var uploadHighlightPhotoToAwsS3 = function(fileset, awsS3_cb){

    var part = 0;
    var awsS3List = [];
    
    var upload = function(file){
        var filetype = file.replace(__dirname + '\\', '').split('.');
        if((filetype[filetype.length-1] == 'jpg')||(filetype[filetype.length-1] == 'png')){
            var projectFolder = filetype[0].split('\\');
            var s3Path = '/user_project/' + filetype[0] + '/' + filetype[0] + '.' + filetype[filetype.length-1];
            awsS3List.push('https://s3.amazonaws.com/miix_content' + s3Path);
            awsS3.uploadToAwsS3(file, s3Path, 'image/jpeg', function(err,result){
                if (!err)
                    logger.info('Live content image was successfully uploaded to S3 '+s3Path);
                else
                    logger.info('Live content image failed to be uploaded to S3 '+s3Path);
                part++;
                (part != fileset.length)?upload(fileset[part]):awsS3_cb(null, awsS3List);
            });
        }
    };
    upload(fileset[part]);
};

var clearMemoryAndHighlight = function(rawFile, file, highlight, clear_cb){
    fs.unlink(rawFile);
    if(typeof(file) === 'function') {
        clear_cb = file;
        clear_cb('done');
    }
    else {
        for(var i=0; i<file.length; i++){
            fs.unlink(file[i]);
            fs.unlink(highlight[i]);
        };
        clear_cb('done');
    }
};

// Highlight page only : end

var uploadToAwsS3 = function(fileset, awsS3_cb){

    var part = 0;
    var awsS3List = [];
    
    var upload = function(file){
        var filetype = file.replace(__dirname + '\\', '').split('.');
        if((filetype[filetype.length-1] == 'jpg')||(filetype[filetype.length-1] == 'png')){
            var projectFolder = filetype[0].split('\\');
            var s3Path = '/user_project/' + filetype[0] + '/' + filetype[0] + '.' + filetype[filetype.length-1];
            awsS3List.push('https://s3.amazonaws.com/miix_content' + s3Path);
            awsS3.uploadToAwsS3(file, s3Path, 'image/jpeg', function(err,result){
                if (!err)
                    logger.info('Live content image was successfully uploaded to S3 '+s3Path);
                else
                    logger.info('Live content image failed to be uploaded to S3 '+s3Path);
                part++;
                (part != fileset.length)?upload(fileset[part]):awsS3_cb(null, awsS3List);
            });
        }
    };
    upload(fileset[part]);
};

var updateLiveContent = function(programList, list, update_cb){

    var part = 0,
        count = 0;
    
     var schema = function(program, livePhotoUrl, schema_cb){
//    var schema = function(program, livePhotoUrl, highlightPhotoUrl, schema_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            var ugc = result[0];
            var liveContentId = livePhotoUrl.split('/');
            liveContentId = liveContentId[liveContentId.length-1].split('.')[0];
            var livejson =
            {
                "ownerId": { '_id': ugc.ownerId._id, 
                             'fbUserId': ugc.ownerId.userID,
                             'userID': ugc.ownerId.userID },
                 'url': { 's3': livePhotoUrl, 'longPhoto': ugc.url.s3 },
//                'url': { 's3': livePhotoUrl, 'longPhoto': ugc.url.s3, 'highlight': highlightPhotoUrl },
                'genre': 'miix_image_live_photo',
                'projectId': liveContentId,
                'sourceId': ugc.projectId,
                'liveTime': parseInt(recordTime)
            };
            var ugcjson = ugc;
            schema_cb(livejson, ugcjson);
        });
    };
    var update = function(program){
        if(program.type != 'UGC'){
            part++;
            (part != programList.list.length)?update(programList.list[part]):update_cb(null, 'done');
        }
        else{
             schema(program, list.awsS3[count], function(live, ugc){
//            schema(program, list.awsS3[count], list.highlightAwsS3[count], function(live, ugc){
                async.series([
                    function(createLive_cb){
                        db.addUserLiveContent(live, function(err, result){
                            (err)?createLive_cb(null, err):createLive_cb(null, result);
                        });
                    },
                    function(updateUGC_cb){
                        ugcModel.findByIdAndUpdate(ugc._id, { 'doohPlayedTimes': ugc.doohPlayedTimes + 1 }, function(err, result){
                            (err)?updateUGC_cb(null, err):updateUGC_cb(null, result);
                        });
                    },
                ], function(err, res){
                    count++;
                    part++;
                    (part != programList.list.length)?update(programList.list[part]):update_cb(null, 'done');
                });
            });
        }
    };
    update(programList.list[part]);
};

var clearMemory = function(rawFile, file, clear_cb){
    fs.unlink(rawFile);
    if(typeof(file) === 'function') {
        clear_cb = file;
        clear_cb('done');
    }
    else {
        for(var i=0; i<file.length; i++){
            fs.unlink(file[i]);
        };
        clear_cb('done');
    }
};

/*--- old use, but don't delete ---*/

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
        /* postMessageAndPicture(ownerList[i]._id, photoUrl, function(err, res){
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
        }); */
        db.addUserLiveContent(vjson, function(err, result){
            //if(err) console.log(err);
            //else console.log(result);
            //if(!err) fmapi._fbPostUGCThenAdd(vjson);
            postMessageAndPicture(ownerList[i]._id, photoUrl, function(err, res){
                if(err)
                    logger.info('Post message and pictrue to user is Error: ' + err);
                else
                    logger.info('Post message and pictrue to user is Success: ' + res);
                i++;
                (i < ownerList.length)?update():updateUGC_cb(null, 'done');
            });
        });
    };
    update();
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

var postMessageAndPicture = function(_id, photoUrl, postPicture_cb){
    
    var access_token;
    var fb_name, playTime, start, link;
    
    var pushPhotosToUser = function(albumId, pushPhotos_cb){
        async.series([
            /*function(simulate){
                message = fb_name + '於' + playTime + '，登上台北天幕LED，上大螢幕APP特此感謝他精采的作品！\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                //facebookMgr.postPhoto(access_token, message, photoUrl.simulate, albumId, simulate);
                facebookMgr.postMessageAndShare(access_token, message, { link: photoUrl.simulate }, function(err, res){
                    (!err)?simulate(null, true):simulate(null, false);
                });
            },*/
            function(preview){
                var message = fb_name + '於' + playTime + '，登上台北天幕LED，，這是原始刊登素材，天幕尺寸：100公尺x16公尺。\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                //facebookMgr.postPhoto(access_token, message, photoUrl.preview, albumId, preview);
                facebookMgr.postMessageAndShare(access_token, message, { link: photoUrl.preview }, function(err, res){
                    (!err)?preview(null, true):preview(null, false);
                });
            },
            function(play){
                var message = fb_name + '於' + playTime + '，登上台北天幕LED，特此感謝他精采的作品！\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                //facebookMgr.postPhoto(access_token, message, photoUrl.play, albumId, play);
                facebookMgr.postMessageAndShare(access_token, message, { link: photoUrl.play }, function(err, res){
                    (!err)?play(null, true):play(null, false);
                });
            },
        ], function(err, res){
            //(err)?console.log(err):console.dir(res);
            /* if(!err){
                logger.info('post message to user on facebook, fb id is ' + fb_id);
                pushPhotos_cb(null, 'done');
            }
            else
                pushPhotos_cb(err, null); */
            
            (err)?logger.info('post message to user on facebook is failed, member id is ' + _id):'';
            (res[0])?logger.info('post preview message to user on facebook is success, member id is ' + _id):logger.info('post preview message to user on facebook is failed, member id is ' + _id);
            (res[1])?logger.info('post play message to user on facebook is success, member id is ' + _id):logger.info('post play message to user on facebook is failed, member id is ' + _id);
            pushPhotos_cb(null, 'done');
        });
    };
    //
    async.waterfall([
        function(memberSearch){
            memberModel.find({'_id': _id}).exec(memberSearch);
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