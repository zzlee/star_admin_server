
var DEBUG = true,
FM_LOG = (DEBUG) ? function(str){ logger.info( typeof(str)==='string' ? str : JSON.stringify(str) ); } : function(str){} ;

var FM = { censorHandler: {} };

var censorMgr = require("../censor_mgr.js");
var apis = require("../routes/api.js");
var scheduleMgr = require("../schedule_mgr.js");
var db = require('../db.js');
var sessionItemModel = db.getDocModel("sessionItem");


/**
 * @param  request  {json}sort:{?}
 *                        ex:{
 *                            'rating':1,
 *                            'doohPlayedTimes':-1,
 *                            'description':-1
 *                           };
 *                  {json}condition:{?}
 *                        ex:{
 *                            'createdOn': {$gte: 'May 01, 2013', $lt: 'Jun 27, 2013'},
 *                            'doohPlayedTimes':0,
 *                            'rating':'a'
 *                           }
 * 
 *         query    {number}createdOn
 *                  {string}rating
 *                  {number}doohPlayedTimes     
 *                  
 * @return response json{userContent(photo url or userContent link in s3),
 *                       FB_ID,
 *                       title,
 *                       description,
 *                       createdOn,
 *                       rating(Range A~E),
 *                       doohPlayedTimes}
 */
FM.censorHandler.getUGCList_get_cb = function(req,res){
    
    var condition;
    var sort;
    var limit;
    var skip;
    //default
    condition = {
            'no':{ $exists: true},
            'ownerId':{ $exists: true},
            'projectId':{ $exists: true}
    };
    sort = {
            'createdOn':-1
    };
    
    if(req.query.condition)   
        condition = req.query.condition;
    if(req.query.sort) 
        sort = req.query.sort;

    limit = req.query.limit;
    skip = req.query.skip;

    censorMgr.getUGCList(condition, sort, limit, skip, function(err, UGCList){
        if (!err){
            res.render( 'table_censorUGC', {ugcCensorMovieList: UGCList} );
        }
        else{
            res.send(400, {error: err});
        }
    });

};

/**
 * @param  request  {number}no
 * 
 *         body     {string}UGCLevel(Range A~E)    
 *                  
 * @return response {string}status 
 *                       
 */
FM.censorHandler.setUGCAttribute_get_cb = function(req,res){

    var no = req.body.no;
    var vjson = req.body.vjson;

    censorMgr.setUGCAttribute(no, vjson, function(err, result){
        if (!err){
            res.send(200, {message:result});
        }
        else{
            res.send(400, {error: err});
        }
    });


};

FM.censorHandler.postProgramTimeSlotSession_cb = function(req, res){
    
    var doohId = req.params.doohId;
    var intervalOfSelectingUGCStart =  new Date(req.body.intervalOfSelectingUGC.start).getTime();
    var intervalOfSelectingUGCend =  new Date(req.body.intervalOfSelectingUGC.end).getTime();
    var intervalOfSelectingUGC = {start: intervalOfSelectingUGCStart, end: intervalOfSelectingUGCend};

    var intervalOfPlanningDoohProgramesStart = new Date(req.body.intervalOfPlanningDoohProgrames.start).getTime();
    var intervalOfPlanningDoohProgramesEnd = new Date(req.body.intervalOfPlanningDoohProgrames.end).getTime();
    var intervalOfPlanningDoohProgrames = {start: intervalOfPlanningDoohProgramesStart, end: intervalOfPlanningDoohProgramesEnd};
    
    var programSequence = req.body.programSequence;

    scheduleMgr.createProgramList(doohId, intervalOfSelectingUGC, intervalOfPlanningDoohProgrames, programSequence, function(err, result){
        if (!err){
            res.send(200, {message: result.sessionId});
        }
        else{
            res.send(400, {error: err});
        }
    });

};


FM.censorHandler.gettimeslots_get_cb = function(req, res){
    var sessionId = null;
    if (req.query.extraParameters){
        var extraParameters = JSON.parse(req.query.extraParameters);
        sessionId = extraParameters.sessionId;
    }
    var limit = req.query.limit;
    var skip = req.query.skip;
    var testArray = [];

    if(req.query.condition){
        var updateUGC = req.query.condition;
    }

    logger.info('[FM.censorHandler.gettimeslots_get_cb()] sessionId='+ sessionId);
    scheduleMgr.getProgramListBySession(sessionId, limit, skip, function(err, programList){
        debugger;
        if (!err){
            if (programList.length > 0){
                censorMgr.getPlayList(programList , updateUGC, function(errGetPlayList, result){
                    if (!errGetPlayList){
                        res.render( 'table_censorPlayList', {ugcCensorPlayList: result} );
                    }
                    else 
                        res.send(400, {error: err});
                });
                
            }
            else {
                res.render( 'table_censorPlayList', {ugcCensorPlayList: []} );
            }
            
        }
        else{
          res.send(400, {error: err});
        }
    });

};

FM.censorHandler.pushProgramsTo3rdPartyContentMgr_get_cb = function(req, res){
    var sessionId = req.params.sessionId;
    var doohId = req.params.doohId;
    
    var intervalOfSelectingUGCStart =  new Date(req.body.intervalOfSelectingUGC.start).getTime();
    var intervalOfSelectingUGCend =  new Date(req.body.intervalOfSelectingUGC.end).getTime();
    var intervalOfSelectingUGC = {start: intervalOfSelectingUGCStart, end: intervalOfSelectingUGCend};
    
    var intervalOfPlanningDoohProgramesStart = new Date(req.body.intervalOfPlanningDoohProgrames.start).getTime();
    var intervalOfPlanningDoohProgramesEnd = new Date(req.body.intervalOfPlanningDoohProgrames.end).getTime();
    var intervalOfPlanningDoohProgrames = {start: intervalOfPlanningDoohProgramesStart, end: intervalOfPlanningDoohProgramesEnd};
    
    var originSequence = req.body.originSequence;

    scheduleMgr.pushProgramsTo3rdPartyContentMgr(sessionId, function(err){
        if (!err){
            //TODO pushProgramsTo3rdPartyContentMgr
            res.send(200);
            //write session info to db
          sessionInfoVjson = {
          dooh: doohId,
          sessionId: sessionId,
          intervalOfSelectingUGC: intervalOfSelectingUGC,
          intervalOfPlanningDoohProgrames: intervalOfPlanningDoohProgrames,
          pushProgramsTime: new Date,
          programSequence: originSequence
          };
          db.createAdoc(sessionItemModel, sessionInfoVjson, function(err, result){
          if(!err){
              logger.info('[FM.censorHandler.postProgramTimeSlotSession_cb()] sessionItemModel create to db ok! sessionId='+ sessionId);
          }else{
              logger.info('[FM.censorHandler.postProgramTimeSlotSession_cb()] sessionItemModel create to db fail! sessionId='+ sessionId+'err='+err);
          }
      });
            //end of write session info to db
        }
        else{
            res.send(400, {error: err});
        }
    });

};

FM.censorHandler.updatetimeslots_get_cb = function(req, res){

    var programTimeSlot =  req.body.programTimeSlotId;
    var ugcReferenceNo = req.body.ugcReferenceNo;


    if(req.body.type == 'removeUgcfromProgramAndAutoSetNewOne'){
        scheduleMgr.removeUgcfromProgramAndAutoSetNewOne(sessionId, programTimeSlot, function(err, result){
            if (!err){
                res.send(200, {message: result});
            }
            else{
                res.send(400, {error: err});
            }
        });
    }

    if(req.body.type == 'setUgcToProgram'){
        
        scheduleMgr.setUgcToProgram(programTimeSlot, ugcReferenceNo, function(err, result){
            if (!err){
                res.send(200, {message: result});
            }
            else{
                res.send(400, {error: err});
            }
        });
    }

};

FM.censorHandler.getSessionList_get_cb = function(req,res){

    var condition;
    var limit;
    var skip;
    var interval= {start: (new Date("1911/1/1 00:00:00")).getTime(), end: (new Date("9999/12/31 12:59:59")).getTime()};

    limit = req.query.limit;
    skip = req.query.skip;
    
    if(req.query.condition){
        interval = {start :(new Date(req.query.condition.playtimeStart)).getTime(), end :(new Date(req.query.condition.playtimeEnd)).getTime()};
    }

    scheduleMgr.getSessionList(interval, limit, skip, function(err, historyList){
        if (!err){
            res.render( 'table_history', {historyList: historyList} );
        }
        else{
            res.send(400, {error: err});
        }
    });

};

FM.censorHandler.getHighlightUGCList_get_cb = function(req,res){
    
    var condition;
    var sort;
    var limit;
    var skip;
    //default
    condition = {
            'no':{ $exists: true},
            'ownerId':{ $exists: true},
            'projectId':{ $exists: true},
            'doohPlayedTimes':{$gte : 1}
    };
    sort = {
            'createdOn':-1
    };
    
    if(req.query.condition)   
        condition = req.query.condition;
    if(req.query.sort) 
        sort = req.query.sort;

    limit = req.query.limit;
    skip = req.query.skip;

    censorMgr.getUGCList(condition, sort, limit, skip, function(err, UGCList){
        if (!err){
            res.render( 'table_censorHighlight', {ugcCensorMovieList: UGCList} );
        }
        else{
            res.send(400, {error: err});
        }
    });

};


module.exports = FM.censorHandler;