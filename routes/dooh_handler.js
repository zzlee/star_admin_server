/**
 *  dooh_handler.js
 */
 
var FM = { dooh_handler: {} };
var workingPath = process.cwd();

var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info( typeof(str)==='string' ? str : JSON.stringify(str)); } : function(str){} ;

var storyCamControllerMgr = require("../story_cam_controller_mgr.js");

var fs = require('fs');
var path = require('path');

var popMgr = require('../pop_mgr.js');

FM.dooh_handler.lastMoviePlayed = null;
FM.dooh_handler.lastMovieStopped = null;

/* ------ Handler API ------ */    

//POST /internal/dooh/movie_playing_state
FM.dooh_handler.doohMoviePlayingState_post_cb = function(req, res) {
    var resIsSent = false;
	if ( req.headers.miix_movie_project_id ) {
		if ( (req.headers.state == 'playing')&&(req.headers.miix_movie_project_id != FM.dooh_handler.lastMoviePlayed) ){
			logger.info('dooh starts playing movie');
            FM.dooh_handler.lastMoviePlayed = req.headers.miix_movie_project_id;
			storyCamControllerMgr.startRecording( req.headers.miix_movie_project_id, function(resParametes){
				logger.info('story cam started recording.');
				logger.info('res: _commandId='+resParametes._commandId+' err='+resParametes.err);
				res.send(200);
                resIsSent = true;
			});
			
		}
		else if ( (req.headers.state == 'stopped')&&(req.headers.miix_movie_project_id != FM.dooh_handler.lastMovieStopped) ){
			logger.info('dooh stopped playing movie');
            FM.dooh_handler.lastMovieStopped = req.headers.miix_movie_project_id;
			storyCamControllerMgr.stopRecording( function(resParametes){
				logger.info('story cam stopped recording.');
				logger.info('res: _commandId='+resParametes._commandId+' err='+resParametes.err);
				res.send(200);
                resIsSent = true;
			});
		}
        //
        setTimeout(function(){
            if (!resIsSent ){
                res.send(500, {error: "Remote story camera does not respond in 8 sec."});
            }
        }, 8000);        
	}
	else {
		res.send(400, {error: "Bad Request!"} );
	}
};

//GET /internal/dooh/padding_start_html
FM.dooh_handler.streamVideoTrigger = function(req, res){
    var contentGenre = req.params.contentGenre;
    var contentHtmlFile = null;
    switch(contentGenre)
    {
    case 'miix_it':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-miix_it-start.html');
        break;
    case 'cultural_and_creative':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-cultural_and_creative-start.html');
        break;
    case 'mood':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-wish-start.html');
        break;
    case 'check_in':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-check_in-start.html');
        break;
    default:
        
    } 
    fs.readFile(contentHtmlFile, 'utf8', function(err, text){
        res.send(text);
		logger.info('story cam started recording.');
        FM.dooh_handler.lastMoviePlayed = req.headers.miix_movie_project_id;
        storyCamControllerMgr.startRecording( '', function(resParametes){
            logger.info('res: _commandId='+resParametes._commandId+' err='+resParametes.err);
            res.send(200);
            resIsSent = true;
        });
    });
};

//JF
//GET /internal/dooh/padding_start_html/shutter
FM.dooh_handler.streamShutterTrigger = function(req, res){
    var contentGenre = req.params.contentGenre;
    var contentHtmlFile = null;
    switch(contentGenre)
    {
    case 'cultural_and_creative':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-cultural_and_creative-start.html');
        break;
    case 'mood':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-wish-start.html');
        break;
    case 'check_in':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-check_in-start.html');
        break;
    case 'wls':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-wls-start.html');
        break;
    default:
        
    } 
    fs.readFile(contentHtmlFile, 'utf8', function(err, text){
        res.send(text);
		logger.info('story cam started shutter.');
        FM.dooh_handler.lastMoviePlayed = req.headers.miix_movie_project_id;
        storyCamControllerMgr.startShutter(function(resParametes){
            logger.info('res: _commandId='+resParametes._commandId+' err='+resParametes.err);
            res.send(200);
            resIsSent = true;
        });
    });
};

FM.dooh_handler.widgetShutterTrigger = function(req, res){
    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var triggerTime = null;
    if(!query.time) {
        triggerTime = new Date().getTime();
        logger.info('story cam started shutter, server time is ' + triggerTime);
    }
    else {
        triggerTime = query.time;
        logger.info('story cam started shutter, player time is ' + triggerTime);
    }
    storyCamControllerMgr.startShutter(triggerTime, function(resParametes){
        // logger.info('res: _commandId='+resParametes._commandId+' err='+resParametes.err);
        // res.send(200);
        // resIsSent = true;
    });
};

//GET /internal/dooh/padding_start_html/recording
FM.dooh_handler.streamRecordingTrigger = function(req, res){
    var contentGenre = req.params.contentGenre;
    var contentHtmlFile = null;
    switch(contentGenre)
    {
    case 'miix_it':
        contentHtmlFile = path.join(workingPath, 'public/contents/padding_content/ondascreen_padding-miix_it-start.html');
        break;
    default:
        
    } 
    fs.readFile(contentHtmlFile, 'utf8', function(err, text){
        res.send(text);
		logger.info('story cam started recording.');
        FM.dooh_handler.lastMoviePlayed = req.headers.miix_movie_project_id;
        storyCamControllerMgr.startRecording( '', function(resParametes){
            logger.info('res: _commandId='+resParametes._commandId+' err='+resParametes.err);
            res.send(200);
            resIsSent = true;
        });
    });
};

// GET /internal/dooh/check_player_logs
FM.dooh_handler.checkPlayerLogs = function(req, res) {
    var check;
    popMgr.execute(function(pop_err, pop_res) {
        if(pop_err) {
            // res.send(200, 'check_player logs is error.');
            res.send(200, pop_err);
        }
        else {
            // res.send(200, 'check_player logs is OK.');
            res.send(200, pop_res);
        }
        res.end();
    });
};

module.exports = FM.dooh_handler;