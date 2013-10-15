connectionMgr = {};


jQuery.support.cors = true;

var REMOTE_TYPE = "ADMIN_BROWSER";
var REMOTE_ID = "admin_browser";

connectionMgr.answerMainServer = function( commandID, answerObj, cb ){
	answerObj._commandId = commandID;
	
	var ajaxURL = "/internal/command_responses";
	
	$.ajax({
		//url: "/internal/command_responses",
		url: ajaxURL,
		type: "POST",
		data:  answerObj
	}).done( function (chunk) {
		//console.log('BODY: ');
		//console.dir(chunk);
	}).always(function() {
		if (cb) {
			//console.log('cb of answerMainServer is called');
			cb(null);
		}
	});
		
	
};


//long-polling connection to Star Server
connectionMgr.connectToMainServer = function( getCommand_cb) {
	var ajaxURL = "/internal/commands";
	
	var dataToSend = {
		remoteId: REMOTE_ID,
		remoteType: REMOTE_TYPE
	};
	
	$.ajax({
		url: ajaxURL,
		type: "GET",
		data:  dataToSend,
		dataType: "json",
		cache: false
	}).done( function (resData) {
		//console.log('resData: ');
		//console.log(resData);
		if ( resData.type == "COMMAND" ) {
			//process the command sent from Star server
			//console.log('COMMAND BODY: '+ resData.body);
			
			var commandID = resData.body._commandID;
			
			if (getCommand_cb) {
				getCommand_cb( commandID, resData.body);				
			}
			
		}			
		//console.log('<done>Connection to Main Server ends');
	}).fail(function(jqXHR, textStatus, errorThrown) {
		//console.log('<always>Connection to Main Server ends');
		//console.log( 'err:' + errorThrown);
	}).always(function() {
		//console.log('<always>Connection to Main Server ends');
		//console.log('Connection to Main Server ends');
		connectionMgr.connectToMainServer( getCommand_cb);			
	});
	
	//console.log('Connection to Main Server starts');

};
