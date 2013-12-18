
exports.init = function() {

    /**
     * RESTful APIs for back-end administration of Miix services
     * @namespace miix_service
     */

    //miix_service

    /**
     * Get the questions of a specific member<br>
     * 
     * <h5>Path parameters</h5>
     * <ul>
     * <li>memberId: Member ID (_id with hex string)
     * </ul>
     * 
     * <h5>Query parameters</h5>
     * None
     * 
     * <h5>Request body</h5>
     * None
     * 
     * <h5>Response body</h5>
     * An array of objects containing the following members:
     * <ul>
     * <li>_id: member ID (_id of 24 character hex string)
     * <li>ugcReferenceNo: reference number for this UGC
     * <li>genre: string indicating the question genre. It is of one of the following values: "acount", "publish", or "sign_in"
     * <li>question: an object containing the following members:
     *     <ul>
     *     <li>description: the description of the question
     *     <li>date: its issue date (the number of milliseconds since midnight Jan 1, 1970)
     *     </ul>
     * <li>answer: an object containing the following members:
     *     <ul>
     *     <li>description: the description of the answer
     *     <li>date: its issue date (the number of milliseconds since midnight Jan 1, 1970)
     *     </ul>
     * </ul>
     * For example, <br>
     * [{_id: '51d837f6830459c42d000023', ugcReferenceNo: 234, genre: 'acount', question:{description:'我忘記了我FB帳號的密碼', date: 1371862000000}, answer:{description:'請至Facebook官網(www.facebook.com)新設定', date: 1371962000000} } <br>
     *  {_id: '51d837f6830459c42d000023', ugcReferenceNo: 256, genre: 'sign_in', question:{description:'我的帳號登不進去', date: 1371862000000}, answer:{description:'請確認您有出現faceboo授權頁面嗎', date: 1371892000000} }, <br>                 
     *  {_id: '51d837f6830459c42d000023', ugcReferenceNo: 314, genre: 'others', question:{description:'我無法通迥認證', date: 1471862000000}, answer:{description:'請確認您有收到認證簡訊', date: 1471962000000} }];                   
     *
     * @name GET /miix_service/:memberId/questions
     * @memberof miix_service
     */
    app.get('/miix_service/:member_id/questions', routes.authorizationHandler.checkAuth, routes.service.getCustomerServiceItems_get_cb);

    //== DEPRECATED ==
    app.get('/members/:member_id/questions', routes.authorizationHandler.checkAuth, function(req, res){
        console.log('[GET %s]', req.path);
        console.log('req.params.member_id=%s',req.params.member_id);
        console.log('req.route.path=%s',req.route.path);
        
        var result = [{_id: '51d837f6830459c42d000023', ugcReferenceNo: 234, genre: 'acount', question:{description:'我忘記了我FB帳號的密碼', date: 1371862000000}, answer:{description:'請至Facebook官網(www.facebook.com)新設定', date: 1371962000000} },
                      {_id: '51d837f6830459c42d000023', ugcReferenceNo: 256, genre: 'login', question:{description:'我的帳號登不進去', date: 1371862000000}, answer:{description:'請確認您有出現faceboo授權頁面嗎', date: 1371892000000} },
                      {_id: '51d837f6830459c42d000023', ugcReferenceNo: 314, genre: 'verification', question:{description:'我無法通迥認證', date: 1471862000000}, answer:{description:'請確認您有收到認證簡訊', date: 1471962000000} }];
        
        res.send(200, result);
    });

    /**
     * Create the questions of a specific member<br>
     * <h5>Path Parameters</h5>
     * <ul>
     * <li>memberId: Member ID (_id with hex string)
     * </ul>
     * <h5>Query Parameters</h5>
     * <ul>
     * <li>phoneVersion:
     * <li>question:
     * <li>genre:
     * </ul>
     * <h5>Request body</h5>
     * None
     * <h5>Response body</h5>
     * The callback function called when the result is created :
     *     <ul>
     *     <li>err: error message if any error happens
     *     <li>result: ok    
     *     </ul>
     *
     * @name POST /miix_service/:member_id/questions
     * @memberof miix_service
     */
    app.post('/miix_service/:member_id/questions', routes.service.createCustomerServiceItems_get_cb);

    //== DEPRECATED ==
    app.post('/members/:member_id/questions', function(req, res){
        
    });

    /**
     * Update the CustomerServiceItem field to Feltmeng DB<br>
     * <h5>Path Parameters</h5>
     * None
     * 
     * <h5>Query Parameters</h5>
     * None
     * 
     * <h5>Request body</h5>
     * <ul>
     * <li>_id: Customer service ID (_id with hex string)
     * <li>answer: The answer that admin response.
     * <li>vjson: The json that you want to update  CustomerServiceItem field.
     * </ul>
     * </ul>
     * For example, <br>
     * _id : '51ef918ac852e4a80800000c'<br>
     * answer : 'The problem will solve in next version'<br>
     * vjson :{<br>
     *         answerTime: new Date(),<br>
     *         reply: true<br>
     *        }; <br>
     * <h5>Response body</h5>
     * A message of status :
     * <ul>
     * <li>err: error message if any error happens
     * <li>success: ok
     * </ul>
     *
     * @name PUT /miix_service/questions
     * @memberof miix_service
     */
    app.put('/miix_service/questions', routes.service.updateCustomerServiceItems_get_cb);

    /**
     * Get the html of miix_service<br>
     * 
     * <h5>Path parameters</h5>
     * None
     * 
     * <h5>Query parameters</h5>
     * None
     * 
     * <h5>Request body</h5>
     * None
     * 
     * <h5>Response body</h5>
     * None
     *
     * @name GET /miix_service
     * @memberof miix_service
     */
    app.get('/miix_service', routes.service.get_cb);

    /**
     * Get the customer service item of a specific condition or field<br>
     * 
     * <h5>Path parameters</h5>
     * <ul>
     * <li>memberId: Member ID (_id with hex string)
     * </ul>
     * 
     * <h5>Query parameters</h5>
     * <ul>
     * <li>condition:The condition of customer question.(ex: fb_userName = "Kaiser")
     * <li>field: The field of customer question.(ex: fb_id, no, ownerId..etc)
     * <li>type: The type of jade. (table or list) The type default is message if type is null.
     * </ul>
     * 
     * <h5>Request body</h5>
     * None
     * 
     * <h5>Response body</h5>
     * 
     * <ul>
     * <li>err: Error message if any error happens
     * <li>result: A message of admin that response answer.
     *
     * @name GET /miix_service/customer_service_items
     * @memberof miix_service
     */
    app.get('/miix_service/customer_service_items', routes.service.getCustomerServiceItems_get_cb);
	
	app.post('/miix_service/message', routes.service.pushMessage_get_cb);
	
    app.get('/miix_service/get_push_all_message', routes.service.getPushAllMessage_get_cb);


};