/**
 * FeltMeng.com
 */

//var DOMAIN = "http://www.feltmeng.idv.tw/admin/",
//SDOMAIN = "https://www.feltmeng.idv.tw/admin/";
var DOMAIN = "/miix_admin/",
SDOMAIN = "/miix_admin/";

var FM = {};    

//var conditions = {};
var DEFAULT_DOOH = "taipeiarena";
var sessionId = null;
var originSequence = null;
var doohId = DEFAULT_DOOH;
var intervalOfSelectingUGC = null;
var intervalOfPlanningDoohProgrames = null;





//Main Page 
$(document).ready(function(){
    FM.memberList = new PageList( 'memberList', 8, '/miix_admin/members', null, null);
    FM.miixPlayList = new PageList( 'miixMovieList', 10, '/miix_admin/miix_movies', null, null);
    FM.storyPlayList = new PageList( 'storyMovieList', 8, '/miix_admin/story_movies', null, null);
    FM.UGCList = new PageList( 'ugcCensorMovieList', 10, '/miix_admin/ugc_censor', null, null); 
    FM.UGCPlayList = new PageList( 'ugcCensorPlayList', 10, '/miix_admin/doohs/'+DEFAULT_DOOH+'/timeslots', UGCPlayListSubPg.afterProgramListTableIsLoaded, null);
    FM.historyList = new PageList( 'historyList', 15, '/miix_admin/sessions/ ', null, null);
    FM.highlightList = new PageList( 'highlightList', 10, '/miix_admin/highlight', null, null);
	/*----------------------------- live check start  by Joy----------------------------------*/
    FM.live_check = new PageList( 'live_check',10,'/miix_admin/doohs/'+DEFAULT_DOOH+'/liveContent',null, liveCheckSubPg.loadLiveCheckTable ); 
    /*-----------------------------end live check----------------------------------*/
   
    $('#memberListBtn').click( memberListSubPg.loadPage );


    $('#miixPlayListBtn').click(function(){
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#miixPlayList').attr("class", "current");
        $('#contentExtra').html("").hide();

        FM.currentContent = FM.miixPlayList;
        FM.currentContent.showCurrentPageContent();
        $('#table-content-header').html('');
        /*
        FM.miixPlayList(0, 20, function(res){
            if(res.message){
                console.log("[Response of playList] message:" + res.message);
            }else{
                FM.currentContent = FM.miixPlayList;
                $('#table-content').html(res);
            }
        });
         */
    });

    $('#storyPlayListBtn').click(function(){
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#storyPlayList').attr("class", "current");
        $('#contentExtra').html("").hide();

        FM.currentContent = FM.storyPlayList;
        FM.currentContent.showCurrentPageContent();
        $('#table-content-header').html('');
        /*
        FM.storyPlayList(0, 20, function(res){
            if(res.message){
                console.log("[Response of playList] message:" + res.message);
            }else{
                FM.currentContent = FM.storyPlayList;
                $('#table-content').html(res);
            }
        });
         */
    });



    $('#UGCListBtn').click(function(){
        //conditions = {};
        $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#UGCList').attr("class", "current");
        $('#contentExtra').html("").hide();

        FM.currentContent = FM.UGCList;
        FM.currentContent.showCurrentPageContent();
        $('#table-content-header').html('');

        

    });
    
    
    
     $('#live_check').click(function(){
        //conditions = {};
        
        /*var table=$("<table>").attr({id:"hello",
                                     width:"100%"});
        var tbody=$("<tbody>");
        var tr=$("<tr>").attr({class:"alternate-row"});
        var td_1=$("<td>").html("1");
        var td_2=$("<td>").html("2");
        var td_3=$("<td>").html("3");
        
        table.append(tbody);
        tbody.append(tr);
        tr.append(td_1);
        tr.append(td_2);
        tr.append(td_3);
        
        //table.html("test");
        $('#table-content').html(table);*/
        
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#live_check').attr("class", "current");

        FM.currentContent = FM.live_check;
        FM.currentContent.showCurrentPageContent();
        $('#table-content-header').html('');
        $('#contentExtra').html("").hide();

    });
    

    $('#UGCPlayListBtn').click( UGCPlayListSubPg.loadInitialPage );

    $('#historyListBtn').click(function(){
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#historyList').attr("class", "current");
        $('#contentExtra').html("").hide();

        $.get('/miix_admin/table_censorHistoryList_head.html', function(res){
            $('#table-content-header').html(res);
            $('#table-content').html('');

            $('#createHistoryProgramListBtn').click(function(){
                var flag = 0;
                var inputSearchData = {};

                $('#condition-inner input[class="createHistoryProgramListBtn"]').each(function(i){

                    inputSearchData[$(this).attr("name")] = $(this).val();
                    if($(this).val() == "" && flag == 0){
                        alert('請輸入完整的條件!!\n時間格式為2013/08/01 00:00:00');
                        flag = 1; 
                    }else{
                        //conditions = inputSearchData;
                        FM.historyList.setConditions(inputSearchData);
                    }
                });
                FM.currentContent = FM.historyList;
                FM.currentContent.showCurrentPageContent();   

            });
        });

        FM.currentContent = FM.historyList;
        FM.currentContent.showCurrentPageContent();

    });
    
    $('#highlightListBtn').click(function(){
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#highlightList').attr("class", "current");
        $('#table-content').html('<br> <br>刊登名單準備中，請稍候....');

        $.get('/miix_admin/table_censorHighlightList_head.html', function(res){
            $('#table-content-header').html(res);
            //$('#table-content').html('');

            $('#searchHighlightListBtn').click(function(){
                var flag = 0;
                var inputSearchData = {};

                $('#condition-inner input[class="searchHighlightListBtn"]').each(function(i){

                    inputSearchData[$(this).attr("name")] = $(this).val();
                    if($(this).val() == "" && flag == 0){
                        alert('請輸入完整的條件!!\n時間格式為2013/08/01 00:00:00');
                        flag = 1; 
                    }else{
                        //conditions = inputSearchData;
                        FM.highlightList.setConditions(inputSearchData);
                        
                    }
                });
                $('#table-content').html('<br> <br>刊登名單準備中，請稍候....');
                FM.currentContent = FM.highlightList;
                FM.currentContent.showCurrentPageContent();   

            });
        });

        FM.currentContent = FM.highlightList;
        FM.currentContent.showCurrentPageContent();

    });
    
    $("#logoutBtn").click(function(){
        $.get(DOMAIN + "logout", function(res){
            delete localStorage.token;
            delete localStorage.role;
            location.reload();
        });
    });
    
  
    
    // Ajax ---------------------------------------------------------------------    
    $(document).ajaxComplete(function(event,request, settings) {

        var censorCheck = settings.url.substring(0,22);
        var playlistCheck = settings.url.substring(0,17);
        var historyCheck = settings.url.substring(0,20);
        var highlightCheck = settings.url.substring(0,21);
        var typeCheck = settings.type;
        var memberCheck = settings.url.substring(0,19);
        
        //== access control ==
        if ( localStorage.role == "SUPER_ADMINISTRATOR" ) {
            $('#createProgramListBtn').show();
            //$('#ugcCensor').show();
            $("input[id='ugcCensor']").show();
            $('#traceWindow').show();
        }
        else if ( (localStorage.role == "OPERATOR") || (localStorage.role == "FELTMENG_DEMO") ) {
            $('#createProgramListBtn').hide();
            $("input[id='ugcCensor']").hide();
            $("th[sensitive='true']").hide();
            $("td[sensitive='true']").hide();
            $("div[sensitive='true']").hide();
            $('#pushProgramsBtn').remove();
            $('#traceWindow').hide();
            $("[sensitive='true']").hide();
        }

        if(typeCheck == "GET"){
            /**
             * MemberList
             */
            if(memberCheck == '/miix_admin/members'){
                $('#member.ownerId').click(function(){
                    var member = $(this).attr("name").split(',');
                    var url = DOMAIN + "memberInfo/"+member[3];
                    var userID = member[1];
                    var app = member[2];
                    var memberId = member[0];
                    console.log(url+','+userID+','+app+','+memberId);
                    
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {userID: userID, app: app, memberId: memberId},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                                FM.currentContent = FM.memberList;
                                FM.currentContent.showCurrentPageContent();
                            }
                            
                        }
                    });
                    
                });
            }
            /**
             * UGCList
             */
            if(censorCheck == '/miix_admin/ugc_censor'){
                
                if (localStorage.role == "FELTMENG_DEMO") {
                    $('#ugcSearchMiixGenreRadioInput').click();
                }
                
                /**
                 * search by VIP  JOY
                 */
            
                $($('input:radio[name=searchByVIP]')).click(function(){
                    var inputSearchData = {};
                    $('input:radio[name=searchByVIP]:checked').each(function(){
                        inputSearchData = {'contentClass':$(this).val()};
                        conditions = inputSearchData;
                    });
                    if(inputSearchData != null){
                        $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                        FM.UGCList = new PageList( 'ugcCensorMovieList', 10, '/miix_admin/ugc_censor', null, null);
                        FM.UGCList.setConditions(conditions);
                        $('#main_menu ul[class="current"]').attr("class", "select");
                        $('#UGCList').attr("class", "current");
                        FM.currentContent = FM.UGCList;
                        FM.currentContent.showCurrentPageContent();
                    }
                });
                

				/**
                 * search by genre  JOY
                 */
			
				$($('input:radio[name=searchByGenre]')).click(function(){
					var inputSearchData = {};
                    $('input:radio[name=searchByGenre]:checked').each(function(){
                        inputSearchData = {'genre':$(this).val()};
                        conditions = inputSearchData;
                    });
                    if(inputSearchData != null){
                        $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                        FM.UGCList = new PageList( 'ugcCensorMovieList', 10, '/miix_admin/ugc_censor', null, null);
                        FM.UGCList.setConditions(conditions);
                        $('#main_menu ul[class="current"]').attr("class", "select");
                        $('#UGCList').attr("class", "current");
                        FM.currentContent = FM.UGCList;
                        FM.currentContent.showCurrentPageContent();
                    }
				});
				
				
                /**
                 * 查詢FB NAME BY    JOY
                 */
                var conditions;
                
                $('#ugcSearchFBBtn').click(function(){
                    $.get('/miix_admin/getIdByName', {token: localStorage.token,FBName: $('.ugcSearchFBBtn').val() },function(res) {
                        var inputSearchData = {};
                        $('#condition-inner input[class="ugcSearchFBBtn"]').each(function(){
                            inputSearchData = {'ownerId.userID':{ $in: res.nameToId}};
                            conditions = inputSearchData;
                        });
                        if(inputSearchData != null){
                            $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                            FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor', null, null);
                            FM.UGCList.setConditions(conditions);
                            $('#main_menu ul[class="current"]').attr("class", "select");
                            $('#UGCList').attr("class", "current");
                            FM.currentContent = FM.UGCList;
                            FM.currentContent.showCurrentPageContent();
                        }
                        console.log(res);
                    });
                });
                
                /**
                 * 查詢影片 click
                 */
                
                $('#ugcSearchBtn').click(function(){
                    var inputSearchData = {};
                    $('#condition-inner input[class="ugcSearchBtn"]').each(function(){
                        inputSearchData = {'no':$(this).val()};
                        conditions = inputSearchData;
                    });
                    if(inputSearchData != null){
                        $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                        FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor', null, null);
                        FM.UGCList.setConditions(conditions);
                        $('#main_menu ul[class="current"]').attr("class", "select");
                        $('#UGCList').attr("class", "current");
                        FM.currentContent = FM.UGCList;
                        FM.currentContent.showCurrentPageContent();
                    }
                });
                /**
                 * 尚未審核 click
                 */
                $('#ugcSearchNoRatingBtn').click(function(){
                    conditions = 'norating';
                    if(conditions != null){
                        $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                        FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor', null, null);
                        FM.UGCList.setConditions(conditions);
                        $('#main_menu ul[class="current"]').attr("class", "select");
                        $('#UGCList').attr("class", "current");
                        FM.currentContent = FM.UGCList;
                        FM.currentContent.showCurrentPageContent();
                    }
                });
                /**
                 * 已經審核 click
                 */
                $('#ugcSearchRatingBtn').click(function(){
                    conditions = 'rating';
                    if(conditions != null){
                        $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                        FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor', null, null);
                        FM.UGCList.setConditions(conditions);
                        $('#main_menu ul[class="current"]').attr("class", "select");
                        $('#UGCList').attr("class", "current");
                        FM.currentContent = FM.UGCList;
                        FM.currentContent.showCurrentPageContent();
                    }
                });
                /**
                 * All click
                 */
                $('#ugcSearchAllBtn').click(function(){
                    $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                    conditions = {};
                    FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor', null, null);
                    FM.UGCList.setConditions(conditions);
                    $('#main_menu ul[class="current"]').attr("class", "select");
                    $('#UGCList').attr("class", "current");
                    FM.currentContent = FM.UGCList;
                    FM.currentContent.showCurrentPageContent();
    
                });
                /**
                 * 投件時間 送出 click
                 */
                $('#ugcSearchDateBtn').click(function(){
                    var inputSearchData = {};
                    var flag = 0;
                    
                    $('#condition-inner input[class="ugcSearchDateBtn"]').each(function(){                 
                        inputSearchData[$(this).attr("name")] = $(this).val();
                        if($(this).val() == "" && flag == 0){
                            alert('請輸入完整的時間!!');
                            flag = 1; 
                        }
                        conditions = inputSearchData;
                    });
                    if(conditions != null){
                        $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                        FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor', null, null);
                        FM.UGCList.setConditions(conditions);
                        $('#main_menu ul[class="current"]').attr("class", "select");
                        $('#UGCList').attr("class", "current");
                        FM.currentContent = FM.UGCList;
                        FM.currentContent.showCurrentPageContent();
                    }
                });
    
                /**
                 * checkbox
                 */
                $('#ugcCensor.ugcCensorNoa').click(function(){
                    var url = DOMAIN + "user_content_attribute";
                    var no = $(this).attr("name");
                    var rating ='A';
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{rating: rating}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
                $('#ugcCensor.ugcCensorNob').click(function(){
                    var url = DOMAIN + "user_content_attribute";
                    var no = $(this).attr("name");
                    var rating ='B';
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{rating: rating}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
                $('#ugcCensor.ugcCensorNoc').click(function(){
                    var url = DOMAIN + "user_content_attribute";
                    var no = $(this).attr("name");
                    var rating ='C';
    
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{rating: rating}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
                $('#ugcCensor.ugcCensorNod').click(function(){
                    var url = DOMAIN + "user_content_attribute";            
                    var no = $(this).attr("name");
                    var rating ='D';
    
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{rating: rating}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
                $('#ugcCensor.ugcCensorNoe').click(function(){
                    var url = DOMAIN + "user_content_attribute";
                    var no = $(this).attr("name");
                    var rating ='E';
    
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{rating: rating}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
                $('#ugcCensor.ugcCensorNof').click(function(){
                    var url = DOMAIN + "user_content_attribute";
                    var no = $(this).attr("name");
                    var rating ='F';
    
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{rating: rating}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
                $('#ugcCensor.ugcCensorNoMP').click(function(){
    
                    var url = DOMAIN + "user_content_attribute";
                    var no = $(this).attr("name");
                    var mustPlay = null;
                    if($(this).val() == 'true')
                        mustPlay = false;
                    if($(this).val() == 'false')
                        mustPlay = true;
    
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{mustPlay: mustPlay}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
                
                $('#ugcCensor.ugcCensorMRT').click(function(){
                    
                    var url = DOMAIN + "user_content_attribute";
                    var no = $(this).attr("name");
                    var forMRTReview = null;
                    
                    if($(this).val() == 'true'){
                        forMRTReview = false;
                        console.log(forMRTReview);
                    }
                    if($(this).val() == 'false'){
                        forMRTReview = true; 
                        console.log(forMRTReview);
                    }
    
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{forMRTReview: forMRTReview}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
                
                /**
                 * generate video UGC btn
                 */
                $(".ugcGenVideoUgcBtn").click(function(){
                    //alert($(this).attr('projectId'));
                    $.ajax({
                        url: '/miix_admin/video_ugcs/'+$(this).attr('projectId'),
                        type: 'PUT',
                        data: {token: localStorage.token},
                        timeout: 30*60*1000, //30 min
                        success: function(response) {
                            if(response.message){
                                console.log("Successfully inform server to generate video UGC: " + response.message);
                            }
                        },
                        error: function(jqXHR, textStatus, errorThrown ) {
                            console.log("Failed to inform server to generate video UGC: " + errorThrown);
                            if (jqXHR.response) {
                                var errMessage = JSON.parse(jqXHR.response).error;
                                if (errMessage) {
                                    console.log(errMessage);
                                }
                            }
                        }
                    });
                    
                    $("#miixVideoStateDiv_"+$(this).attr('rowIndex')).html("<label>正在產生拉洋片...</label>");
                    //$(this).hide();
                });
    
            }// End of UGCList
    
            /**
             * PlayList
             */
    
            if(playlistCheck == '/miix_admin/doohs'){
                
    
            }// End of PlayList
            
            /**
             * HistoryList
             */
            if(historyCheck == '/miix_admin/sessions'){
                $('#history._idSetBtn').click(function(){
                    sessionItemInfo = $(this).attr("name");
                    sessionItemInfoArray = sessionItemInfo.split(',');
    
                    $.get('/miix_admin/table_censorPlayList_head.html', function(res){
                        
                        sessionId = sessionItemInfoArray[0];

                        console.log("sessionId = "+sessionId);
                        
                        $('#table-content-header').html(res);
                        $('#timeStartText').val( sessionItemInfoArray[1]);
                        $('#timeEndText').val( sessionItemInfoArray[2]);
                        $('#playTimeStartText').val( sessionItemInfoArray[3]);
                        $('#playTimeEndText').val( sessionItemInfoArray[4]);
                        $('#sequenceText').val( sessionItemInfoArray[5]);
    
                        $('#main_menu ul[class="current"]').attr("class", "select");
                        $('#UGCPlayList').attr("class", "current");
                         
                        $('#table-content').html('<br> <br>播放清單準備中，請稍候....');
                        FM.currentContent = FM.UGCPlayList;
                        FM.currentContent.setExtraParameters({sessionId: sessionItemInfoArray[0]});
                        FM.currentContent.showCurrentPageContent();
                        programSequenceArr =[];
    
                    });
                });
            }// End of HistoryList 
            
            /**
             * HighlightList
             */
            if(highlightCheck == '/miix_admin/highlight'){
                $('#ugcCensor.ugcCensorNoHL').click(function(){
    
                    var url = DOMAIN + "user_content_attribute";
                    var no = $(this).attr("name");
                    var mustPlay = null;
                    if($(this).val() == 'true')
                        highlight = false;
                    if($(this).val() == 'false')
                        highlight = true;
    
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: {no: no, vjson:{highlight: highlight}},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                            }
                        }
                    });
                });
            }// End of HighlightList
        }// End of typeCheck
    });
    // Ajax End---------------------------------------------------------------------

    $('#goToNextPage').click(function(){
        FM.currentContent.showNextPageContent();
    });

    $('#goToPreviousPage').click(function(){
        FM.currentContent.showPreviousPageContent();
    });

    $('#goToFirstPage').click(function(){
        FM.currentContent.showFirstPageContent();
    });

    $('#goToLastPage').click(function(){
        FM.currentContent.showLastPageContent();
    });

    $('#pageNoInput').change(function(){
        var pageNo = parseInt($("#pageNoInput").val());
        if (pageNo){
            if ( pageNo < 1) {
                pageNo = 1;
            }
            else if ( pageNo > FM.currentContent.totalPageNumber ){
                pageNo = FM.currentContent.totalPageNumber;
            }
            FM.currentContent.showPageContent(pageNo);
            FM.currentContent.currentPage=pageNo;
            $("#pageNoInput").val(pageNo);
        }
        else{
            $("#pageNoInput").val( FM.currentContent.currentPage);
        }
    });
    
    var altIsDown = false;
    
    
    $(document.activeElement).keyup(function( event ) {
        //console.log("keyup event.which="+event.which);
        if ( event.which == 17 ) {  //ctrl key
            altIsDown = false;
        }
        else if ( altIsDown && (event.which == 33) ) {
            //console.log('ctrl+pageUp pressed!');
            FM.currentContent.showPreviousPageContent();
        }

        else if ( altIsDown && (event.which == 34) ) {
            //console.log('ctrl+pageDown pressed!');
            FM.currentContent.showNextPageContent();
        }
    });

    $(document.activeElement).keydown(function( event ) {
        //console.log("keydown event.which="+event.which);
        if ( event.which == 18 ) {  //alt key
            altIsDown = true;
        }
    });



    $('input#rowsPerPage').change(function(){
        var rowsPerPage = parseInt($('input#rowsPerPage').val());
        if (rowsPerPage){
            if ( rowsPerPage < 1) {
                rowsPerPage = 1;
            }
            FM.currentContent.setRowsPerPage(rowsPerPage);
        }
        else{
            $('input#rowsPerPage').val( FM.currentContent.rowsPerPage);
        }
    });


    //== access control ==
    if ( localStorage.role == "SUPER_ADMINISTRATOR" ) {
        $("[id^='memberList']").show();
        $("[id^='miixPlayList']").show();
        $("[id^='storyPlayList']").show();
        $("[id^='UGCList']").show();
        $("[id^='highlightList']").show();
        $("[id^='live_check']").show();
        FM.currentContent = FM.memberList;
        $('#memberListBtn').click();
    } 
    else if ( localStorage.role == "FELTMENG_ADMINISTRATOR" ) {
        $("[id^='memberList']").show();
        $("[id^='miixPlayList']").hide();
        $("[id^='storyPlayList']").hide();
        $("[id^='UGCList']").show();
        $("[id^='highlightList']").show();
        $("[id^='live_check']").show();
        FM.currentContent = FM.memberList;
        $('#memberListBtn').click();
    }
    else if ( localStorage.role == "FELTMENG_DEMO" ) {
        $("[id^='memberList']").show();
        $("[id^='miixPlayList']").hide();
        $("[id^='storyPlayList']").hide();
        $("[id^='UGCList']").show();
        $("[id^='UGCPlayList']").hide();
        $("[id^='historyList']").hide();
        $("[id^='highlightList']").hide();
        $("[id^='live_check']").hide();
        $("[sensitive='true']").hide();
        FM.currentContent = FM.memberList;
        $('#memberListBtn').click();
    }
    else if ( localStorage.role == "OPERATOR" ) {
        $("[id^='memberList']").hide();
        $("[id^='miixPlayList']").hide();
        $("[id^='storyPlayList']").hide();
        $("[id^='UGCList']").hide();
        $("[id^='highlightList']").hide();
        $("[id^='live_check']").hide();
        FM.currentContent = FM.historyList;
        $('#historyListBtn').click();
    }
    

});


//== trace window ==
$(document).ready(function () {
    
    $("#cleanTraceBtn").hide();
    
    //Listen to the command from star_admin_server
    connectionMgr.connectToMainServer( function( commandID, resDataBody ){
        
        if (resDataBody.command == "SHOW_TRACE") {
            
            $("#traceWindow").prepend("<p>"+resDataBody.parameters.trace+"</p>");
            if ( $("#traceWindow").html().length > 0){
                $("#cleanTraceBtn").show();
            }
            
            var answerObj = {
                    err: null
                };
            connectionMgr.answerMainServer(commandID, answerObj);
        }   
    });

    
    $("#cleanTraceBtn").click(function () {
        $("#traceWindow").html('');
        $("#cleanTraceBtn").hide();
    });
});



/*
FM.memberList = function(pageToGo, rowsPerPage, cb){
    var url = DOMAIN + "member_list";
    $.get(url, {skip: (pageToGo-1)*rowsPerPage, limit: rowsPerPage}, cb);
};


FM.miixPlayList = function(pageToGo, rowsPerPage, cb){
    var url = DOMAIN + "miix_play_list";
    $.get(url, {skip: (pageToGo-1)*rowsPerPage, limit: rowsPerPage}, cb);
};

FM.storyPlayList = function(pageToGo, rowsPerPage, cb){
    var url = DOMAIN + "story_play_list";
    $.get(url, {skip: (pageToGo-1)*rowsPerPage, limit: rowsPerPage}, cb);
};
 */


//1 - START DROPDOWN SLIDER SCRIPTS ------------------------------------------------------------------------

$(document).ready(function () {
    $(".showhide-account").click(function () {
        $(".account-content").slideToggle("fast");
        $(this).toggleClass("active");
        return false;
    });
});

$(document).ready(function () {
    $(".action-slider").click(function () {
        $("#actions-box-slider").slideToggle("fast");
        $(this).toggleClass("activated");
        return false;
    });
});

//END ----------------------------- 1

//2 - START LOGIN PAGE SHOW HIDE BETWEEN LOGIN AND FORGOT PASSWORD BOXES--------------------------------------

$(document).ready(function () {
    $(".forgot-pwd").click(function () {
        $("#loginbox").hide();
        $("#forgotbox").show();
        return false;
    });

});

$(document).ready(function () {
    $(".back-login").click(function () {
        $("#loginbox").show();
        $("#forgotbox").hide();
        return false;
    });
});

//END ----------------------------- 2



//3 - MESSAGE BOX FADING SCRIPTS ---------------------------------------------------------------------

$(document).ready(function() {
    $(".close-yellow").click(function () {
        $("#message-yellow").fadeOut("slow");
    });
    $(".close-red").click(function () {
        $("#message-red").fadeOut("slow");
    });
    $(".close-blue").click(function () {
        $("#message-blue").fadeOut("slow");
    });
    $(".close-green").click(function () {
        $("#message-green").fadeOut("slow");
    });
});

//END ----------------------------- 3



//4 - CLOSE OPEN SLIDERS BY CLICKING ELSEWHERE ON PAGE -------------------------------------------------------------------------

$(document).bind("click", function (e) {
    if (e.target.id != $(".showhide-account").attr("class")) $(".account-content").slideUp();
});

$(document).bind("click", function (e) {
    if (e.target.id != $(".action-slider").attr("class")) $("#actions-box-slider").slideUp();
});
//END ----------------------------- 4



//5 - TABLE ROW BACKGROUND COLOR CHANGES ON ROLLOVER -----------------------------------------------------------------------
/*
$(document).ready(function () {
    $('#product-table   tr').hover(function () {
        $(this).addClass('activity-blue');
    },
    function () {
        $(this).removeClass('activity-blue');
    });
});
 */
//END -----------------------------  5



//6 - DYNAMIC YEAR STAMP FOR FOOTER -----------------------------------------------------------------------

$('#spanYear').html(new Date().getFullYear()); 

//END -----------------------------  6 

