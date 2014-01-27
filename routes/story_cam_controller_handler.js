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
// var recordTime = '';
    
//POST /internal/story_cam_controller/available_story_movie
FM.storyCamControllerHandler.availableStoryMovie_post_cb = function(req, res) {

    if ( req.headers.miix_movie_project_id ) {
        // console.log( 'miix_movie_project_id: ' + req.headers.miix_movie_project_id );
        // console.log( 'record_time: ' + req.headers.record_time );
        storyContentMgr.generateStoryMV( req.headers.miix_movie_project_id, req.headers.record_time );
        res.send(200);
    }
	else {
		res.send(400, {error: "Bad Request!"} );
	}
    
    res.end();
};


FM.storyCamControllerHandler.availableStreetMovies = function(req, res){

    logger.info('get story cam report: ' + req.params.playTime);    
    var recordTime = req.params.playTime;
    
    var live_video = function( option, liveVideo_cb ){
        
        // console.dir(option.filePath);
        // console.dir(option.programInterval);
        
        var file = option.filePath,
            program = option.programInterval;
        
        async.waterfall([
            function( setting_cb ){ videoSetting( recordTime, program, setting_cb ); },
            function( target, categories_cb ){ videoCategoriesByUser( file, target, categories_cb ); },
            function( target, update_cb ){ updateLiveVideoContent( recordTime, program, target, update_cb ); },
            function( status, renderLive_cb ){
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
    var recordTime = req.params.playTime;
    
    var live_photo = function(option, livePhoto_cb){
        
        // console.dir(option.filePath);
        // console.dir(option.programInterval);
        
        var file = option.filePath,
            program = option.programInterval;
        
        /* async.waterfall([
            function( setting_cb ){ targetSetting( recordTime, program, file, setting_cb ); },
            function( target, categories_cb ){ photoCategoriesByUser( file, target, categories_cb ); },
            function( target, assign_cb){ assignPhotoToProject( program, target, assign_cb ); },
            function( swarm, update_cb ){ updateLivePhotoContent( recordTime, program, swarm, update_cb ); },
        ], function( err, res ){
            // (err)?console.dir(err):console.dir(res);
            livePhoto_cb( err, res );
        }); */
        
        async.series([
            function( preview_cb ) {
                async.waterfall([
                    function( download_cb ) { downloadPhotosFromAwsS3( recordTime, download_cb ); },
                    function( list, renaming_cb ) { 
                        thumbnailSetting( recordTime, program, list.s3, function(err, namelist) {
                            // (err)?console.dir(err):console.dir(namelist);
                            list.rename = namelist;
                            renaming_cb(err, list);
                        } ); 
                    },
                    function( list, resizing_cb ) { 
                        imageResizing(list.rename, list.dl, function(err, result) {
                            var tbList = [];
                            for(var i = 0; i < result.length; i++) {
                                var temp = list.rename[i].split('/');
                                tbList.push(path.join(__dirname, temp[temp.length - 1]));
                            }
                            list.thumbnail = tbList;
                            resizing_cb(err, list);
                        }); 
                    },
                    function( list, s3upload_cb ) { 
                        uploadThumbnailToAwsS3(list.thumbnail, list.rename, function(err, s3info) {
                            // s3upload_cb(err, s3info);
                            list.url = s3info;
                            s3upload_cb(err, list);
                        }); 
                    },
                ], preview_cb);
            },
            function( content_cb ) {
                async.waterfall([
                    function( setting_cb ){ targetSetting( recordTime, program, file, setting_cb ); },
                    function( target, categories_cb ){ photoCategoriesByUser( file, target, categories_cb ); },
                    function( target, assign_cb){ assignPhotoToProject( program, target, assign_cb ); },
                    function( swarm, update_cb ){ updateLivePhotoContent( recordTime, program, swarm, update_cb ); },
                ], content_cb);
            }
        ], function( err, res ) {
            var thumbnail = res[0];
            var content = res[1];
            // clear file
            for(var i = 0; i < thumbnail.dl.length; i++) {
                fs.unlinkSync(thumbnail.dl[i]);
            }
            for(var i = 0; i < thumbnail.url.length; i++) {
                var temp = thumbnail.url[i].split('/');
                var tb_file_name = path.join(__dirname, temp[temp.length - 1]);
                fs.unlinkSync(tb_file_name);
            }
            // callback
            livePhoto_cb( err, content );
            // console.dir(res);
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
        if(option.filePath.length == 0)
        {
            logger.info('Get live photo file is failed: ' + recordTime);
            return;
        }
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
        "timeslot.start": {$lte: parseInt(recordTime)}, 
        "timeslot.end": {$gte: parseInt(recordTime)}, 
        // "type": "UGC",
    };
    
    if(typeof(type) === 'function') {
        find_cb = type;
    }
    else {
        query.type = type;
    }
    
    logger.info('Query programTimeSlot condition: ' + JSON.stringify(query));
    
    programTimeSlotModel.find(query).sort({timeStamp:1}).exec(function (_err, result) {
        
        if(result.length > 0) {
            for(var i=0; i<result.length; i++)
                (result[i].type == 'UGC') ? count++ : '';
            schema.count = count;
            schema.list = result;
            find_cb(_err, schema);
        }
        else {
            schema.count = 0;
            schema.list = null;
            find_cb(_err, schema);
            // return;
        }
        
    });
};


/*--- live photos ---*/
var getLivePhoto = function( recordTime, report_cb ){

    var S3List = [];
    
    awsS3.listAwsS3('camera_record/' + recordTime, function(err, res){
    // awsS3.listAwsS3('1234/' + recordTime, function(err, res){
        // (err)?console.log(err):console.dir(res);
        for(var i=0; i<res.Contents.length; i++) {
            // console.log('Path: ' + '/' + res.Contents[i].Key);
            S3List.push('/' + res.Contents[i].Key);
        }
        report_cb(err, S3List);
    });
    
};

var targetSetting = function( recordTime, programInterval, sourceList, setting_cb ){
    //[contentGenre]-[ownerId._id]-[time stamp]-[record time]
    var folder_path = 'user_project/';
    // var folder_path = '1234/';
    var naming = function(program, no, naming_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            // var project_path = program.contentGenre + '-' + 
            var project_path = result[0].contentGenre + '-' + 
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

var updateLivePhotoContent = function( recordTime, programList, list, update_cb ){
    
    var part = 0;
    
    var schema = function(program, livePhotoUrl, livePhotoList, schema_cb){
        
        logger.info('update LivePhoto Content ,program= '+program+',livePhotoUrl='+livePhotoUrl+',livePhotoList='+livePhotoList);

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

var videoSetting = function( recordTime, programInterval, setting_cb ){
    // [projectId].__story.avi
    var folder_path = 'user_project/';
    var naming = function(program, naming_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            var name = result[0].projectId + '__story.avi';
            var s3Path = folder_path + result[0].projectId + '_' + recordTime + '/' + name;
            
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

var updateLiveVideoContent = function( recordTime, programList, target, video_update_cb ) {
    
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
                'url': { 's3': 'https://s3.amazonaws.com/miix_content/' + liveVideoUrl },
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

/*--- live photo thimbnail ---*/
var downloadPhotosFromAwsS3 = function( recordTime, options, download_cb ) {
    
    if( typeof(options) === 'function' ) {
        download_cb = options;
    }
    
    var S3List = [];
    var fileList = [];
    
    var downloadFileFromAwsS3 = function( sourceList, download_cb ) {
        
        var dlList = [];
        
        for(var i = 0; i < sourceList.length; i++) {
            var file = sourceList[i].split('/');
            var filename = file[file.length - 1];
            dlList.push( path.join(__dirname, filename) );
        }
        
        var dlConsole = function( target, source, event ) {
            event.push(function(callback) { awsS3.downloadFromAwsS3( target, source, callback ); });
        };
        
        var execute = [];
        for(var i = 0; i < sourceList.length; i++) {
            dlConsole(dlList[i], sourceList[i], execute);
        }
        async.parallel(execute, function(err, res){
            // (err)?console.dir(err):console.dir(res);
            download_cb(null, dlList);
        });
    };
    
    awsS3.listAwsS3('camera_record/' + recordTime, function(err, res){
    // awsS3.listAwsS3('1234/' + recordTime, function(err, res){
        // (err)?console.log(err):console.dir(res);
        for(var i=0; i<res.Contents.length; i++) {
            // console.log('Path: ' + '/' + res.Contents[i].Key);
            S3List.push('/' + res.Contents[i].Key);
        }
        
        downloadFileFromAwsS3( S3List, function( err, dlList ) {
            download_cb(err, { s3 : S3List, dl : dlList });
        } );
        
    });
    
};

var thumbnailSetting = function( recordTime, programInterval, sourceList, thumbnail_cb ){
    //[contentGenre]-[ownerId._id]-[time stamp]-[record time]
    var folder_path = 'user_project/';
    // var folder_path = '1234/';
    var naming = function(program, no, naming_cb){
        ugcModel.find({"_id": program.content._id}).exec(function (err, result) {
            // var project_path = program.contentGenre + '-' + 
            var project_path = result[0].contentGenre + '-' + 
                               result[0].ownerId._id + '-' + 
                               program.timeStamp + '-' +
                               recordTime;
            naming_cb( null, 
                       folder_path + project_path + '/' + project_path + '-' + no + '_s.jpg' );
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
    
    async.parallel(execute, function(err, targetPathList){
        // (err)?console.dir(err):console.dir(targetPathList);
        thumbnail_cb(null, targetPathList);
    });
};

var imageResizing = function(saveTo, file, resizing_cb) {
    
    var resizing = function( save_path, image_path, resizing_cb ) {
        var readStream = fs.createReadStream( image_path );
        gm( readStream,  'img.jpg' )
        .size({bufferStream: true}, function(err, size) {
            this.resize(size.width / 6, size.height / 6);
            this.noProfile();
            this.write(save_path, function (err) {
                // if (!err) console.log('done');
                ( err )
                  ? resizing_cb('resizing_is_failed', null)
                  : resizing_cb(null, 'resizing_is_successfully');
            });
        });
    };
    
    var settingConsole = function(target, source, event){
        event.push(function(callback){ resizing(target, source, callback); });
    };
    
    var execute = [];
    for(var i = 0; i < saveTo.length; i++) {
        var temp = saveTo[i].split('/');
        var tempName = path.join(__dirname, temp[temp.length - 1]);
        settingConsole(tempName, file[i], execute);
    }
    
    async.parallel(execute, function(err, res){
        // (err)?console.dir(err):console.dir(res);
        resizing_cb(null, saveTo);
    });
    
};

var uploadThumbnailToAwsS3 = function(fileList, s3List, uploadThunbnail_cb) {
    
    var upload = function(file, s3, cb) {
        if(s3[0] != '/') {
            s3 = '/' + s3;
        }
        awsS3.uploadToAwsS3(file, s3, null, function(err,result){
            if (!err){
                // console.log('Live content thumbnail image was successfully uploaded to S3 ' + s3);
                cb(null, s3);
            }
            else {
                // console.log('Live content thumbnail image failed to be uploaded to S3 ' + s3);
                cb('uplaod_thumbnail_is_failed', null);
            }
        });
    };
    
    var settingConsole = function(target, source, event){
        event.push(function(callback){ upload(target, source, callback); });
    };
    
    var execute = [];
    for(var i = 0; i < fileList.length; i++) {
        settingConsole(fileList[i], s3List[i], execute);
    }
    
    async.series(execute, function(err, res){
        // (err)?console.dir(err):console.dir(res);
        var s3TbList = [];
        for(var i = 0; i < res.length; i++) {
            s3TbList.push('https://s3.amazonaws.com/miix_content' + res[i]);
        }
        uploadThunbnail_cb(null, s3TbList);
    });
    
};


module.exports = FM.storyCamControllerHandler;

// setTimeout(function() {
    
    // var recordTime = 1389598985413;
    // findMember(recordTime, 'UGC', function(err, program) {
        // async.waterfall([
            // function( download_cb ) { downloadPhotosFromAwsS3( recordTime, download_cb ); },
            // function( list, renaming_cb ) { 
                // thumbnailSetting( recordTime, program, list.s3, function(err, namelist) {
                    // list.rename = namelist;
                    // renaming_cb(err, list);
                // } ); 
            // },
            // function( list, resizing_cb ) { 
                // imageResizing(list.rename, list.dl, function(err, result) {
                    // var tbList = [];
                    // for(var i = 0; i < result.length; i++) {
                        // var temp = list.rename[i].split('/');
                        // tbList.push(path.join(__dirname, temp[temp.length - 1]));
                    // }
                    // list.thumbnail = tbList;
                    // resizing_cb(err, list);
                // }); 
            // },
            // function( list, s3upload_cb ) { 
                // uploadThumbnailToAwsS3(list.thumbnail, list.rename, function(err, s3info) {
                    // s3upload_cb(err, s3info);
                // }); 
            // },
        // ], function(err, res) {
            // console.log('err: ');
            // console.log(err);
            // console.log('res: ');
            // console.dir(res);
        // });
    // });
    
// }, 2000);

// Test Data upload
/* for(var i=1; i <= 3; i++) {
    for(var j=0; j<6; j++) {
        var file = 'D:\\photo_test\\1389598985413\\1389598985413-' + i + '-' + j + '.jpg',
            s3Path = '/camera_record/1389598985413/1389598985413-' + i + '-' + j + '.jpg';
            
        awsS3.uploadToAwsS3(file, s3Path, null, function(err,result){
            if (!err){
                console.log('Live content image was successfully uploaded to S3 '+s3Path);
            }
            else {
                console.log('Live content image failed to be uploaded to S3 '+s3Path);
            }
        });
    }
} */
