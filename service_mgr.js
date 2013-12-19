/**
 * @fileoverview Implementation of serviceMgr
 */

var db = require('./db.js');
var async = require('async');

var customerServiceItemModel = db.getDocModel("customerServiceItem");
var memberModel = db.getDocModel("member");
var pushAllMessageModel = db.getDocModel("pushAllMessage");

/**
 * The manager who handles the customer service
 *
 * @mixin
 */
var serviceMgr = {};

/**
 * add new customer question to feltmeng db.<br>
 * <br>
 * @param {String} fb_id The ID of the FB.
 * 
 * @param {String} question The user have some question about our product.
 * 
 * @param {Function} cb The callback function called when the question add to DB.<br>
 *     The function signature is cb(err, status) :
 *     <ul>
 *     <li>status: A string specifying status which the question of the user is added to the DB 
 *             after adding.      
 *     <li>err: error message if any error happens
 *     </ul>
 */
serviceMgr.createCustomerServiceItem = function(vjson, cb ){

    var condition = { 'ownerId._id': vjson.ownerId._id };
    var customerServiceItemNO;
    customerServiceItemModel.count(condition, function(err, result){
        if(!err){
            customerServiceItemNO = result + 1;
            db.listOfdocModels( memberModel, {_id: vjson.ownerId._id}, null, null, function(err, result){
                if(!err){
                    newVjson = {
                            ownerId: {_id: vjson.ownerId._id},
                            genre: vjson.genre,
                            phoneVersion: vjson.phoneVersion,
                            question: vjson.question,
                            fb_userName: result[0].fb.userName,
                            fb_id: result[0].fb.userID,
                            no: customerServiceItemNO
                    };
                    db.createAdoc(customerServiceItemModel , newVjson, function(err,result){
                        cb(err, result); 
                    });
                }
                else cb(err, result); 
            });

        }else cb(err, result); 
    });
    

    
};

/**
 * update field to feltmeng db.<br>
 * <br>
 * @param {String} fb_id The ID of the FB.
 * 
 * @param {Number} no The no. whose question are to be added.
 * 
 * @param {Object} vjson DB field's value likes genre='account'.  
 * 
 * @param {Function} cb The callback function called when the value update to DB.<br>
 *     The function signature is cb(err, status) :
 *     <ul>
 *     <li>status: A string specifying status which the field is updated to the DB 
 *             after updating. 
 *     <li>err: error message if any error happens
 *     </ul>
 */
serviceMgr.updateCustomerServiceItem = function(_id, vjson, cb ){
    
    db.updateAdoc(customerServiceItemModel,_id, vjson, function(err, result){
        cb(err, result); 
    });
    
};

/**
 * get customer question and answer from feltmeng db.<br>
 * <br>
 * @param {String} fb_id The ID of the FB.
 * 
 * @param {Number} no The no. whose question are to be added.
 * 
 * @param {Function} cb The callback function called when get customer question from DB.<br>
 *     The function signature is cb(err, result) :
 *     <ul>
 *     <li>result:customer question and answser from DB
 *     <li>err: error message if any error happens
 *     </ul>
 */
serviceMgr.getCustomerServiceItem= function(condition, field, pageLimit, pageSkip, cb ){
    
  //TODO pagination
//    db.listOfdocModels( customerServiceItemModel, condition, field, {sort :'no', limit: pageLimit , skip: pageSkip}, function(err, result){
    db.listOfdocModels( customerServiceItemModel, condition, field, {sort :{'questionTime':-1}}, function(err, result){
        cb(err, result); 
    });
    
};

/**
 * get customer service list from feltmeng db.<br>
 * <br>
 * @param {String} fb_id The ID of the FB.(null will select all customer question)
 * 
 * @param {Function} cb The callback function called when get customer question list from DB.<br>
 *     The function signature is cb(err, result) :
 *     <ul>
 *     <li>result:customer service list from DB
 *     <li>err: error message if any error happens
 *     </ul>
 */
serviceMgr.getCustomerServiceList = function(fb_id, cb ){
    
};

//TODO admin and message count

serviceMgr.createPushAllMessage = function(vjson, cb ){
    db.createAdoc(pushAllMessageModel , vjson, function(err,result){
        console.log(result)
        cb(err, result); 
    });
};

serviceMgr.getPushAllMessage= function(condition, cb ){
    
    //TODO pagination
//      db.listOfdocModels( customerServiceItemModel, condition, field, {sort :'no', limit: pageLimit , skip: pageSkip}, function(err, result){
      db.listOfdocModels( pushAllMessageModel, condition,null,{sort :{'pushTime':-1}}, function(err, result){
          cb(err, result); 
      });
      
  };
  
serviceMgr.updatePushAllMessage = function(_id, vjson, cb ){
      
      db.updateAdoc(pushAllMessageModel,_id, vjson, function(err, result){
          cb(err, result); 
      });
      
  };


module.exports = serviceMgr;