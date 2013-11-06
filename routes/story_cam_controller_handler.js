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
        
        var list = {
            ugc: '',
            file: '',
            awsS3: ''
        };
        async.waterfall([
            function(uploadAwsS3_cb){
                uploadVideoToAwsS3(option, function(err, s3Path){
                    list.awsS3 = s3Path;
                    uploadAwsS3_cb(null);
                });
            },
            function(updateLiveVideoContent_cb){
                updateLiveVideoContent(option.programInterval, list, function(err, res){
                    updateLiveVideoContent_cb(null);
                });
            },
            function(renderLive_cb){
                // var projectId = list.awsS3[0].split('/');
                // projectId = projectId[projectId.length-1].split('__')[0];
                // var url = 'http://127.0.0.1/internal/story_cam_controller/available_story_movie';
                // var headers = { 'miix_movie_project_id' : projectId, 'record_time' : recordTime };
                // request.post({ url: url, headers: headers }, function (e, r, body) {
                    // renderLive_cb(null, 'done');
                // });
                renderLive_cb(null, 'done');
            },
        ], function(err, res){
            //clear
            clearMemory(option.filePath, function(status){
                liveVideo_cb(null, status);
            });
        });
    };
    
    var miix_image_live_photo = function(option, livePhoto_cb){
        
        var list = {
            ugc: '',
            file: '',
            awsS3: ''
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
            clearMemory(option.filePath, list.file, function(status){
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
            miix_story(option, function(err, res){
                logger.info('Live video content process is success: ' + recordTime);
            });
        else
            miix_image_live_photo(option, function(err, status){ 
                logger.info('Live photo content process is success: ' + recordTime);
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

var uploadVideoToAwsS3 = function(option, awsS3_cb){
    
    var source = option.filePath,
        programInterval = option.programInterval;
    var awsS3List = [];
    
    var upload = function(contentId){
        ugcModel.find({"_id": contentId}).exec(function (_err, result) {
            var name = result[0].projectId + '__story.avi';
            var s3Path = '/user_project/' + result[0].projectId + '/' + name;
            awsS3List.push('https://s3.amazonaws.com/miix_content' + s3Path);
            awsS3.uploadToAwsS3(source, s3Path, 'video/x-msvideo', function(err,result){
                if (!err){
                    logger.info('Live content video was successfully uploaded to S3 '+s3Path);
                    awsS3_cb(null, awsS3List);
                }
                else {
                    logger.info('Live content video failed to be uploaded to S3 '+s3Path);
                    awsS3_cb(null, awsS3List);
                }
            });
        });
    };
    
    for(var i=0; i<programInterval.list.length; i++){
        if(programInterval.list[i].type == 'UGC')
            upload(programInterval.list[i].content._id);
    }
};

var updateLiveVideoContent = function(programList, list, update_cb){
    
    var part = 0,
        count = 0;
    
    var schema = function(program, liveVideoUrl, schema_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            var ugc = result[0];
            var liveContentId = liveVideoUrl.split('/');
            liveContentId = liveContentId[liveContentId.length-1].split('__')[0];
            var livejson =
            {
                "ownerId": { '_id': ugc.ownerId._id, 
                             'fbUserId': ugc.ownerId.userID,
                             'userID': ugc.ownerId.userID },
                'url': { 's3': liveVideoUrl },
                'genre': 'miix_story_raw',
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

module.exports = FM.storyCamControllerHandler;