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

/* ------ Handler API ------ */    

//POST /fb/image_uplaod/base64
FM.fb_event_handler.fbUploadImageByBase64 = function(req, res) {
    
    var myToken = req.body.access_token;
    var base64Data = req.body.image.replace(/^data:image\/png;base64,/,"");
    // var filename = path.join(__dirname, "out.png");
    var filename = "out.png";
    fs.writeFile(filename, base64Data, 'base64', function(err) {
        // console.log(err);
        var filepath = filename;
        facebookMgr.postPhotoFromLocal(myToken, filepath, function(err, res){
            // (err)?console.dir('facebookMgr: ' + err):console.dir('facebookMgr: ' + res);
            fs.unlinkSync(filepath);
        });
    });
    res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin' : '*'
    });
    res.send('done');
    res.end();
    
};

//POST /fb/image_uplaod
FM.fb_event_handler.fbUploadImage = function(req, res){
    
};

module.exports = FM.fb_event_handler;