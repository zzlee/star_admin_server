var connectionHandler = {};

var request = require("request");
var events = require("events");
var eventEmitter = new events.EventEmitter();
var globalConnectionMgr;

eventEmitter.setMaxListeners(50);

var requestsToRemote = {};

connectionHandler.init = function( _globalConnectionManager ){
    globalConnectionMgr = _globalConnectionManager;
};

connectionHandler.sendRequestToRemote = function( targetID, reqToRemote, cb ) {
    //TODO: make sure reqToRemote is not null
    reqToRemote._commandID = reqToRemote.command + '__' + targetID + '__' + (new Date()).getTime().toString();
    
    if (!requestsToRemote[targetID]){
        requestsToRemote[targetID] = [];
    }
    
    requestsToRemote[targetID].push(reqToRemote);
    
    if ( globalConnectionMgr.isConnectedTo(targetID) ){
        eventEmitter.emit('COMMAND_'+targetID, requestsToRemote[targetID].shift());
    }
    
    
    eventEmitter.once('RESPONSE_'+reqToRemote._commandID, cb);
};

//POST /internal/command_responses
connectionHandler.commandResponse_post_cb = function(req, res) {

    if ( systemConfig.IS_STAND_ALONE ) {
        var commandID = req.body._commandId;
        var remoteID = req.body._remote_id;
        var responseParameters = req.body;
        
        eventEmitter.emit('RESPONSE_'+commandID, responseParameters);
        logger.info('Got response ' + commandID + ' from ' + remoteID + ' :' );
        logger.info(JSON.stringify(responseParameters));
        
        res.send(200);
    }
    else { //star_server has multiple instances (due to auto-scale of AWS)
        request({
            method: 'POST',
            uri: systemConfig.HOST_STAR_COORDINATOR_URL + '/internal/command_responses',
            body: req.body,
            json: true
            
        }, function(error, response, body){

            if (body) {
                res.send(body);    
            }
            else {
                res.send(500,{error:"star_coordinator does not successfully return the command info"});
            }
                    
        });
        
    }
};


//GET /internal/commands
connectionHandler.command_get_cb = function(req, res) {
	logger.info('['+ new Date() +']Got long-polling from remote: '+ req.query.remoteId );
	//console.log('['+ new Date() +']Got long-polling from remote: '+ req.query.remoteId );
	//console.dir(req);
	
	if ( systemConfig.IS_STAND_ALONE ) {
        var messageToRemote = {};

        var callback = function(reqToRemote) {
            // logger.info(reqToRemote);
            clearTimeout(timer);
            messageToRemote.type = "COMMAND";
            messageToRemote.body = reqToRemote;
            res.send(messageToRemote);
            globalConnectionMgr.removeConnection(req.query.remoteId);
        };

        globalConnectionMgr.addConnection(req.query.remoteId, req.query.remoteType, req.query.remoteLoad);

        var timer = setTimeout(function() {
            eventEmitter.removeListener('COMMAND_' + req.query.remoteId,
                    callback);
            messageToRemote.type = "LONG_POLLING_TIMEOUT";
            messageToRemote.body = null;
            res.send(messageToRemote);
            globalConnectionMgr.removeConnection(req.query.remoteId);
        }, 60000);
        // }, 5000);

        eventEmitter.once('COMMAND_' + req.query.remoteId, callback);
        if (requestsToRemote[req.query.remoteId]) {
            if (requestsToRemote[req.query.remoteId].length > 0) {
                eventEmitter.emit('COMMAND_' + req.query.remoteId,
                        requestsToRemote[req.query.remoteId].shift());
            }
        }

	}
	else { //star_server has multiple instances (due to auto-scale of AWS)
        
        request({
            method: 'GET',
            uri: systemConfig.HOST_STAR_COORDINATOR_URL + '/internal/commands',
            qs: req.query,
            json: true
            
        }, function(error, response, body){

            if (body) {
                res.send(body);    
            }
            else {
                res.send(500,{error:"star_coordinator does not successfully return the command info"});
            }
                    
        });


	}
	

};

module.exports = connectionHandler;