
var awsS3 = require('./aws_s3.js');
var async = require('async');
var path = require('path');

// var db = require('./db.js');
// var programTimeSlotModel = db.getDocModel("programTimeSlot");

var recordTime = 1383102788585;
// awsS3.listAwsS3('camera_record/' + recordTime, function(err, res){
    // (err)?console.log(err):console.dir(res);
    // var dataset = [];
    // for(var i=0; i<res.Contents.length; i++) {
        // console.log('Path: ' + '/' + res.Contents[i].Key);
        // dataset.push(res.Contents[i].Key);
    // }
    // awsS3.deleteMultipleFileAwsS3( dataset, function(err, res){
        // (err)?console.log(err):console.dir(res);
    // } );
// });
var set = [];
set.push( recordTime );
console.dir( set );

// awsS3.copyToAwsS3('test/apple.jpg', 'test/happy.jpg', function(err, res){
    // (err)?console.log(err):console.dir(res);
// });

// awsS3.updateFileACLAwsS3('/test/happy.jpg', function(err, res){
    // (err)?console.log(err):console.dir(res);
// });

// awsS3.deleteMultipleFileAwsS3( ['1234', '1234/4567', '/userTest'], function(err, res){
    // (err)?console.log(err):console.dir(res);
// } );


/*--- live photos ---*/
// var getLivePhoto = function(recordTime, report_cb){

    // var S3List = [];
    
    // awsS3.listAwsS3('camera_record/' + recordTime, function(err, res){
        // (err)?console.log(err):console.dir(res);
        // for(var i=0; i<res.Contents.length; i++) {
            // console.log('Path: ' + '/' + res.Contents[i].Key);
            // S3List.push('/' + res.Contents[i].Key);
        // }
        // report_cb(err, S3List);
    // });
    
// };

// getLivePhoto(recordTime, function(err, res){
    // (err)?console.dir(err):console.dir(res);
// });

