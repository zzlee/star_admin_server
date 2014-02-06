var UGCPlayListSubPg = {
        
    loadInitialPage: function(){
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#UGCPlayList').attr("class", "current");
        $('#contentExtra').html("").hide();
        
        $.get('/miix_admin/table_censorPlayList_head.html', function(res){
            $('#table-content-header').html(res);
            $('#table-content').html('');
            $('#divPlayWithInterruptMode').hide();
            
            $('#createProgramListBtn').click( UGCPlayListSubPg.checkProgramList );
            
            
            $('#checkboxIsContinuousProgramMode').click(function() {
                if ( $("#checkboxIsContinuousProgramMode").is(":checked") ) {
                    $('#divPlayWithInterruptMode').show();
                }
                else {
                    $('#divPlayWithInterruptMode').hide();
                }
            });
                
            
            

        });

    },
    
    checkProgramList: function() {
        console.log("checkProgramList");
        var flag = 0;
        var inputSearchData = {};
        var url = DOMAIN + "doohs/"+DEFAULT_DOOH+"/programTimeSlot";
        
        $('#condition-inner input[class="createProgramListBtn"]').each(function(i){

            inputSearchData[$(this).attr("name")] = $(this).val();
            
            if($(this).val() == "" && flag == 0){
                alert('請輸入完整的條件!!\n時間格式為2013/08/01 00:00:00\n順序請填入類別字首(合成影片填入"合",心情填入"心",etc)\nex:2013/08/01 00:00:00,合心打打文國');
                flag = 1; 
            }
            console.log(inputSearchData);
            
            if(inputSearchData.timeStart && inputSearchData.timeEnd && inputSearchData.playTimeStart && inputSearchData.playTimeEnd && inputSearchData.ugcSequenceText){
                
                var playMode;
                if ( $("#checkboxPlayWithInterruptMode").is(":checked") ) {
                    playMode = "interrupt";
                }
                else {
                    playMode = "periodic";
                }
                
                var checkDate = null;
                if (playMode !== 'interrupt') {
                    checkDate = new Date().getTime() + 30*60*1000;
                }
                else {
                    checkDate = new Date().getTime();
                }

                var playTimeStart = new Date(inputSearchData.playTimeStart).getTime();
                var playTimeEnd = new Date(inputSearchData.playTimeEnd).getTime();
                console.log(inputSearchData.playTimeEnd);
                console.log("checkDate"+checkDate+",playTimeStart"+playTimeStart+",playTimeEnd"+playTimeEnd);
                if(checkDate >= playTimeStart){
                    alert("請檢查您輸入的播放時間是否正確，無法排入或更改半小時內要播出之節目，有更改之需求請洽工程師!");
                    
                }else{
                    console.log("GET",url);
                    $('#table-content').html('<br> <br>檢查中，請稍候....');
                    intervalOfSelectingUGC = {start: inputSearchData.timeStart, end: inputSearchData.timeEnd};
                    intervalOfPlanningDoohProgrames = {start: inputSearchData.playTimeStart, end: inputSearchData.playTimeEnd};
                    $.ajax({
                        url: url,
                        type: 'GET',
                        data: {skip: 0, limit: 1, intervalOfSelectingUGC:{start:inputSearchData.timeStart, end:inputSearchData.timeEnd}, intervalOfPlanningDoohProgrames:{start:inputSearchData.playTimeStart, end:inputSearchData.playTimeEnd}},
                        success: function(response) {
                            console.log(response);
                            if(response.result == "ok"){
                                UGCPlayListSubPg.loadProgramListTable();
                            }else{
                                console.log('response ='+response.result);
                                alert('您輸入的時間已存在排程，請重新輸入!');
                            }
                        },
                        error: function(jqXHR, textStatus, errorThrown ) {
                            console.log(errorThrown);
                            if (jqXHR.response) {
                                var errMessage = JSON.parse(jqXHR.response).error;
                                if (errMessage) {
                                    $('#table-content').html('<br> <br>'+errMessage);
                                }
                            }
                        }
                    });
                }
            }
        });

    },
    
    loadProgramListTable: function() {
        var flag = 0;
        var inputSearchData = {};
        var url = DOMAIN + "doohs/"+DEFAULT_DOOH+"/program_timeslot_session";
        
        //-- program sequence transform--
        var check_in = "%E6%89%93";
        var miix_it = "%E5%90%88";
        var cultural_and_creative = "%E6%96%87";
        var mood = "%E5%BF%83";
		var wls = "%E5%9C%8B";
        var programSequenceArr = [];
        var next =0;
        var programSequenceStringToArr = function(string , cb){

            if(next == string.length){
                cb(null , programSequenceArr);
                next =0;
            }
            else{
                switch (string.substring(next, next+9))
                {
                case check_in:
                    programSequenceArr.push('check_in');
                    break;
                case miix_it:
                    programSequenceArr.push('miix_it');
                    break;
                case cultural_and_creative:
                    programSequenceArr.push('cultural_and_creative');
                    break;
                case mood:
                    programSequenceArr.push('mood');
                    break;
				case wls:
					programSequenceArr.push('wls');
					break;
                default:

                }
                next += 9;
                programSequenceStringToArr(string , cb);
            }
        };

        
        $('#condition-inner input[class="createProgramListBtn"]').each(function(i){

            inputSearchData[$(this).attr("name")] = $(this).val();

            if($(this).attr("name") == 'ugcSequenceText'){
                
                originSequence = $(this).val();
                var sequence = encodeURIComponent($(this).val());
                
                programSequenceStringToArr(sequence , function(err ,result){
                    if(!err){
                        console.log('programSequenceStringToArr'+result); 
                    }
                    else
                        console.log('programSequenceStringToArr err'+err);
                });
            }
            
            if($(this).val() == "" && flag == 0){
                alert('請輸入完整的條件!!\n時間格式為2013/08/01 00:00:00\n順序請填入類別字首(合成影片填入"合",心情填入"心",etc)\nex:2013/08/01 00:00:00,合心打打文國');
                flag = 1; 
            }
            
            if(inputSearchData.timeStart && inputSearchData.timeEnd && inputSearchData.playTimeStart && inputSearchData.playTimeEnd && inputSearchData.ugcSequenceText && programSequenceArr){

                var playTimeStart = new Date(inputSearchData.playTimeStart).getTime();
                var playTimeEnd = new Date(inputSearchData.playTimeEnd).getTime();
                console.log(inputSearchData.playTimeEnd);
                console.log("checkDate " + checkDate + ",playTimeStart"+playTimeStart+",playTimeEnd"+playTimeEnd);
                
                var schedulingMode;
                if ( $("#checkboxIsContinuousProgramMode").is(":checked") ) {
                    schedulingMode = "continuous";
                }
                else {
                    schedulingMode = "appended_to_each_playlist_cycle";
                }

                var playMode;
                if ( $("#checkboxPlayWithInterruptMode").is(":checked") ) {
                    playMode = "interrupt";
                }
                else {
                    playMode = "periodic";
                }

                var checkDate = null;
                if (playMode !== 'interrupt') {
                    checkDate = new Date().getTime() + 30*60*1000;
                }
                else {
                    checkDate = new Date().getTime();
                }

                var filter;
                if ( $("#checkboxIncludeLiveContentFailed").is(":checked") ) {
                    filter = "not_being_submitted_to_dooh or live_content_failed_in_last_play";
                }
                else {
                    filter = "not_being_submitted_to_dooh";
                }

                
                if(checkDate >= playTimeStart){
                    alert("請檢查您輸入的播放時間是否正確，無法排入或更改半小時內要播出之節目，有更改之需求請洽工程師!");
                    
                }else{
                    
                    $('#table-content').html('<br> <br>自動配對中，請稍候....');
                    intervalOfSelectingUGC = {start: inputSearchData.timeStart, end: inputSearchData.timeEnd};
                    intervalOfPlanningDoohProgrames = {start: inputSearchData.playTimeStart, end: inputSearchData.playTimeEnd};
                    $.ajax({
                        url: url,
                        type: 'POST',
                        data: {
                            intervalOfSelectingUGC:{start:inputSearchData.timeStart, end:inputSearchData.timeEnd}, 
                            intervalOfPlanningDoohProgrames:{start:inputSearchData.playTimeStart, end:inputSearchData.playTimeEnd}, 
                            programSequence:programSequenceArr, 
                            originSequence:originSequence,
                            filter: filter,
                            schedulingMode: schedulingMode,
                            playMode: playMode
                        },
                        success: function(response) {
                            if(response.message){
                                $('#table-content').html('<br> <br>資料產生中，請稍候....');
                                console.log("[Response] message:" + JSON.stringify(response.message));
                                sessionId = response.message;
                                $('#main_menu ul[class="current"]').attr("class", "select");
                                $('#UGCPlayList').attr("class", "current");
    
                                FM.currentContent = FM.UGCPlayList;
                                FM.currentContent.setExtraParameters({sessionId: sessionId});
                                //FM.currentContent.showCurrentPageContent(UGCPlayListSubPg.afterProgramListTableIsLoaded);
                                FM.currentContent.showCurrentPageContent();
                                programSequenceArr =[];
                            }
                        },
                        error: function(jqXHR, textStatus, errorThrown ) {
                            //console.log(errorThrown);
                            if (jqXHR.responseJSON) {
                                var errMessage = jqXHR.responseJSON.error;
                                if (errMessage) {
                                    $('#table-content').html('<br> <br>'+errMessage);
                                }

                            }
                        }
                    });
                }
            }
        });

    },
    
    afterProgramListTableIsLoaded: function() {
        $('#PlayList.ugcCensorNoSetBtn').click(function(){
            console.log('PlayList.ugcCensorNoSetBtn');
            var flag = 0;
            var url = DOMAIN + "doohs/"+DEFAULT_DOOH+"/timeslots/"+sessionId;
            var programTimeSlotId = $(this).attr("name");
            var ugcReferenceNo;
            
            var playMode;
            if ( $("#checkboxPlayWithInterruptMode").is(":checked") ) {
                playMode = "interrupt";
            }
            else {
                playMode = "periodic";
            }
            
            var checkDate = null;
            if (playMode !== 'interrupt') {
                checkDate = new Date().getTime() + 30*60*1000;
            }
            else {
                checkDate = new Date().getTime();
            }

            if(sessionId)
                var arrayOfSessionId = sessionId.split('-');
            console.log(checkDate+','+arrayOfSessionId[2]);
            var showDateStart = new Date(Number(arrayOfSessionId[2]));
            var showDateEnd = new Date(Number(arrayOfSessionId[3]));
            if(checkDate >= arrayOfSessionId[2]){
//                alert("播出時間:"+ showDateStart.toDateString()+' '+showDateStart.toLocaleTimeString() +'~'+ showDateEnd.toDateString()+' '+showDateEnd.toLocaleTimeString()+"，此節目已排入節目清單無法異動，有更改之需求請洽工程師!");
                alert("請檢查您輸入的播放時間是否正確，無法排入或更改半小時內要播出之節目，有更改之需求請洽工程師!");
            }else{
                $('input[class="#PlayList.ugcCensorNoSetBtn"]').each(function(){
                    
                    ugcReferenceNo = $(this).val();
                   
                    if(ugcReferenceNo && programTimeSlotId){
                        
                        innerUgcNo = ugcReferenceNo;
                        var timeSlotId = $(this).attr('id');
                        $('input[id='+timeSlotId+']').val('');
                        var originalContentClass = $('#'+timeSlotId+'.ugcNo').attr('original_content_class');
                        
                        $.ajax({
                            url: url,
                            type: 'PUT',
                            async:false,
                            data: { type: 'setUgcToProgram', programTimeSlotId: timeSlotId, ugcReferenceNo: ugcReferenceNo, originalContentClass: originalContentClass},
                            error: function(jqXHR, textStatus, errorThrown ) {
                                console.log(errorThrown);
                                
                            },
                            success: function(response) {
                                if(response.message){
                                    if(response.message == 'errContentClass'){
                                        console.log("[Response_Set] message:" + response.message);
                                        alert("您所替換的content等級跟原本的不一樣!\n(原本是VIP就只能換VIP，反之亦然)");
                                    }else{
//                                      console.log(timeSlotId);
                                        console.log("[Response_Set] message:" + response.message);
                                        conditions = { newUGCId :response.message, oldUGCId: programTimeSlotId};
                                        if(response.message.substring(0,6) != 'Cannot'){
                                        $('#main_menu ul[class="current"]').attr("class", "select");
                                        $('#UGCPlayList').attr("class", "current");
                                        
                                        $.ajax({
                                            url: DOMAIN + 'getItemOfSlotByNo',
                                            async: false,
                                            type: 'GET',
                                            data: {ugcNo: innerUgcNo},
                                            success: function(response){
//                                                alert('good');
                                                var contentGenre_text;
                                                var genreLabel;
                                                var ugcSource;
                                                
                                                if(response.results[0].contentGenre == 'mood'){
                                                    contentGenre_text = 'label_mood';
                                                    genreLabel = $('<label>').attr({
                                                        class: contentGenre_text
                                                     }).append('心情');
                                                    
                                                    ugcImg = $('<img>').attr({
                                                       src: response.results[0].url.s3,
                                                       width: 700,
                                                       height: 149
                                                    });
                                                    ugcSource = $('<a>').attr({
                                                       href: response.results[0].url.s3,
                                                       target: '_blank'
                                                    }).append(ugcImg);
                                                }else if(response.results[0].contentGenre == 'checkin'){
                                                    contentGenre_text = 'label_checkin';
                                                    genreLabel = $('<label>').attr({
                                                        class: contentGenre_text
                                                     }).append('打卡');
                                                    
                                                    ugcImg = $('<img>').attr({
                                                        src: response.results[0].url.s3,
                                                        width: 700,
                                                        height: 149
                                                     });
                                                     ugcSource = $('<a>').attr({
                                                        href: response.results[0].url.s3,
                                                        target: '_blank'
                                                     }).append(ugcImg);
                                                }else if(response.results[0].contentGenre == 'miix_it'){
                                                    contentGenre_text = 'label_video';
                                                    genreLabel = $('<label>').attr({
                                                        class: contentGenre_text
                                                     }).append('影像合成');
                                                    var userFbImg = $('<img>').attr({
                                                        src: response.results[0].fbProfilePicture,
                                                        alt: '',
                                                        width: 120
                                                    });
                                                    var userContentImg = $('<img>').attr({
                                                        src: response.results[0].userRawContent[0].content,
                                                        alt: "''",
                                                        width: 360
                                                    });
                                                    var label = $('<label>').append('      ');
                                                    var label_name = $('<label>').append(response.results[1].fbName);
                                                }else if(response.results[0].contentGenre == 'cultural_and_creative'){
                                                    contentGenre_text = 'label_design';
                                                    genreLabel = $('<label>').attr({
                                                        class: contentGenre_text
                                                     }).append('文創');
                                                    
                                                    ugcImg = $('<img>').attr({
                                                        src: response.results[0].url.s3,
                                                        width: 700,
                                                        height: 149
                                                     });
                                                     ugcSource = $('<a>').attr({
                                                        href: response.results[0].url.s3,
                                                        target: '_blank'
                                                     }).append(ugcImg);
                                                }else if(response.results[0].contentGenre == 'wls'){
                                                    contentGenre_text = 'label_wls';
                                                    genreLabel = $('<label>').attr({
                                                        class: contentGenre_text
                                                     }).append('國票');
                                                    
                                                    ugcImg = $('<img>').attr({
                                                       src: response.results[0].url.s3,
                                                       width: 700,
                                                       height: 149
                                                    });
                                                    ugcSource = $('<a>').attr({
                                                       href: response.results[0].url.s3,
                                                       target: '_blank'
                                                    }).append(ugcImg);
                                                }
                                                
                                                
                                                $('#'+timeSlotId+'.ugcNo').attr({"original_content_class":response.results[0].contentClass});
                                                
                                                if(response.results[0].contentClass == 'VIP'){
                                                    $('#'+timeSlotId+'.ugcNo').html(response.results[0].no).append("<br><label class='label_special_condition'>VIP</label>");
                                                }else{
                                                    $('#'+timeSlotId+'.ugcNo').html(response.results[0].no);
                                                }
                                                
                                                
                                                $('#'+timeSlotId+'.ugcGenre').html('').append(genreLabel);
                                                if(response.results[0].contentGenre == 'miix_it'){
                                                    $('#'+timeSlotId+'.ugcImage').html('').append(userFbImg).append(label).append(userContentImg).append('<br>').append(label_name);
                                                }else{
                                                    $('#'+timeSlotId+'.ugcImage').html('').append(ugcSource);
                                                }
                                                $('#'+timeSlotId+'.ugcRating').html(response.results[0].rating);
                                               
                                            }
                                        });

//                                        FM.currentContent = FM.UGCPlayList;
//                                        FM.currentContent.showCurrentPageContent();
                                        }else{
                                             if(flag == 0){
                                                 alert(response.message);
                                                 flag = 1;
                                                 }
                                        }
                                        
                                    }

                                }
                            }
                        });
                    }
                });
            }

        });

        $('#PlayList.ugcCensorNoRemoveBtn').click(function(){
            console.log('PlayList.ugcCensorNoRemoveBtn');
            var flag = 0;
            var url = DOMAIN + "doohs/"+DEFAULT_DOOH+"/timeslots/"+sessionId;
            var programTimeSlotId = $(this).attr("name");

            if(sessionId === null && flag === 0){
                alert('Session Id not exist!!');
                flag = 1; 
            }
            if(programTimeSlotId && sessionId){
                var playMode;
                if ( $("#checkboxPlayWithInterruptMode").is(":checked") ) {
                    playMode = "interrupt";
                }
                else {
                    playMode = "periodic";
                }
                
                var checkDate = null;
                if (playMode !== 'interrupt') {
                    checkDate = new Date().getTime() + 30*60*1000;
                }
                else {
                    checkDate = new Date().getTime();
                }

                var arrayOfSessionId = sessionId.split('-');
                console.log(checkDate+','+arrayOfSessionId[2]);
                var showDateStart = new Date(Number(arrayOfSessionId[2]));
                var showDateEnd = new Date(Number(arrayOfSessionId[3]));
                if(checkDate >= arrayOfSessionId[2]){
                    alert("請檢查您輸入的播放時間是否正確，無法排入或更改半小時內要播出之節目，有更改之需求請洽工程師!");
                }else{
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        data: { type:'removeUgcfromProgramAndAutoSetNewOne', programTimeSlotId: programTimeSlotId},
                        success: function(response) {
                            if(response.message){
                                console.log("[Response] message:" + response.message);
                                conditions = { newUGCId :response.message, oldUGCId: programTimeSlotId};

                                $('#main_menu ul[class="current"]').attr("class", "select");
                                $('#UGCPlayList').attr("class", "current");

                                FM.currentContent = FM.UGCPlayList;
                                FM.currentContent.showCurrentPageContent();

                            }
                        },
                        error: function(jqXHR, textStatus, errorThrown ) {
                            //console.log(errorThrown);
                            if (jqXHR.responseJSON) {
                                var errMessage = jqXHR.responseJSON.error;
                                if (errMessage) {
                                    console.log("Faile to remove UGC from program and auto set a new one: "+ errMessage);
                                }

                            }
                        }
                    });
                }
            }
        });

        $('#pushProgramsBtn').click(function(){
            var flag = 0;
            var url = DOMAIN + "doohs/"+DEFAULT_DOOH+"/ProgramsTo3rdPartyContentMgr/"+sessionId;
            if(sessionId === null && flag === 0){
                alert('Session Id not exist!!');
                flag = 1; 
            }
            if(sessionId){
                var schedulingMode;
                if ( $("#checkboxIsContinuousProgramMode").is(":checked") ) {
                    schedulingMode = "continuous";
                }
                else {
                    schedulingMode = "appended_to_each_playlist_cycle";
                }

                var playMode;
                if ( $("#checkboxPlayWithInterruptMode").is(":checked") ) {
                    playMode = "interrupt";
                }
                else {
                    playMode = "periodic";
                }
                
                var checkDate = null;
                if (playMode !== 'interrupt') {
                    checkDate = new Date().getTime() + 30*60*1000;
                }
                else {
                    checkDate = new Date().getTime();
                }

                var arrayOfSessionId = sessionId.split('-');
                console.log(checkDate+','+arrayOfSessionId[2]);
                var showDateStart = new Date(Number(arrayOfSessionId[2]));
                var showDateEnd = new Date(Number(arrayOfSessionId[3]));
                if(checkDate >= arrayOfSessionId[2]){
                    alert("請檢查您輸入的播放時間是否正確，無法排入或更改半小時內要播出之節目，有更改之需求請洽工程師!");
//                    alert("播出時間:"+ showDateStart.toDateString()+' '+showDateStart.toLocaleTimeString() +'~'+ showDateEnd.toDateString()+' '+showDateEnd.toLocaleTimeString()+"，此節目已排入節目清單無法異動，有更改之需求請洽工程師!");
                }else{
                    
                    $.ajax({
                            url: url,
                            type: 'PUT',
                            data: {
                            intervalOfSelectingUGC : intervalOfSelectingUGC,
                            intervalOfPlanningDoohProgrames :intervalOfPlanningDoohProgrames,
                            originSequence :originSequence,
                            schedulingMode: schedulingMode,
                            playMode: playMode
                            },
                            success: function(response) {
                                if(response.message){
                                    console.log("[Response] message:" + response.message);
                                }
                                //$('#underPushingText').html('上傳成功!!');
                            },
                            error: function(jqXHR, textStatus, errorThrown) {
                                //$('#underPushingText').html('上傳失敗： '+textStatus+" "+errorThrown);
                            }
                        });
                        $('#pushProgramsBtn').hide();
                        //$('#table-content').append($('<p>').attr("id","underPushingText").html('上傳至播放系統中，請稍候....'));
                }
            }
        });            

    }//End of afterProgramListTableIsLoaded
        
        
};