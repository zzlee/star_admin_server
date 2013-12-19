//test_time

var path = require('path');
var workingPath = process.cwd();

var admin_mgr = require("../admin.js"),
service_mgr = require("../service_mgr.js"),
tokenMgr = require("../token_mgr.js"),
pushMgr = require("../push_mgr.js");

var FMDB = require('../db.js');
var async = require('async');

var DEBUG = true,
FM_LOG = (DEBUG) ? function(str){ logger.info( typeof(str)==='string' ? str : JSON.stringify(str) ); } : function(str){} ;

var FM = { service: {} };

FM.service.get_cb = function(req, res){

    FM_LOG("[service.get_cb]");
    var loginHtml = path.join(workingPath, 'public/miix_admin/admin_login.html');
    var mainAdminPageHtml = path.join(workingPath, 'public/service_frame.html');

    if (!req.session.admin_user) {
        res.sendfile(loginHtml);
    }
    else{
        res.sendfile(mainAdminPageHtml);
    }

};

FM.service.getCustomerServiceItems_get_cb = function(req, res){
//  console.dir(req);
    var condition = req.query.condition;
    var field = req.query.field;
    var type = req.query.type;
    
    //TODO pagination
    var pageLimit=0;
    var pageSkip=0;

    if(req.params.member_id)
        condition = { 'ownerId._id': req.params.member_id};
    
    service_mgr.getCustomerServiceItem(condition, field, pageLimit, pageSkip, function(err, result){
        if(!err){
//          console.log('getCustomerServiceItem'+result);
            switch (type)
            {
            case 'table':
                res.render( 'table_service', {serviceQuestionList: result} );
                break;
            case 'list':
                res.render( 'list_service', {serviceQuestionList: result} );
                break;
            default:
                res.send(200, {message: result});
            }
        }

        else{
            // console.log(err);
            res.send(400, {error: "Parameters are not correct"});
        }
    });
};

FM.service.createCustomerServiceItems_get_cb = function(req, res){

    if(req.params.member_id){
        var vjson = {
                ownerId : {_id : req.params.member_id},
                genre : req.body.genre,
                phoneVersion : req.body.phoneVersion,
                question : req.body.question
        };
    }
    service_mgr.createCustomerServiceItem(vjson, function(err, result){
        if(!err){
            res.send(200, {message: 'ok'});
//          console.log('createItems'+result);
        }
        else{
            // console.log('createItems'+err);
            res.send(400, {error: "Parameters are not correct"});
        }
    });

};

FM.service.updateCustomerServiceItems_get_cb = function(req, res){

    _id = req.body._id;
    vjson = req.body.vjson;
    if(req.body.answer){
        vjson = {
                answer: req.body.answer,
                answerTime: new Date(),
                reply: true
        };
    }
    if(req.body.answer === ''){
        vjson = {
                answer: req.body.answer,
                answerTime: new Date(),
                reply: false
        };
    }

//  console.log('updateCustomerServiceItems_get_cb'+_id+JSON.stringify(vjson));
    service_mgr.updateCustomerServiceItem(_id, vjson, function(err, result){
        if(!err){
            res.send(200, {message: 'ok'});
//          console.log('updateItems'+result);
        }
        else{
            res.send(400, {error: "Parameters are not correct"});
        }
    });

};
/*Actually, 'FM.service.pushMessage_get_cb' just save form data from client to db,
 * it will not to do push Immediately, because each push may have the push time 
 * by itself.
 * by Joy
 * */
FM.service.pushMessage_get_cb = function(req, res){
    
	var message; 
	var app; 

    if(req.body.message){message = req.body.message;}
	if(req.body.app){app = req.body.app;}
	if(req.body.pushGenre){pushGenre = req.body.pushGenre;}
	if(req.body.pushTime){pushTime = req.body.pushTime; }
	
	async.series([
	              function(callback) { //create a new record in pushAllMessage collection
	                  service_mgr.createPushAllMessage({content:message,appGenre:app,pushGenre:pushGenre, pushTime: pushTime}, function(err, result){
                          if(!err){
                              callback(null);
                          }else{
                              callback('failed in service_mgr.createPushAllMessage'+err);
                          }
                      });
	              }
	              ],
	              function(err, results){
	                if(!err) {
	                    res.send(200, {message: 'create new row in DB done!'});
	                }else{
	                    res.send(400, {error: "Parameters are not correct"});
	                }
	});    
};

/* for client side to show UI, and for FM.service.checkAndSendPushAll 
 * to collect stuff to send push. by Joy
 * */
FM.service.getPushAllMessage_get_cb = function(req, res){
    var condition = req.query.condition;
    service_mgr.getPushAllMessage(condition, function(err, result){
        if(!err){
            res.send(200, {message: 'getPushAllMessage success!',result:result});
        }else{
            res.send(400, {error: "failed in getPushAllMessage"});
        }
    });
};

/* check which row of pushAllMessage should be pushed(by nowTime), and put in an object array
 * , then use the array to do 'sendMessageToAllMemberByApp', when get the cb of 
 * 'sendMessageToAllMemberByApp', update the 'pushStatus' to true.  by Joy
 * */
FM.service.checkAndSendPushAll = function(checkAndSendPushAll_cb){
    var willBePushed =[];
    
    async.series([
                  function(callback) { //determine wihch push should send, and put this row in obj array
                      service_mgr.getPushAllMessage({pushStatus: false}, function(err, result){
                          if(!err){
                              for(var i = 0;i<result.length;i++){
                                  var itemTime = new Date(result[i].pushTime).getTime();
                                  var nowTime = new Date().getTime();
                                  
                                  if(itemTime < nowTime) {
                                      willBePushed.push({app:result[i].appGenre,message:result[i].content, _id:result[i]._id});
                                  }
                              }
                              callback(null);
                          }else{
                              callback("failed in service_mgr.getPushAllMessage"+err);
                          }
                      });
                  },
                  function(callback) { // send push, and update the "pushStatus" to true
                      if(willBePushed.length != 0) {
                          var iterator_pushList = function(iterator, cb_each){
                              var iterator_app = iterator.app;
                              var iterator_message = iterator.message;
                              var iterator_id = iterator._id;
                              
                              pushMgr.sendMessageToAllMemberByApp(iterator_message, iterator_app, function(err, result){
                                  if(!err){
                                      service_mgr.updatePushAllMessage(iterator_id,{"pushStatus":true},function(err,result){
                                         if(!err){
                                             cb_each(null);
                                         }else {
                                             cb_each("failed in sendMessageToAllMemberByApp (async.eachSeries)"+err);
                                         }
                                      });
                                    cb_each(null);
                                  }else{
                                      cb_each("failed in sendMessageToAllMemberByApp (async.eachSeries)"+err);
                                  }
                              });
                          };
                          
                          async.eachSeries(willBePushed, iterator_pushList, function(err, results){
                              if(!err){
                                  callback(null);
                              }else{
                                  callback('failed in send push, and update the "pushStatus" to true'+err);
                              }
                          });
                      }else {
                          callback(null);
                      }
                  }
                  ],
                  function(err, results){
                    if(!err) {
                        checkAndSendPushAll_cb(null);
                    }else{
                        checkAndSendPushAll_cb('error in checkAndSendPushAll'+err);
                    }
    });
};

module.exports = FM.service;