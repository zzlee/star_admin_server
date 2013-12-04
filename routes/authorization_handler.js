
var FM = { authorizationHandler: {} };

var tokenMgr = require('../token_mgr.js');
var memberDB = require("../member.js");
FM.authorizationHandler.checkAuth = function(req, res, next) {
    tokenMgr.checkToken(req.param('miixToken'), req.route.path, function(authorized){
        if (authorized){
            next();
        }
        else{
            tokenMgr.checkToken(req.param('token'), req.route.path, function(authorized2){
                if (authorized2){
                    next();
                }
                else{
                    res.send(401);
                }
            });
        }
    });
    
};

//PUT /members/:memgerId/device_tokens
FM.authorizationHandler.updateDeviceToken = function(req, res) {
	//update device token from android devices
	logger.info('[PUT ' + req.path + '] is called');
	
	if(req.body){
//	    FM_LOG("\n[Got Device_Token] " + res.body.deviceToken);
//	    var oid = ObjectID.createFromHexString(req.params.memberId);
	    var oid = req.params.memberId;
	    var jsonStr = '{"deviceToken.' + req.body.platform +'":"'+ req.body.deviceToken + '"}';
	    
        var json = JSON.parse(jsonStr);
        memberDB.updateMember( oid, json, function(err, result){
            if(err) logger.info("[authorizationHandler.updateDeviceToken error]"+err);
            if(result) logger.info("[authorizationHandler.updateDeviceToken result]"+result);
            res.send({"message": "Update Device Token!"});
//            res.send(200);
        });
	}else{
//	    res.send(400);
	    res.send({"message": "Failed!"});
	}
	
	
};

FM.authorizationHandler.connectServerStatus = function(req, res){
	//Make sure the client side can connect star_server
	logger.info('[GET ' + req.path + '] is called');
	res.send({"state":"normal","message":"Successful"});
	//If our server or mongodb don't work, need to send the msg to client side
	//res.send({"state":"maintenance","message":"維護時間：13:30~14:00，造成您的困擾深感抱歉。"});
};

module.exports = FM.authorizationHandler;