/**
 *  canvas_process_mgr.js
 */


var spawn = require('child_process').spawn;
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
// var fbReportListener = new EventEmitter();

var canvasProcessMgr = {};

canvasProcessMgr.markTextAndIcon = function( option, markText_cb ){
    _private.mark( option.accessToken, option.type, option.source, option.photo, option.text, option.ugcProjectId, markText_cb );
};

canvasProcessMgr.markTextToPreview = function( options, markText_cb ){
    _private.mark_preview( options, markText_cb );
};

// canvasProcessMgr.reportTrigger = function( report ){
    // fbReportListener.emit('report', report);
// };

var _private = {
    mark : function( accessToken, type, sourceImg, longPhoto, textContent, ugcProjectId, mark_cb) {
        fs.readFile( sourceImg, function (err, data){
            
            var mark_url = 'http://127.0.0.1/canvas_process/fb_text_on_photo.html';
            
            var chrome = spawn('chrome.exe', 
                               [mark_url + 
                               '?accessToken=' + accessToken + 
                               '&type=' + type + 
                               '&sourceImage=' + sourceImg +
                               '&longPhoto=' + longPhoto + 
                               '&textContent=' + textContent +
                               '&ugcProjectId=' + ugcProjectId]);
            
            chrome.stdout.on('data', function (data) { /* console.log('stdout: ' + data); */ });
            chrome.stderr.on('data', function (data) { /* console.log('stderr: ' + data); */ });
            chrome.on('close', function (code) {
                // console.log('child process exited with code ' + code);
                mark_cb(null, 'done');
            });
        });
    },
    // mark_preview : function( accessToken, type, textContent, ugcProjectId, mark_preview_cb) {
    mark_preview : function( options, mark_preview_cb) {

        var mark_preview_url = 'http://127.0.0.1/canvas_process/fb_text_on_photo_preview.html';
        
        var chrome = spawn('chrome.exe', 
                           [mark_preview_url + 
                           '?accessToken=' + options.accessToken + 
                           '&type=' + options.type + 
                           '&name=' + options.name + 
                           '&time=' + options.time + 
                           // '&textContent=' + textContent +
                           '&ugcProjectId=' + options.ugcProjectId]);
        
        chrome.stdout.on('data', function (data) { /* console.log('stdout: ' + data); */ });
        chrome.stderr.on('data', function (data) { /* console.log('stderr: ' + data); */ });
        chrome.on('close', function (code) {
            // console.log('child process exited with code ' + code);
            mark_preview_cb(null, 'done');
        });

    }
};

module.exports = canvasProcessMgr;

// === test === //
/* 
var option = {
    accessToken: 'CAACMdh4LeZBcBADduK5QbYqTRnW1lymJqWmW5zMxtEHcfBPfVJ2rEwUj1Kd1iYF5ZAP2iNgZBa8LHzdgZCfRtNkQfxr4PqnfvIazc6mga0ZAZAG4L4KrBJhSVHtukQlB5NQV43xxr3ts1ZBqfxMTu06aeF2cKUTu2WX7qzjscUQjhjq93drZAZBOXj6rZBszZCTTr4ZD',
    // type: 'ondascreen',
    type: 'wowtaipeiarena',
    source: 'https://s3.amazonaws.com/miix_content/user_project/mood-5244fd13624cd3cc0900000d-1381962600000-005-1381962725770/mood-5244fd13624cd3cc0900000d-1381962600000-005-1381962725770.jpg',
    text: 'Jeff Chai 於2013年10月15日下午5:21，登上台北小巨蛋天幕！'
};

canvasProcessMgr.markTextAndIcon(option, function(err, res){
    console.log(res);
});
 */
/* 
var option = {
    accessToken: 'CAACMdh4LeZBcBADduK5QbYqTRnW1lymJqWmW5zMxtEHcfBPfVJ2rEwUj1Kd1iYF5ZAP2iNgZBa8LHzdgZCfRtNkQfxr4PqnfvIazc6mga0ZAZAG4L4KrBJhSVHtukQlB5NQV43xxr3ts1ZBqfxMTu06aeF2cKUTu2WX7qzjscUQjhjq93drZAZBOXj6rZBszZCTTr4ZD',
    // type: 'ondascreen',
    type: 'wowtaipeiarena',
    // source: 'https://s3.amazonaws.com/miix_content/user_project/mood-5244fd13624cd3cc0900000d-1381962600000-005-1381962725770/mood-5244fd13624cd3cc0900000d-1381962600000-005-1381962725770.jpg',
    text: '哇！Jeff Chai即將2013年10月12日上午5:40~5:50之間，登上小巨蛋！'
};

canvasProcessMgr.markTextToPreview(option, function(err, res){
    console.log(res);
});
 */