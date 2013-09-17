var ugcSerialNoMgr = (function(){
    var uInstance = null;
    
    function constructor(){
        var db = require('./db.js');
        var ugcModel = db.getDocModel("ugc");
        var request = require("request");

        var ugcSerialNo = 0;

        return {
            //-- public services --
            init: function(cbOfInit) {
                
                ugcModel.findOne().sort({no: -1}).exec( function(err, doc) {
                    if (!err) {
                        ugcSerialNo =  doc.no;
                        cbOfInit(null);
                    }
                    else {
                        cbOfInit("Fail to get maximum no of UGC: "+ err);
                    }        
                });
            },

            getUgcSerialNo: function(cbOfGetUgcSerialNo) {
                ugcSerialNo++;
                if ( systemConfig.IS_STAND_ALONE ) {
                    cbOfGetUgcSerialNo(null, ugcSerialNo);
                }
                else {
                    request({
                        method: 'GET',
                        uri: systemConfig.HOST_STAR_COORDINATOR_URL + '/internal/ugc_serial_no',
                        json: true
                        
                    }, function(error, response, body){
                        
                        if (body) {
                            cbOfGetUgcSerialNo(null, body.ugcSerialNo);    
                        }
                        else {
                            cbOfGetUgcSerialNo("Failed to get ugcSerialNo from star_coordinator: "+error, null);  
                        }
                                
                    });

                }
            }
        };
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






module.exports = ugcSerialNoMgr.getInstance();