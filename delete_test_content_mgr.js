/**
 * Please watch '/JMeter tests/readme.txt' ,before you want to delete something! 
 */
var awsS3 = require('./aws_s3.js');
var youtubeMgr = require('./youtube_mgr.js');
var db = require('./db.js');
var readline = require('readline');
var async = require('async');

var FM = { deleteTestContentMgr : {} };

var UGCs = db.getDocModel("ugc");


FM.deleteTestContentMgr.deleteTestContentController = function(accessToken){

    console.log('welcome to delete_test_data_mgr!');
    console.log('1. list Youtube Test Video !');
    console.log('2. list Test Obj In Aws S3 !');
    console.log('3. list Test UGC !');
    console.log('4. delete Test Obj In AwsS3 !');
    console.log('5. delete Youtube Test Video And delete Test UGC!');
    console.log('6. delete Test UGC !');

    rl = readline.createInterface(process.stdin, process.stdout);

    rl.setPrompt('enter> ');
    rl.prompt();

    rl.on('line', function(line) {
        switch(line.trim()) {
        case '1':
            FM.deleteTestContentMgr.listYoutubeTestVideo();
            break;
        case '2':
            FM.deleteTestContentMgr.listTestObjInAwsS3();
            break;
        case '3':
            FM.deleteTestContentMgr.listTestUGC();
            break;
        case '4':
            FM.deleteTestContentMgr.deleteTestObjInAwsS3();
            break;
        case '5':
            FM.deleteTestContentMgr.deleteYoutubeTestVideo(accessToken);
            break;
        case '6':
            FM.deleteTestContentMgr.deleteTestUGC();
            break;
        default:
            console.log('You have to enter some number!(1~6)');
        break;
        }
        rl.prompt();
    }).on('close', function() {
        console.log('Have a great day!');
        process.exit(0);
    });

};

FM.deleteTestContentMgr.getAccessToken = function(accessToken){
    console.log('accessToken',accessToken);
    FM.deleteTestContentMgr.deleteTestContentController(accessToken);
};

FM.deleteTestContentMgr.deleteYoutubeTestVideo = function(accessToken){
    var video_ID = null;
    var totalCount = 0;
    var successCount = 0;
    var notFoundCount = 0;
    var denyCount = 0;
    var next = 0;
    var limit = 0;

    var query = UGCs.find();
    query.exec(function(err, result){

        async.eachSeries(result, deleteYoutube, function(err0){
            if (!err0) {
                console.log('denyCount',denyCount);
                console.log('notFoundCount',notFoundCount);
                console.log('totalCount',totalCount);
                console.log('successCount',successCount);
            }
            else{
                console.log('Failed to delete Youtube Test Video: '+err0);
            }
        });


    });

    var deleteYoutube = function(data, cbOfDeleteYoutube){

        if(data.projectId && data.projectId.substring(0,4) =='test'){
            if(data.url.youtube){
                console.log('----'+data.projectId+data.url);
                totalCount++;
                video_ID = data.url.youtube.substring(29,40);
                console.log('delete input=',video_ID, accessToken);
                youtubeMgr.deleteYoutubeVideo(video_ID, accessToken, function(err, result){
                    console.log(err, result);
                    if(!err){
                        successCount++;
                        cbOfDeleteYoutube(null, 'successful');
                        UGCs.findByIdAndRemove(data._id, function(err, result){
                            if(!err)
                                console.log(result);
                            else{
                                console.log(err);
                            }
                        });
                    }
                    else{
                        cbOfDeleteYoutube(null, err);
                        if(err == '403')
                            denyCount++;
                        if(err == '404'){
                            notFoundCount++;
                            UGCs.findByIdAndRemove(data._id, function(err, result){
                                if(!err)
                                    console.log(result);
                                else{
                                    console.log(err);
                                }
                            });
                        }
                    }
                });
            }else
                cbOfDeleteYoutube(null);
        }else
            cbOfDeleteYoutube(null);
    };


};

FM.deleteTestContentMgr.listYoutubeTestVideo = function(){
    var video_ID = null;
    var count = 0;

    var query = UGCs.find();
    query.exec(function(err, result){
        for(var i=0 ; i<result.length; i++){
            if(i === 0)
                console.log('');

            if(result[i].projectId && result[i].projectId.substring(0,4) =='test'){
                if(result[i].url.youtube){
                    console.log(i.toString()+'-'+result[i].url.youtube);
                    video_ID = result[i].url.youtube.substring(29,40);
                    console.log(video_ID);
                    count++;
                }

            }
        }
        if(count === 0)
            console.log('No Test data!');
    });

};

FM.deleteTestContentMgr.listTestObjInAwsS3 = function(){

    awsS3.listAwsS3('user_project/test' ,function(err, result){
        if(result.Contents.length >0){
            console.log('Test Aws Obj total ='+result.Contents.length);
            for(var i=0 ; i<result.Contents.length; i++){
                if(i === 0)
                    console.log('');
                console.log(result.Contents[i].Key);
            }
        }else{
            console.log('No Test data!');
        }


    });

};


FM.deleteTestContentMgr.deleteTestObjInAwsS3 = function(){

    awsS3.listAwsS3('user_project/test' ,function(err, result){

        for(var i=0 ; i<result.Contents.length; i++){
            console.log(result.Contents[i].Key);
            awsS3.deleteAwsS3(result.Contents[i].Key, function(err, result){
                console.log('deleteAwsS3'+err+result);
                if(!err)
                    console.log('successful');
                else{
                    console.log(err);
                }
            });
        } 

    });

};

FM.deleteTestContentMgr.listTestUGC = function(accessToken, delete_cb){
    var count = 0;

    var query = UGCs.find();
    query.exec(function(err, result){
        for(var i=0 ; i<result.length; i++){
            if(i === 0)
                console.log('');

            if(result[i].projectId && result[i].projectId.substring(0,4) =='test'){
                console.log(result[i]._id+result[i].projectId);
                count++;
            }
        }
        if(count === 0)
            console.log('No Test data!');

    });


};
FM.deleteTestContentMgr.deleteTestUGC = function(accessToken, delete_cb){
    var count = 0;

    var query = UGCs.find();
    query.exec(function(err, result){
        for(var i=0 ; i<result.length; i++){

            if(result[i].projectId && result[i].projectId.substring(0,4) =='test'){
                console.log(result[i]._id+result[i].projectId);
                UGCs.findByIdAndRemove(result[i]._id, function(err, result){
                    if(!err)
                        console.log(result);
                    else{
                        console.log(err);
                    }
                });
                count++;
            }
        }
        if(count === 0)
            console.log('No Test data!');

    });


};


//FM.deleteTestContentMgr.deleteTestContentController();
//FM.deleteTestContentMgr.getAccessToken();

module.exports = FM.deleteTestContentMgr;