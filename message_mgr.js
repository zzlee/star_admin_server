var FM = {};
var DEBUG = true, FM_LOG = (DEBUG) ? function(str) {
//	logger.info(str);
} : function(str) {
};

FM.MessageMgr = (function() {
	var uInstance = null;
	var db = require('./db.js');
	var messageModel = db.getDocModel("message");

	function constructor() {
	    var async = require('async');
	    var db = require('./db.js');

		return {

			createMessage : function(memberId,  message, cbOfCreateMessage){
				var jsonOfNewMessage = {
					content: message,
					ownerId: {_id: memberId},
					showInCenter: true
				}
				
				var newMessage = new messageModel(jsonOfNewMessage);
				newMessage.save(function(err, res){
					if(!err) {
						logger.info('[createMessage] done, memberId: '+ memberId+',message: '+message);
						cbOfCreateMessage(null, "done");
					}
					else{
						logger.error('[createMessage] error: '+ err);
						cbOfCreateMessage("new message save to db error: "+ err, null);
					}
				});
			
			},
			
			updateMessage : function(messageId,  vjson, cbOfUpdateMessage){
				
				db.updateAdoc(messageModel, messageId, vjson, function(err, result){
					if(!err) {
						logger.info('[updateMessage_updateAdoc] done, messageId: '+ messageId+',vjson: '+vjson);
						cbOfUpdateMessage(null,'done');
					}
					else{
						logger.error('[updateMessage_updateAdoc] error: '+ err);
						cbOfUpdateMessage("update message error"+err,null);
					}
				});
			
			},			
			
            /** TEST */
            _testkaiser: function(){
                var userNo = 1234;
                var memberId = '52b7e3f115678eec0a000103';
                var message = "★哇！聖誕祝福來囉★ 哇！上小巨蛋，提供聖誕特別模板， 今年聖誕，給朋友史上最大的聖誕祝福吧！";
                this.createMessage( memberId, message, function(err, result){
                        //console.log(err, result);
                });
            },
		};// end return
	}

	return {
		getInstance : function() {
			if (!uInstance) {
				uInstance = constructor();
			}

			return uInstance;
		}
	};
})();

/* TEST */
// FM.MessageMgr.getInstance()._testkaiser();
module.exports = FM.MessageMgr.getInstance();