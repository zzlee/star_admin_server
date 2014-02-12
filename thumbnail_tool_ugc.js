
var fs = require('fs'),
    gm = require('gm'),
    path = require('path'),
    async = require('async');
    
var awsS3 = require('./aws_s3.js');
var db = require('./db.js');
var userLiveContentModel = db.getDocModel("userLiveContent");
var ugcModel = db.getDocModel("ugc");
var start = new Date("2013/11/1 00:00:00"),
    end = new Date("2013/11/5 00:00:00");

var query = 
{ 
    "fileExtension" : "png",
    "createdOn" : { $gt : start, $lte : end }
    // "createdOn" : { $gte : new Date(2014,1,1).toISOString() }
    // "createdOn" : { '$gte' : start }
};

var totalNumbers = function( query, total_cb ) {
    var totaldoc = [],
        count = 0,
        limit = 1000;

    async.whilst(
        function() { return (count % limit) == 0 }, 
        function(cb) { 
            ugcModel
            .find(query)
            .skip(count)
            .sort({timeStamp:1})
            // .hot({})
            .exec(function(err, result) {
                if( err ) {
                    logger.error('[thumbnail_tool_ugc.js]', err);                    
                    return;
                }
                if( result.length == limit ) {
                    count += 1000;
                    totaldoc = totaldoc.concat(result);
                    setTimeout(cb, 200);
                }
                else {
                    count += result.length;
                    totaldoc = totaldoc.concat(result);
                    var total = 
                    {
                        count : count,
                        totaldoc : totaldoc
                    };
                    cb(total);
                }
            });
            
        }, 
        function(total) { 
            total_cb(total);
        }
    );
};

var downloadPhotosFromAwsS3 = function(photoFiles, download_cb) {
    
    var dlList = [],
        errorLog = [],
        task = [];
    
    for(var i = 0, max = photoFiles.length; i < max; i++) {
        var temp = photoFiles[i].split('/');
        var filename = temp[temp.length - 1];
        dlList.push( path.join(__dirname, 'thumbnail', filename) );
    }
    
    for(var i = 0, max = photoFiles.length; i < max; i++) {
        var oneTask = 
        {
            target : dlList[i],
            source : photoFiles[i]
        };
        task.push(oneTask);
    }
    
    var q = async.queue(function (task, callback) {
        // console.log('hello ' + task.name);
        awsS3.downloadFromAwsS3(task.target, task.source, function(err, res) {
            if( err ) {
                callback( 'download is failed. s3: ' + task.source + ', local: ' + task.target );
            }
            else {
                callback();
            }
        });
    }, 10);
    
    q.drain = function() {  download_cb(errorLog, dlList); };
    q.push(task, function(err) { if( err ) errorLog.push( err ); });
    
};

var listAllPhotoFromAwsS3 = function(searchList, list_cb) {
    
    var error = [],
        listResult = [];
    
    /* var listConsole = function( target, event ) {
        event.push(function(callback) { awsS3.listAwsS3( 'user_project/' + target, callback ); });
    };
    
    var execute = [];
    for(var i = 0, max = searchList.length; i < max; i++) {
        listConsole(searchList[i], execute);
    }
    async.parallel(execute, function(err, res){
        // (err)?console.dir(err):console.dir(res);
        if( err ) {
            list_cb(err, null);
            return;
        }
        // download_cb(null, dlList);
        var tempList = [];
        for(var i = 0, max = res.length; i < max; i++) {
            for(var j = 0, key_max = res[i].Contents.length; j < key_max; j++) {
                listResult.push('/' + res[i].Contents[j].Key);
                if( j == 0 )
                    console.log('/' + res[i].Contents[j].Key);
            }
        }
        list_cb(null, listResult);
    }); */
    
    // var check = /_s.jpg/g;
    var check = /_s/g;
    
    var q = async.queue(function (task, callback) {
        // console.log('hello ' + task.name);
        awsS3.listAwsS3('user_project/' + task.projectId, function(err, res) {
            if( err ) {
                callback( 'list project is failed. s3: ' + task.projectId );
            }
            else {
                // listResult.push(res);
                for(var i = 0, max = res.Contents.length; i < max; i++) {
                    // listResult.push('/' + res.Contents[i].Key);
                    var key = res.Contents[i].Key;
                    if( !key.match(check) )
                        listResult.push('/' + res.Contents[i].Key);
                }
                callback();
            }
        });
    }, 10);
    
    var task = [];
    for(var i = 0, max = searchList.length; i < max; i++) {
        var oneTask = 
        {
            projectId : searchList[i]
        };
        task.push(oneTask);
    }
    
    q.push(task, function(err) {
        // log('t2 executed');
        // console.log(err);
        if( err )
            error.push(err);
    });
    
    q.drain = function() { 
        // console.log(‘all tasks have been processed’); 
        list_cb(error, listResult);
    }
    
};

var imageCropping = function(fileList, cropping_cb) {

    logger.info('[thumbnail_tool_ugc.js]: imageCropping starting!');   
    
    var thumbnailList = [];
    
    var crop = function( save_path, image_path, crop_cb ) {
        var readStream = fs.createReadStream( image_path );
        gm( readStream,  'img.jpg' )
        .size({bufferStream: true}, function(err, size) {
            // this.resize(size.width / 6, size.height / 6);
            // this.crop(size.width - 605, size.height, 605, 0);
            this.noProfile();
            this.write(save_path, function (err) {
                // if (!err) console.log('done');
                ( err )
                  ? crop_cb('resizing_is_failed', null)
                  : crop_cb(null, 'resizing_is_successfully');
            });
        });
    };
    
    var error = [];
    
    var q = async.queue(function (task, callback) {
        
        crop(task.save_path, task.image_path, function(err,result) {
            if (!err){
                callback();
            }
            else {
                logger.info('cropping_thumbnail_is_failed. file: ' + task.save_path);   
//                console.log('cropping_thumbnail_is_failed. file: ' + task.save_path);
                // callback('cropping_thumbnail_is_failed. file: ' + task.save_path);
                callback();
            }
        });
        
    }, 10);
    
    var task = [];
    for(var i = 0, max = fileList.length; i < max; i++) {
        var tempName = fileList[i].replace('.png', '_s.jpg');
        thumbnailList.push(tempName);
        var oneTask = 
        {
            // projectId : searchList[i]
            save_path : tempName,
            image_path : fileList[i]
        };
        task.push(oneTask);
    }
    
    q.push(task, function(err) {
        if( err )
            error.push(err);
    });
    
    q.drain = function() { 
        // console.log(‘all tasks have been processed’); 
        cropping_cb(error, thumbnailList);
    }
    
};

var imageResizing = function(fileList, imgResizing_cb) {
    
//    console.log('imageResizing() is start');
    
    var thumbnailList = [];
    
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
    
    var error = [],
        listResult = [];
    
    var q = async.queue(function (task, callback) {
        
        resizing(task.save_path, task.image_path, function(err,result) {
            if (!err){
                callback();
            }
            else {
                callback('resizing_thumbnail_is_failed. file: ' + task.save_path);
            }
        });
        
    }, 10);
    
    var task = [];
    for(var i = 0, max = fileList.length; i < max; i++) {
        var tempName = fileList[i].replace('.jpg', '_s.jpg');
        thumbnailList.push(tempName);
        var oneTask = 
        {
            // projectId : searchList[i]
            save_path : tempName,
            image_path : fileList[i]
        };
        task.push(oneTask);
    }
    
    q.push(task, function(err) {
        // log('t2 executed');
        // console.log(err);
        if( err )
            error.push(err);
    });
    
    q.drain = function() { 
        // console.log(‘all tasks have been processed’); 
        imgResizing_cb(error, thumbnailList);
    }
    
    
};

var uploadThumbnailToAwsS3 = function(fileList, s3List, upload_cb) {
    
    logger.info('uploadThumbnailToAwsS3() is start');   

    
    var error = [],
        listResult = [];
    
    var q = async.queue(function (task, callback) {
        if(task.s3[0] != '/') {
            task.s3 = '/' + task.s3;
        }
        awsS3.uploadToAwsS3(task.file, task.s3, null, function(err,result){
            if (!err){
                // console.log('Live content thumbnail image was successfully uploaded to S3 ' + s3);
                callback();
            }
            else {
                logger.info('uplaod_thumbnail_is_failed. file: ' + task.file); 
                // console.log('Live content thumbnail image failed to be uploaded to S3 ' + s3);
                // callback('uplaod_thumbnail_is_failed. file: ' + task.file);
                console.log('uplaod_thumbnail_is_failed. file: ' + task.file);
                callback();
            }
        });
        
    }, 10);
    
    var task = [];
    for(var i = 0, max = fileList.length; i < max; i++) {
        var oneTask = 
        {
            // projectId : searchList[i]
            file : fileList[i],
            s3 : s3List[i]
        };
        task.push(oneTask);
    }
    
    q.push(task, function(err) {
        // log('t2 executed');
        // console.log(err);
        if( err )
            error.push(err);
    });
    
    q.drain = function() { 
        // console.log(‘all tasks have been processed’); 
        upload_cb(error, 'done');
    }
    
};

global.getBrokenImgAndFix = function(ugcList,cb) {
   
    
//    var ugcList = [];
    var tbS3List = [];
    
//    ugcList.push("/user_project/wls_pic_text-52f1ff7da4afcde417000106-20140211T091357432Z/wls_pic_text-52f1ff7da4afcde417000106-20140211T091357432Z.png");

    downloadPhotosFromAwsS3(ugcList, function(err, dlList) {
        if( err.length ) {
            logger.info('global.getBrokenImgAndFix error: '+err);   
//            console.log(err);
            return;
        }
        
        logger.info('downloadPhotosFromAwsS3: ' + dlList.length); 
//        console.log('downloadPhotosFromAwsS3: ' + dlList.length);
        
        localFileList = dlList;
        
        imageCropping(localFileList, function(err, tbList) {
            if( err.length ) {
                logger.info('imageCropping: '+err);   

//                console.log(err);
                return;
            }
            // console.log(tbList);
            thumbnailList = tbList;
            
            // upload aws S3
            for(var i = 0, max = ugcList.length; i < max; i++) {
                var temp = ugcList[i].replace('.png', '_s.jpg');
                tbS3List.push(temp);
            }
            uploadThumbnailToAwsS3(thumbnailList, tbS3List, function(err, res) {
                if( err.length ) {
                    logger.info('uploadThumbnailToAwsS3: '+err);  
//                    console.log(err);
                    return;
                }
                
                logger.info('global.getBrokenImgAndFix :'+res);   

               // console.log(res);
                //cb('done');
//                process.exit(1);
            });
        });
    });
}