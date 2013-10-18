/**
 *  canvas_process_mgr.js
 */


var spawn = require('child_process').spawn;
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var fbReportListener = new EventEmitter();

var canvasProcessMgr = {};

canvasProcessMgr.markTextAndIcon = function( option, markText_cb ){
    _private.mark( option.accessToken, option.type, option.source, option.text, markText_cb );
};

canvasProcessMgr.markTextToPreview = function( option, markText_cb ){
    _private.mark_preview( option.accessToken, option.type, option.text, markText_cb );
};

// canvasProcessMgr.reportTrigger = function( report ){
    // fbReportListener.emit('report', report);
// };

var _private = {
    mark : function( accessToken, type, sourceImg , textContent, mark_cb) {
        fs.readFile( sourceImg, function (err, data){
            
            var mark_url = 'http://127.0.0.1/canvas_process/fb_text_on_photo.html';
            
            var chrome = spawn('chrome.exe', 
                               [mark_url + 
                               '?accessToken=' + accessToken + 
                               '&type=' + type + 
                               '&sourceImage=' + sourceImg + 
                               '&textContent=' + textContent]);
            
            chrome.stdout.on('data', function (data) { /* console.log('stdout: ' + data); */ });
            chrome.stderr.on('data', function (data) { /* console.log('stderr: ' + data); */ });
            chrome.on('close', function (code) {
                // console.log('child process exited with code ' + code);
                mark_cb(null, 'done');
            });
        });
    },
    mark_preview : function( accessToken, type, textContent, mark_preview_cb) {

        var mark_preview_url = 'http://127.0.0.1/canvas_process/fb_text_on_photo_preview.html';
        
        var chrome = spawn('chrome.exe', 
                           [mark_preview_url + 
                           '?accessToken=' + accessToken + 
                           '&type=' + type + 
                           '&textContent=' + textContent]);
        
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
    accessToken: 'CAACMdh4LeZBcBAI67ZAiERvZCheAdJQnJhAFsHgrH86fCLcdwrVxxIeg3WNYDZBIAT5qZBwCpig0Iq9lNZAZAjoKKvFikIuSaFhfDQlIaSfaFvr21eFyMW5AyfmNrXeqfitALwgqyZAD4UKZBUGxJeZAkIywvBOH91AjAuvuB2H1m2FZBL1e7w97v6DrJb8FX58df0ZD',
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
    accessToken: 'CAACMdh4LeZBcBAI67ZAiERvZCheAdJQnJhAFsHgrH86fCLcdwrVxxIeg3WNYDZBIAT5qZBwCpig0Iq9lNZAZAjoKKvFikIuSaFhfDQlIaSfaFvr21eFyMW5AyfmNrXeqfitALwgqyZAD4UKZBUGxJeZAkIywvBOH91AjAuvuB2H1m2FZBL1e7w97v6DrJb8FX58df0ZD',
    // type: 'ondascreen',
    type: 'wowtaipeiarena',
    // source: 'https://s3.amazonaws.com/miix_content/user_project/mood-5244fd13624cd3cc0900000d-1381962600000-005-1381962725770/mood-5244fd13624cd3cc0900000d-1381962600000-005-1381962725770.jpg',
    text: '哇！Jeff Chai即將2013年10月13日上午5:40~5:50之間，登上小巨蛋！'
};

canvasProcessMgr.markTextToPreview(option, function(err, res){
    console.log(res);
});
 */