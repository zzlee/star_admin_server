
exports.init = function() {

    /**
     * RESTful APIs for back-end administration of Miix services
     * @namespace miix_admin
     */

    app.get('/miix_admin', routes.admin.get_cb); 
    app.get('/miix_admin/login', routes.admin.login_get_cb); //TODO: change to a better resource name of RESTful style
    app.get('/miix_admin/logout', routes.admin.logout_get_cb); //TODO: change to a better resource name of RESTful style
    app.get('/miix_admin/members', routes.authorizationHandler.checkAuth, routes.admin.memberList_get_cb);
    app.get('/miix_admin/member_total_counts', routes.authorizationHandler.checkAuth, routes.admin.member_total_counts_get_cb);
    app.get('/miix_admin/miix_movies', routes.authorizationHandler.checkAuth, routes.admin.miixPlayList_get_cb); 
    app.get('/miix_admin/story_movies', routes.authorizationHandler.checkAuth, routes.admin.storyPlayList_get_cb);
    app.get('/miix_admin/list_size', routes.authorizationHandler.checkAuth, routes.admin.listSize_get_cb);
    app.get('/miix_admin/ugc_censor', routes.authorizationHandler.checkAuth, routes.censorHandler.getUGCList_get_cb); //審查名單

    app.get('/miix_admin/user_content_items', routes.censorHandler.getUGCList_get_cb);
    app.put('/miix_admin/user_content_attribute', routes.censorHandler.setUGCAttribute_get_cb);


    /**
     * Get the UGC list<br>
     * <h5>Path Parameters</h5>
     * None
     * <h5>Query Parameters</h5>
     * <ul>
     * <li>skip: The number decide that first query.
     * <li>limit: The number decide that limit of query.
     * <li>token: authorization.
     * <li>condition: The json decide that query codition.
     * </ul>
     * <h5>Request body</h5>
     * None
     * <h5>Response body</h5>
     * An array of objects containing the following members:
     * <ul>
     * <li>_id: UGC ID with 24 byte hex string
     * <li>userPhotoUrl: 
     * <li>ugcCensorNo: 
     * <li>userContent: 
     * <li>fb_userName: 
     * <li>fbPictureUrl: 
     * <li>title: 
     * <li>doohPlayedTimes: 
     * <li>rating: 
     * <li>genre: 
     * <li>contentGenre:
     * <li>mustPlay: 
     * </ul>
     * For example, <br>
     * [{_id: '51d837f6830459c42d000023',
     * "userPhotoUrl":["/contents/user_project/greeting-50c99d81064d2b841200000a-20130227T033827565Z/user_data/_cdv_photo_012.jpg"],
     * "ugcCensorNo":1,
     * "fb_userName":"No User",
     * "fbPictureUrl":"http://profile.ak.fbcdn.net/hprofile-ak-frc1/371959_100004619173955_82185728_q.jpg",
     * "doohPlayedTimes":0,
     * "rating":"d",
     * "genre":"miix",
     * "contentGenre":"miit_it"
     * "mustPlay":true}] <br>
     *
     * @name GET /miix_admin/user_content_items
     * @memberof miix_admin
     */
    app.get('/miix_admin/user_content_items', routes.censorHandler.getUGCList_get_cb);

    /**
     * Update the UGC field to Feltmeng DB<br>
     * <h5>Path Parameters</h5>
     * <ul>
     * <li>ugcId: UGC ID (_id with hexstring)
     * </ul>
     * <h5>Query Parameters</h5>
     * None
     * <h5>Request body</h5>
     * <ul>
     * <li>vjson: The json that you want to update  UGC field.
     * </ul>
     * </ul>
     * For example, <br>
     * [{ rating: 'a' }] <br>
     * <h5>Response body</h5>
     * A message of status :
     * <ul>
     * <li>err: error message if any error happens
     * <li>success: success
     * </ul>
     *
     * @name PUT /miix_admin/user_content_attribute/:ugcId
     * @memberof miix_admin
     */
    app.put('/miix_admin/user_content_attribute', routes.censorHandler.setUGCAttribute_get_cb);//TODO::ugcId
    //app.put('/miix_admin/user_content_attribute/:ugcId', routes.censorHandler.setUGCAttribute_get_cb);

    /**
     * New a session of programe timeslots for dooh<br>
     * <h5>Path Parameters</h5>
     * <ul>
     * <li>doohId: Dooh ID (ex:'taipeiarena')
     * </ul>
     * <h5>Query Parameters</h5>
     * <ul>
     * <li>intervalOfSelectingUGC: An object specifying the starting and ending of of the time interval for scheduleMgr to select the applied UGC items.
     * <li>intervalOfPlanningDoohProgrames: An object specifying the starting and ending of of the time interval which the generated schedule covers.
     * <li>programSequence: An array of strings showing the sequence of program content genres.
     * </ul>
     * <h5>Request body</h5>
     * None
     * <h5>Response body</h5>
     * The callback function called when the result program list is created :
     *     <ul>
     *     <li>err: error message if any error happens
     *     <li>result: object containing the following information:
     *         <ul>
     *         <li>numberOfProgramTimeSlots: number of program time slots created. 
     *         <li>sessionId: id indicating this session of creating program time slots (This will be used when   
     *         calling scheduleMgr.removeUgcfromProgramAndAutoSetNewOne()
     *         </ul>
     *         For example, <br>
     *         { numberOfProgramTimeSlots: 33, sessionId: '1367596800000-1367683140000-1373332978201' }     
     *     </ul>
     *
     * @name POST /miix_admin/doohs/:doohId/program_timeslot_session
     * @memberof miix_admin
     */
    app.post('/miix_admin/doohs/:doohId/program_timeslot_session', routes.censorHandler.postProgramTimeSlotSession_cb);

    /**
     * Get the dooh timeslot<br>
     * <h5>Path Parameters</h5>
     * <ul>
     * <li>doohId: Dooh ID (ex:'taipeiarena')
     * </ul>
     * <h5>Query Parameters</h5>
     * <ul>
     * <li>skip: The number decide that first query.
     * <li>limit: The number decide that limit of query.
     * <li>token: authorization.
     * <li>condition: The json decide that query codition.
     * </ul>
     * <h5>Request body</h5>
     * None
     * <h5>Response body</h5>
     * An array of objects containing the following members:
     * <ul>
     * <li>_id: Program timeslot ID with 24 byte hex string.
     * <li>timeSlot: An object specifying the starting and ending time of program's time slot.
     * <li>ugc_id: UGC ID with 24 byte hex string.
     * <li>userPhotoUrl: 
     * <li>ugcCensorNo:
     * <li>userContent: 
     * <li>fb_userName: 
     * <li>fbPictureUrl:  
     * <li>rating: 
     * <li>genre: 
     * <li>contentGenre:
     * </ul>
     * For example, <br>
     * [{_id: '51d837f6830459c42d000023',
     * "timeSlot":[start:1371861000000, end :1371862000000],
     * "ugc_id":'51d837f6830459c42d000023',
     * "userPhotoUrl":["/contents/user_project/greeting-50c99d81064d2b841200000a-20130227T033827565Z/user_data/_cdv_photo_012.jpg"],
     * "ugcCensorNo":1,
     * "fb_userName":"No User",
     * "fbPictureUrl":"http://profile.ak.fbcdn.net/hprofile-ak-frc1/371959_100004619173955_82185728_q.jpg",
     * "rating":"d",
     * "genre":"miix"}
     * "contentGenre":"miix_it"] <br>
     *
     * @name GET /miix_admin/doohs/:doohId/timeslots
     * @memberof miix_admin
     */
    app.get('/miix_admin/doohs/:doohId/timeslots', routes.censorHandler.gettimeslots_get_cb);

    /**
     * Update the ProgramTimeSlot field to Feltmeng DB<br>
     * <h5>Path Parameters</h5>
     * <ul>
     * <li>timeslotId: ProgramTimeSlot ID (_id with hexstring)
     * <li>doohId: Dooh ID (ex:'taipeiarena')
     * </ul>
     * <h5>Query Parameters</h5>
     * None
     * <h5>Request body</h5>
     * <ul>
     * <li>sessionId: The id indicating the session of creating program time slot.
     * <li>programTimeSlot: The ID of the program time slot item.
     * </ul>
     * <h5>Response body</h5>
     * an object of newly Selected Ugc or err message:
     * <ul>
     * <li>err: error message if any error happens
     * <li>newlySelectedUgc:  the id of newly selected UGC 
     * </ul>
     *
     * @name PUT /miix_admin/doohs/:doohId/timeslots/:sessionId
     * @memberof miix_admin
     */
    app.put('/miix_admin/doohs/:doohId/timeslots/:sessionId', routes.censorHandler.updatetimeslots_get_cb);

    //TODO: pushProgramsTo3rdPartyContentMgr RESTful
    /**
     *  Push programs (of a specific session) to the 3rd-party content manager.<br>
     * <h5>Path Parameters</h5>
     * <ul>
     * <li>doohId: Dooh ID (ex:'taipeiarena')
     * </ul>
     * <h5>Query Parameters</h5>
     * None
     * <h5>Request body</h5>
     * <ul>
     * <li>sessionId: The id indicating the session of creating program time slot.
     * </ul>
     * <h5>Response body</h5>
     * if successful, err returns null; if failed, err returns the error message.
     * <ul>
     * <li>err: error message if any error happens
     * <li>result: null 
     * </ul>
     *
     * @name PUT /miix_admin/doohs/:doohId/ProgramsTo3rdPartyContent
     * @memberof miix_admin
     */
    app.put('/miix_admin/doohs/:doohId/ProgramsTo3rdPartyContentMgr/:sessionId', routes.censorHandler.pushProgramsTo3rdPartyContentMgr_get_cb);

    /**
     * Get a list of session items<br>
     * <h5>Path parameters</h5>
     * <ul>
     * <li>sessionId: The id indicating the session of creating program time slot.
     * </ul>
     * 
     * <h5>Query parameters</h5>
     * <ul>
     * <li>skip: The number decide that first query.
     * <li>limit: The number decide that limit of query.
     * <li>token: authorization.
     * <li>condition: The json decide that query codition.
     * </ul>
     * 
     * <h5>Request body</h5>
     * An array of objects containing the following members:
     * <ul>
     * <li>_id: session ID with 24 byte hex string
     * <li>dooh: 
     * <li>sessionId: 
     * <li>intervalOfSelectingUGC: 
     * <li>intervalOfPlanningDoohProgrames: 
     * <li>programSequence: 
     * <li>pushProgramsTime: 
     * </ul>
     * 
     * <h5>Response body</h5>
     * @name GET /miix_admin/sessions/:sessionId
     * @memberof miix_admin
     */
    app.get('/miix_admin/sessions/:sessionId', routes.censorHandler.getSessionList_get_cb);

    /**
     * Get the UGC list for highlight<br>
     * <h5>Path Parameters</h5>
     * None
     * <h5>Query Parameters</h5>
     * <ul>
     * <li>skip: The number decide that first query.
     * <li>limit: The number decide that limit of query.
     * <li>token: authorization.
     * <li>condition: The json decide that query codition.
     * </ul>
     * <h5>Request body</h5>
     * None
     * <h5>Response body</h5>
     * An array of objects containing the following members:
     * <ul>
     * <li>_id: UGC ID with 24 byte hex string
     * <li>userPhotoUrl: 
     * <li>ugcCensorNo: 
     * <li>userContent: 
     * <li>fb_userName: 
     * <li>fbPictureUrl: 
     * <li>title: 
     * <li>doohPlayedTimes: 
     * <li>rating: 
     * <li>genre: 
     * <li>contentGenre:
     * <li>mustPlay: 
     * </ul>
     * For example, <br>
     * [{_id: '51d837f6830459c42d000023',
     * "userPhotoUrl":["/contents/user_project/greeting-50c99d81064d2b841200000a-20130227T033827565Z/user_data/_cdv_photo_012.jpg"],
     * "ugcCensorNo":1,
     * "fb_userName":"No User",
     * "fbPictureUrl":"http://profile.ak.fbcdn.net/hprofile-ak-frc1/371959_100004619173955_82185728_q.jpg",
     * "doohPlayedTimes":0,
     * "rating":"d",
     * "genre":"miix",
     * "contentGenre":"miit_it"
     * "mustPlay":true}] <br>
     *
     * @name GET /miix_admin/user_content_items
     * @memberof miix_admin
     */
    app.get('/miix_admin/highlight', routes.censorHandler.getHighlightUGCList_get_cb);
    
    app.get('/miix_admin/doohs/:doohId/liveContent', routes.censorHandler.getLiveContentList_get_cb);
//    app.get('/miix_admin/dooh/:doohId/liveContent', function(req, res){
//        var liveContentList =[{
//            liveContent: [{
//                           liveContentNo: 50,
//                           liveTime: 1379888568199,
//                           url: 'https://s3.amazonaws.com/miix_content/user_project/cultural_and_creative-51d38ca086fa21440a000002-1379888400000-005/cultural_and_creative-51d38ca086fa21440a000002-1379888400000-005.jpg'},
//                          {
//                           liveContentNo: 51,
//                           liveTime: 1379888568199,
//                           url: 'https://s3.amazonaws.com/miix_content/user_project/cultural_and_creative-51d38ca086fa21440a000002-1379888400000-005/cultural_and_creative-51d38ca086fa21440a000002-1379888400000-005.jpg'}
//                         ],
//           start: 1379512800000, 
//           end: 1379513400000,
//           no: 1999,
//        },
//        {
//            liveContent: [{
//                           liveContentNo: 52,
//                           liveTime: 1379888568199,
//                           url: 'https://s3.amazonaws.com/miix_content/user_project/cultural_and_creative-51d38ca086fa21440a000002-1379888400000-005/cultural_and_creative-51d38ca086fa21440a000002-1379888400000-005.jpg'},
//                          {
//                           liveContentNo: 53,
//                           liveTime: 1379888568199,
//                           url: 'https://s3.amazonaws.com/miix_content/user_project/cultural_and_creative-51d38ca086fa21440a000002-1379888400000-005/cultural_and_creative-51d38ca086fa21440a000002-1379888400000-005.jpg'}
//                         ],
//           start: 1379512800000, 
//           end: 1379513400000,
//           no: 2000,
//        }
//        ];
//        res.send(200, liveContentList)
//    });
    
    app.put('/miix_admin/doohs/:doohId/liveContent', routes.censorHandler.updateLiveContents_get_cb);
    
    app.post('/miix_admin/fbItem/:memberId', routes.censorHandler.postMessageAndPicture_get_cb);
    
    app.put('/miix_admin/doohs/:doohId/programTimeSlot', routes.censorHandler.updateProgramTimeSlot_get_cb);
    
    app.put('/miix_admin/video_ugcs/:projectId', routes.censorHandler.generateVideoUgc);
    
    app.get('/miix_admin/doohs/:doohId/programTimeSlot', routes.censorHandler.getProgramTimeSlot_get_cb);
};