
var spawn = require('child_process').spawn;
var fs = require('fs');

var canvasProcessMgr = {};

canvasProcessMgr.markTextAndIcon = function( option, markText_cb ){
    _private.mark( option.accessToken, option.source, option.text, markText_cb );
};

var _private = {
    mark : function( accessToken, sourceImg , textContent, mark_cb) {
        fs.readFile( sourceImg, function (err, data){
            
            var mark_url = 'http://127.0.0.1/canvas_process/fb_text_on_photo.html';
            
            var chrome = spawn('chrome.exe', 
                               [mark_url + 
                               '?accessToken=' + accessToken + 
                               '&sourceImage=' + sourceImg + 
                               '&textContent=' + textContent]);
            
            chrome.stdout.on('data', function (data) { /* console.log('stdout: ' + data); */ });
            chrome.stderr.on('data', function (data) { /* console.log('stderr: ' + data); */ });
            chrome.on('close', function (code) {
                // console.log('child process exited with code ' + code);
                mark_cb(null, 'done');
            });
            
        });
    }
};

module.exports = canvasProcessMgr;

// === test === //
/* 
var option = {
    accessToken: 'CAACMdh4LeZBcBABu8EeB60GaaT6P7q5pYZB05HQQj3OP9ZCRJ524Nn60ZCYVZBkUrDpeAHZBZBZCFkx4vcu2sQGkX00MiRgfuZAR0ueSThd7LPqz6miAxBBpSL3HolBPVKKNkuVQnAQrCKAJfQWiZBXeZAcRfg5UQcFrqQXyFOyF1Kkg2N4wUTprDG3ZC3frAlFQzlFED9k3RDx4dQZDZD',
    source: 'https://s3.amazonaws.com/miix_content/user_project/mood-5244fd13624cd3cc0900000d-1381962600000-005-1381962725770/mood-5244fd13624cd3cc0900000d-1381962600000-005-1381962725770.jpg',
    text: 'Jeff Chai 於2013年10月3日下午5:21，登上台北小巨蛋天幕！'
};

canvasProcessMgr.markTextAndIcon(option, function(err, res){
    console.log(res);
});
 */
