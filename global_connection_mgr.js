var FM = {};
var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info(str); } : function(str){} ;
    
var request = require("request");
var connectionHandler = require('./routes/connection_handler.js');

FM.globalConnectionMgr = (function(){
    var uInstance = null;
    var connectedRemotes = new Object();  //set connectedRemotes as a hash table of all connections
    
    function constructor(){
        //the methods exposed to public
        var _this = {
            addConnection: function(remoteID, type, load){
                //console.log('%s is connected! [type=%s]', remoteID, type);
                connectedRemotes[remoteID] = {type: type, load: load};
            },
            
            removeConnection: function(remoteID){
                //console.log('%s is disconnected!', remoteID);
                delete connectedRemotes[remoteID];
            },
                        
            getConnectedRemoteWithLowestLoad: function(type, cbOfGetConnectedRemoteWithLowestLoad){
                
            	if ( systemConfig.IS_STAND_ALONE ) {
            	    var connectedRemoteWithLowestLoad = null;
                    for (anId in connectedRemotes){
                        var lowestLoadIndex = 1000000;                        
                        //console.log('%s %s', anId, connectedRemotes[anId]);
                        if (type){
                            if (connectedRemotes[anId].type==type){
                                if (connectedRemotes[anId].load < lowestLoadIndex ) {
                                    lowestLoadIndex = connectedRemotes[anId].load;
                                    connectedRemoteWithLowestLoad = anId;
                                }
                            }                        
                        }
                        else { 
                            cbOfGetConnectedRemoteWithLowestLoad('Parameter "type" is not specified.', null);
                        }
                    }
                    
                    cbOfGetConnectedRemoteWithLowestLoad(null, connectedRemoteWithLowestLoad);
                }
                else { //star_server has multiple instances (due to auto-scale of AWS)
                    request({
                        method: 'GET',
                        uri: systemConfig.HOST_STAR_COORDINATOR_URL + '/internal/connected_remote_with_lowest_load',
                        qs: {"type": type},
                        json: true
                        
                    }, function(error, response, body){
                    
                        if (body) {
                            cbOfGetConnectedRemoteWithLowestLoad(null, body.connectedRemoteWithLowestLoad);    
                        }
                        else {
                            cbOfGetConnectedRemoteWithLowestLoad("Failed to get connected remotes from star_coordinator: "+error, null);  //TODO: check the content of error parameters
                        }
                                
                    });
                }
            },
            
            isConnectedTo: function(remoteID){
                if (  connectedRemotes[remoteID] ){
                    return true;
                }
                else{
                    return false;
                }
            },
            
            sendRequestToRemote: function( targetedRemoteID, reqToRemote, cbOfSendRequestToRemote ) {
            	if ( systemConfig.IS_STAND_ALONE ) {
                    connectionHandler.sendRequestToRemote( targetedRemoteID, reqToRemote, cbOfSendRequestToRemote );
                }
                else { //star_server has multiple instances (due to auto-scale of AWS)
                    request({
                        method: 'POST',
                        uri: systemConfig.HOST_STAR_COORDINATOR_URL + '/internal/requests_to_remote',
                        body: {"targetedRemoteID": targetedRemoteID, "reqToRemote": reqToRemote},
                        json: true,
                        timeout: 60*60*1000
                        
                    }, function(error, response, body){
                    
                        if (body) {
                            cbOfSendRequestToRemote(body.responseParameters);    
                        }
                        else {
                            cbOfSendRequestToRemote({err: "Failed to send request to remote: "+error});  //TODO: check the content of error parameters
                        }
                                
                    });

                }
            },
            
            sendMessageToMobileByRemote: function( phoneNum, code, cbOfSendMessageToMobileByRemote ) {
					logger.info("[globalConnectionMgr.sendMessageToMobileByRemote] start phoneNum:"+phoneNum+"code"+code);
                    request({
                        method: 'POST',
                        uri: systemConfig.HOST_STAR_COORDINATOR_URL + '/internal/send_message_to_mobile_by_remote',
                        body: {"phoneNum": phoneNum, "code": code},
                        json: true,
                        // timeout: 60*60*1000
                        
                    }, function(error, response, body){
                    
                        if (body) {
                            cbOfSendMessageToMobileByRemote(null, body.responseParameters);    
                        }
                        else {
                            cbOfSendMessageToMobileByRemote({err: "Failed to send request to remote: "+error}, null);  //TODO: check the content of error parameters
                        }
                                
                    });

            }
            
                
        };
        
        connectionHandler.init(_this);
        
        return _this;
    }
    
    return {
        getInstance: function(){
            if(!uInstance){
                uInstance = constructor();
            }
            
            return uInstance;
        }
    };
})();

/* TEST */
//FM.globalConnectionMgr.getInstance()._test();

module.exports = FM.globalConnectionMgr.getInstance();