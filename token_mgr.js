tokenMgr = {};

var defaultToken ='53768608';

tokenMgr.getToken = function(userID, cb){
    
    //TODO: build the authorization policy and generate token upon each policy
    //TODO: check member or admin db to get toekn of specific authorization 
    
    if (cb){
        cb(null, defaultToken);
    }
};

tokenMgr.checkToken = function(token, uri, cb){
    
    //TODO: build the authorization policy and check token upon each policy
    if (token==defaultToken){
        if (cb){
            cb(true);
        }
    }
    else {
        if (cb){
            cb(false);
        }
    }
};


module.exports = tokenMgr;