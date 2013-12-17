var path = require('path');
var workingPath = process.cwd();

var admin_mgr = require("../admin.js"),
service_mgr = require("../service_mgr.js"),
tokenMgr = require("../token_mgr.js"),
pushMgr = require("../push_mgr.js");

var FMDB = require('../db.js');


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

FM.service.pushMessage_get_cb = function(req, res){
	var message;
	var app;

    if(req.body.message){
		message = req.body.message;
    }
	if(req.body.app){
		app = req.body.app;
    }
	
    pushMgr.sendMessageToAllMemberByApp(message, app, function(err, result){
        if(!err){
            res.send(200, {message: 'ok'});
        }
        else{
            res.send(400, {error: "Parameters are not correct"});
        }
    });

};

module.exports = FM.service;