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
    
    var live_video = function( option, liveVideo_cb ){
        
        // console.dir(option.filePath);
        // console.dir(option.programInterval);
        
        var file = option.filePath,
            program = option.programInterval;
        
        async.waterfall([
            function( setting_cb ){ videoSetting( program, setting_cb ); },
            function( target, categories_cb ){ videoCategoriesByUser( file, target, categories_cb ); },
            function( target, update_cb ){ updateLiveVideoContent( program, target, update_cb ); },
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
        ], function( err, res ){
            // (err)?console.dir(err):console.dir(res);
            liveVideo_cb( err, res );
        });
    };
    
    async.parallel([
        function(filePath){ getLiveVideo(recordTime, filePath); },
        function(programInterval){ findMember(recordTime, "UGC", programInterval); },
    ], function(err, res){
        var option =
        {
            filePath: res[0],
            programInterval: res[1]
        };
        if(option.programInterval.count == 0)
        {
            logger.info('Get live video owner is failed: ' + recordTime);
            return;
        }
        
        live_video(option, function(err, res){ 
            /* clear aws s3. */ 
            clearVideo( option.filePath, function( err, res ){
                if(err)
                    logger.info('Delete live video is failed: ' + recordTime);
                else
                    logger.info('Delete live video is Successful: ' + recordTime);
            } );
        });
        
    });
    
    res.end();
};

FM.storyCamControllerHandler.availableStreetPhotos = function(req, res){
    
    logger.info('get story cam report: ' + req.params.playTime);
    recordTime = req.params.playTime;
    
    var live_photo = function(option, livePhoto_cb){
        
        // console.dir(option.filePath);
        // console.dir(option.programInterval);
        
        var file = option.filePath,
            program = option.programInterval;
        
        async.waterfall([
            function( setting_cb ){ targetSetting( program, file, setting_cb ); },
            function( target, categories_cb ){ photoCategoriesByUser( file, target, categories_cb ); },
            function( target, assign_cb){ assignPhotoToProject( program, target, assign_cb ); },
            function( swarm, update_cb ){ updateLivePhotoContent( program, swarm, update_cb ); },
        ], function( err, res ){
            // (err)?console.dir(err):console.dir(res);
            livePhoto_cb( err, res );
        });
        
    };
    
    async.parallel([
        function(filePath){ getLivePhoto(recordTime, filePath); },
        function(programInterval){ findMember(recordTime, "UGC", programInterval); },
    ], function(err, res){
        var option =
        {
            filePath: res[0],
            programInterval: res[1]
        };
        if(option.programInterval.count == 0)
        {
            logger.info('Get live photo owner is failed: ' + recordTime);
            return;
        }
        
        live_photo(option, function(err, res){ 
            /* clear aws s3. */ 
            clearPhotos( option.filePath, function( err, res ){
                if(err)
                    logger.info('Delete live photos is failed: ' + recordTime);
                else
                    logger.info('Delete live photos is Successful: ' + recordTime);
            } );
        });
        
    });
    
    res.end();
};

var findMember = function( recordTime, type, find_cb ){
    var count = 0;
    var schema = {};
    var query = { 
        "timeslot.start": {$lte: recordTime}, 
        "timeslot.end": {$gte: recordTime}, 
        // "type": "UGC",
    };
    
    if(typeof(type) === 'function') {
        find_cb = type;
    }
    else {
        query.type = type;
    }
    
    programTimeSlotModel.find(query).sort({timeStamp:1}).exec(function (_err, result) {
        for(var i=0; i<result.length; i++)
            (result[i].type == 'UGC') ? count++ : '';
        schema.count = count;
        schema.list = result;
        find_cb(_err, schema);
    });
};


/*--- live photos ---*/
var getLivePhoto = function( recordTime, report_cb ){

    var S3List = [];
    
    awsS3.listAwsS3('camera_record/' + recordTime, function(err, res){
        // (err)?console.log(err):console.dir(res);
        for(var i=0; i<res.Contents.length; i++) {
            // console.log('Path: ' + '/' + res.Contents[i].Key);
            S3List.push('/' + res.Contents[i].Key);
        }
        report_cb(err, S3List);
    });
    
};

var targetSetting = function( programInterval, sourceList, setting_cb ){
    //[contentGenre]-[ownerId._id]-[time stamp]-[record time]
    var folder_path = 'user_project/';
    var naming = function(program, no, naming_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            var project_path = program.contentGenre + '-' + 
                               result[0].ownerId._id + '-' + 
                               program.timeStamp + '-' +
                               recordTime;
            naming_cb( null, 
                       folder_path + project_path + '/' + project_path + '-' + no + '.jpg' );
        });
    };
    
    var settingConsole = function(target, no, event){
        event.push(function(callback){ naming(target, no, callback); });
    };
    
    var execute = [];
    for(var part=0; part<programInterval.count; part++) {
        for(var no=0; no<(sourceList.length / programInterval.count); no++) {
            settingConsole(programInterval.list[part], (part+1) + '-' + no, execute);
        }
    }
    
    async.series(execute, function(err, targetPathList){
        // (err)?console.dir(err):console.dir(res);
        setting_cb(null, targetPathList);
    });
};

var photoCategoriesByUser = function( sourceList, targetList, photo_categories_cb ){
    // copyTo and update
    var photoCategories = function(source, target, categories_cb){
        async.series([
            function(callback){
                awsS3.copyToAwsS3(source, target, function(err, res){
                    if (!err){
                        logger.info('Copy photo file was successfully to S3 '+target);
                    }
                    else {
                        logger.info('Copy photo file was failed to S3 '+target);
                    }
                    callback(null, target);
                });
            },
        ], function(err, res){
            awsS3.updateFileACLAwsS3(target, function(err, res){
                if (!err){
                    logger.info('Update photo file ACL was successfully to S3 '+target);
                }
                else {
                    logger.info('Update photo file ACL was failed to S3 '+target);
                }
                categories_cb(null, 'done');
            });
        });
    };
    
    var categoriesConsole = function( source, target, event ){
        event.push(function(callback){ photoCategories(source, target, callback); });
    };
    
    var execute = [];
    for(var i=0; i<sourceList.length; i++) {
        categoriesConsole(sourceList[i], targetList[i], execute);
    }
    async.series(execute, function(err, res){
        // (err)?console.dir(err):console.dir(res);
        photo_categories_cb(null, targetList);
    });
    
};

var assignPhotoToProject = function( programInterval, targetList, assign_cb ){
    
    var swarm,
        part = 0,
        numbers;
    
    numbers = targetList.length / programInterval.count;
    swarm = new Array( programInterval.count );
    
    for(var i=0; i<swarm.length; i++)
        swarm[i] = new Array( numbers );
    
    for(var i=0; i<targetList.length; i++) {
        swarm[part][i % numbers] = 'https://s3.amazonaws.com/miix_content/' + targetList[i];
        if( i % numbers == numbers - 1 )
            part++;
    }
    assign_cb( null, swarm );
    
};

var updateLivePhotoContent = function( programList, list, update_cb ){
    
    var part = 0;
    
    var schema = function(program, livePhotoUrl, livePhotoList, schema_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            var ugc = result[0];
            var liveContentId = livePhotoUrl.split('/');
            liveContentId = liveContentId[liveContentId.length-1].split('.')[0];
            var livejson =
            {
                "ownerId": { '_id': ugc.ownerId._id, 
                             'fbUserId': ugc.ownerId.userID,
                             'userID': ugc.ownerId.userID },
                'url': { 's3': livePhotoUrl, 'longPhoto': ugc.url.s3, 'livePhotos': livePhotoList },
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

        schema(program, list[part][0], list[part], function(live, ugc){
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
                part++;
                (part != programList.list.length)?update(programList.list[part]):update_cb(null, 'done');
            });
        });

    };
    update(programList.list[part]);
};

/*--- live video ---*/
var getLiveVideo = function( recordTime, report_cb ){
    
    awsS3.listAwsS3('camera_record/' + recordTime, function(err, res){
        report_cb(err, '/' + res.Contents[0].Key);
    });
    
};

var videoSetting = function( programInterval, setting_cb ){
    // [projectId].__story.avi
    var folder_path = 'user_project/';
    var naming = function(program, naming_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            var name = result[0].projectId + '__story.avi';
            var s3Path = folder_path + result[0].projectId + '/' + name;
            
            naming_cb( null, s3Path );
        });
    };
    
    naming( programInterval.list[0], setting_cb );
};

var videoCategoriesByUser = function( source, target, video_categories_cb ){
    
    // copyTo and update
    var videoCategories = function(source, target, categories_cb){
        async.series([
            function(callback){
                awsS3.copyToAwsS3(source, target, function(err, res){
                    if (!err){
                        logger.info('Copy video file was successfully to S3 '+target);
                    }
                    else {
                        logger.info('Copy video file was failed to S3 '+target);
                    }
                    callback(null, target);
                });
            },
        ], function(err, res){
            awsS3.updateFileACLAwsS3(target, function(err, res){
                if (!err){
                    logger.info('Update video file ACL was successfully to S3 '+target);
                }
                else {
                    logger.info('Update video file ACL was failed to S3 '+target);
                }
                categories_cb(null, 'done');
            });
        });
    };
    videoCategories( source, target, function(err, res){
        video_categories_cb( null, target );
    } );
    
};

var updateLiveVideoContent = function( programList, target, video_update_cb ) {
    
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
            schema_cb( livejson, ugcjson );
        });
    };
    
    var update = function( program, videoUrl, update_cb ){
        schema(program, videoUrl, function(live, ugc){
            async.series([
                function( createLive_cb ){
                    db.addUserLiveContent(live, function(err, result){
                        (err)?createLive_cb(null, err):createLive_cb(null, result);
                    });
                },
                function( updateUGC_cb ){
                    ugcModel.findByIdAndUpdate(ugc._id, { 'doohPlayedTimes': ugc.doohPlayedTimes + 1 }, function(err, result){
                        (err)?updateUGC_cb(null, err):updateUGC_cb(null, result);
                    });
                },
            ], function(err, res){
                update_cb(null, 'done');
            });
        });
    };
    update( programList.list[0], target, video_update_cb );
    
};

/*--- clear ---*/
var clearPhotos = function( fileset, clear_cb ){
    awsS3.deleteMultipleFileAwsS3( fileset, clear_cb );
};

var clearVideo = function( filepath, clear_cb ){
    var fileset = [];
    fileset.push( filepath );
    // awsS3.deleteAwsS3( filepath, clear_cb );
    awsS3.deleteMultipleFileAwsS3( fileset, clear_cb );
};

module.exports = FM.storyCamControllerHandler;