/**
 * ftp.js
 * 
 */

var ftp = {};

var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

// options : {
    // host : String,
    // username : String,
    // password : String || Number
// }

ftp.init = function( options ) {
    var body = {};
    
    var setting = 
    {
        host : options.host,
        username : options.username,
        password : options.password
    };
    
    body.get = function( file, get_cb ) {
        
        var setpath = path.join(__dirname, 'get_cmd.txt');
        
        var getter = function( getter_cb ) {
            var message = [];
            var execute = spawn('ftp', ['-s:' + setpath, setting.host]);

            execute.stdout.on('data', function (data) { message += data;/* console.log('stdout: ' + data); */ });
            // execute.stderr.on('data', function (data) { console.log('stderr: ' + data); });

            execute.on('exit', function (code) {
                // console.log(message);
                if(getter_cb)
                    if(message.search('log in') >= 0)
                        getter_cb('error');
                    else
                        getter_cb('done');
            });
        };
        
        var content = setting.username + '\n' + 
                      setting.password + '\n' + 
                      'get ' + file + '\n' + 
                      'close' + '\n' + 'bye';
        
        var ftp_get = fs.createWriteStream(setpath, { 
            flags: 'w',
            encoding: 'utf-8',
            mode: 0777 
        });
        
        ftp_get.write( content );
        ftp_get.end();
        ftp_get.on('close', function(){
            // console.log('close done');
            getter(function(status) {
                fs.unlinkSync(setpath);
                get_cb(status);
            });
        });
        
    };
    
    return body;
};

module.exports = ftp;

/* --- TEST --- */
