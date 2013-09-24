var FMDB = require('./db.js'),
    UGCDB = require('./ugc.js');
    
var FM = {};
var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info(str); } : function(str){} ;

FM.ADMIN = (function(){
    var uInstance = null;
    
    function constructor(){
        var admin = FMDB.getDocModel("admin");
        
        return {
        /*
         *  Public Members
         */
            isValid: function(condition, cb){
               
                var field = {"_id": 1, "role": 1};
                FMDB.getValueOf(admin, condition, field, cb);
            },
            
            /*
            addMember: function(data, cb){
                FMDB.createAdoc(admin, data, cb);
            },
            
            
            deleteMember: function(memberID){
                var field = "_id";
                FMDB.getValueOf(admin, {"memberID":memberID}, field, function(err, result){
                    if(err) throw err;
                    FMDB.deleteAdoc(admin, result[field]);
                    logger.info("deleteMember " + memberID + result[field]);
                });
            },
            
            updateMember: function(oid, newdata, cb){
                
                FMDB.updateAdoc(admin, oid, newdata, cb);
            },
            
            isFBValid: function(userID, cb){
                
                var field = { "_id":1, "fb": 1, "deviceToken":1 };
                FMDB.getValueOf(admin, {"fb.userID":userID}, field, cb);
            },
            
			getDeviceTokenById: function(oid, cb){
				var field = {"deviceToken": 1};
                FMDB.getValueOf(admin, {"_id":oid}, field, cb);
			},
			
            getFBAccessTokenByFBId: function(userID, cb){
            
                var field = {"fb.auth": 1};
                FMDB.getValueOf(admin, {"fb.userID":userID}, field, cb);
            },
            
            getFBAccessTokenById: function(oid, cb){
            
                var field = {"fb.userID":1, "fb.auth": 1, "fb.userName": 1};
                FMDB.getValueOf(admin, {"_id":oid}, field, cb);
            },
            
            listOfMembers: function(cb){
                admin.find(cb);
            },
            
            getObjectId: function(memberID, cb){
                var field = {"_id":1};
                FMDB.getValueOf(admin, {"memberID" : memberID}, field, cb);
            },
            
            getProfile: function(memberID, cb){
                FMDB.readAdoc(admin, {"memberID":memberID}, cb);
            },
            
            getProfileById: function(oid, cb){
                FMDB.readAdocById(admin, oid, cb);
            },
            
            getVideosOf: function(memberID, cb){
                var field = {"video_ids":1};
                FMDB.getValueOf(admin, {"memberID" : memberID}, field, cb);
            },
            
            getVideosByOID: function(oid, cb){
                videoDB.getVideoListById(oid, cb);
            }*/
        };
    } //    End of Constructor.
    
    return {
        getInstance: function(){
            if(!uInstance){
                uInstance = constructor();
            }
            return uInstance;
        }
    }; //   End of Return uInstance.
})(); // End of FM.ADMIN

module.exports = FM.ADMIN.getInstance();