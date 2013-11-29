var UGCPlayListSubPg = {
        
    loadInitialPage: function(){
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#UGCPlayList').attr("class", "current");
        $('#contentExtra').html("").hide();
        
        $.get('/miix_admin/table_censorPlayList_head.html', function(res){
            $('#table-content-header').html(res);
            $('#table-content').html('');
            
            $('#createProgramListBtn').click( UGCPlayListSubPg.checkProgramList );

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
                alert('請輸入完整的條件!!\n時間格式為2013/08/01 00:00:00\n順序請填入類別字首(合成影片填入"合",心情填入"心",etc)\nex:2013/08/01 00:00:00,合心打打文');
                flag = 1; 
            }
            console.log(inputSearchData);
            
            if(inputSearchData.timeStart && inputSearchData.timeEnd && inputSearchData.playTimeStart && inputSearchData.playTimeEnd && inputSearchData.ugcSequenceText){
                var checkDate = new Date().getTime()+ 30*60*1000;
                var playTimeStart = new Date(inputSearchData.playTimeStart).getTime();
                var playTimeEnd = new Date(inputSearchData.playTimeEnd).getTime();
                console.log(inputSearchData.playTimeEnd);
                console.log("checkDate"+checkDate+",playTimeStart"+playTimeStart+",playTimeEnd"+playTimeEnd);
                if(checkDate >= playTimeStart){
                    alert("請檢查您輸入的播放時間是否正確，無法排入或更改半小時內要播出之節目，有更改之需求請洽工程師!");
                    
                }else{
                    console.log("GET",url);
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
                alert('請輸入完整的條件!!\n時間格式為2013/08/01 00:00:00\n順序請填入類別字首(合成影片填入"合",心情填入"心",etc)\nex:2013/08/01 00:00:00,合心打打文');
                flag = 1; 
            }
            
            if(inputSearchData.timeStart && inputSearchData.timeEnd && inputSearchData.playTimeStart && inputSearchData.playTimeEnd && inputSearchData.ugcSequenceText && programSequenceArr){

                var checkDate = new Date().getTime() + 30*60*1000;
                var playTimeStart = new Date(inputSearchData.playTimeStart).getTime();
                var playTimeEnd = new Date(inputSearchData.playTimeEnd).getTime();
                console.log(inputSearchData.playTimeEnd);
                console.log("checkDate"+checkDate+",playTimeStart"+playTimeStart+",playTimeEnd"+playTimeEnd);
                if(checkDate >= playTimeStart){
                    alert("請檢查您輸入的播放時間是否正確，無法排入或更改半小時內要播出之節目，有更改之需求請洽工程師!");
                    
                }else{
                    
                    $('#table-content').html('<br> <br>自動配對中，請稍候....');
                    intervalOfSelectingUGC = {start: inputSearchData.timeStart, end: inputSearchData.timeEnd};
                    intervalOfPlanningDoohProgrames = {start: inputSearchData.playTimeStart, end: inputSearchData.playTimeEnd};
                    $.ajax({
                        url: url,
                        type: 'POST',
                        data: {intervalOfSelectingUGC:{start:inputSearchData.timeStart, end:inputSearchData.timeEnd}, intervalOfPlanningDoohProgrames:{start:inputSearchData.playTimeStart, end:inputSearchData.playTimeEnd}, programSequence:programSequenceArr, originSequence:originSequence},
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
    
    afterProgramListTableIsLoaded: function() {
        $('#PlayList.ugcCensorNoSetBtn').click(function(){
            console.log('PlayList.ugcCensorNoSetBtn');
            var flag = 0;
            var url = DOMAIN + "doohs/"+DEFAULT_DOOH+"/timeslots/"+sessionId;
            var programTimeSlotId = $(this).attr("name");
            var ugcReferenceNo;
            var checkDate = new Date().getTime() + 30*60*1000;
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
                        $.ajax({
                            url: url,
                            type: 'PUT',
                            data: { type: 'setUgcToProgram', programTimeSlotId: programTimeSlotId, ugcReferenceNo: ugcReferenceNo},
                            success: function(response) {
                                if(response.message){
                                    console.log("[Response_Set] message:" + response.message);
                                    conditions = { newUGCId :response.message, oldUGCId: programTimeSlotId};
                                    if(response.message.substring(0,6) != 'Cannot'){
                                    $('#main_menu ul[class="current"]').attr("class", "select");
                                    $('#UGCPlayList').attr("class", "current");

                                    FM.currentContent = FM.UGCPlayList;
                                    FM.currentContent.showCurrentPageContent();
                                    }else{
                                         if(flag == 0){
                                             alert(response.message);
                                             flag = 1;
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

            if(sessionId === null && flag == 0){
                alert('Session Id not exist!!');
                flag = 1; 
            }
            if(programTimeSlotId && sessionId){
                var checkDate = new Date().getTime() + 30*60*1000;
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
                        }
                    });
                }
            }
        });

        $('#pushProgramsBtn').click(function(){
            var flag = 0;
            var url = DOMAIN + "doohs/"+DEFAULT_DOOH+"/ProgramsTo3rdPartyContentMgr/"+sessionId;
            if(sessionId === null && flag == 0){
                alert('Session Id not exist!!');
                flag = 1; 
            }
            if(sessionId){
                var checkDate = new Date().getTime() + 30*60*1000;
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
                            originSequence :originSequence
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