﻿var liveCheckSubPg = {
    loadLiveCheckTable: function(res){
        console.dir(res);
        $('#table-content').html("");
        var form=$("<form>");
        $('#table-content').append(form);
        var table=$("<table>").attr({id:"hello",
                                     width:"100%",
                                     border:"0",
                                     cellpadding:"0",
                                     cellspacing:"0"
                                    });

        var tbody=$("<tbody>");
        var title_tr=$("<tr>");
        var title_td=$("<td>").attr({class:"table-header-repeat_live_check",align:"center"}).html("<a class='aForLive'>播放時間</a>");
        var title_td2=$("<td>").attr({class:"table-header-repeat_live_check",align:"center"}).html("<a class='aForLive'>影片編號</a>");
        var title_td3=$("<td>").attr({class:"table-header-repeat_live_check",align:"center"}).html("<a class='aForLive'>原始UGC</a>");
        var title_td4=$("<td>").attr({class:"table-header-repeat_live_check",align:"center"}).html("<a class='aForLive'>live UGC (live number / time / image / radio box)</a>");

        title_tr.append(title_td);
        title_tr.append(title_td2);
        title_tr.append(title_td3);
        title_tr.append(title_td4);

        form.append(table);
        table.append(tbody);
        tbody.append(title_tr);

        for(var i=0;i<res.length;i++){  
                
            if(i%2===0){
                var tr=$("<tr>").attr({class:"live_alternate-row"});
            }else{
                var tr=$("<tr>").attr({class:""});
            }

            if(res[i].liveContent[0]){
                var s3img=$("<img>").attr({src:res[i].liveContent[0].url.longPhoto,
                                           width:"200",
                                           height:"80"
                                           });
            }else{
                var s3img=$("<div>").attr({
                                           width:"200",
                                           height:"80"}).html("live content 尚未產生喔~");
            }           

            if(res[i].liveContent[0]){
                var s3imgLink=$("<a>").attr({href:res[i].liveContent[0].url.longPhoto,
                                             target:"_blank"
                                             }).append(s3img);
            }


            var post_live_time_start=new Date(parseInt(res[i].start));
            var post_year_start=post_live_time_start.getFullYear();
            var post_month_start=post_live_time_start.getMonth()+1;
            var post_date_start=post_live_time_start.getDate();
            var post_hours_start=post_live_time_start.getHours();
            var post_minutes_start=post_live_time_start.getMinutes();
            var timeString_start=post_year_start+"/"+post_month_start+"/"+post_date_start+"  "+post_hours_start+":"+post_minutes_start;

            var post_live_time_end=new Date(parseInt(res[i].end));
            var post_year_end=post_live_time_end.getFullYear();
            var post_month_end=post_live_time_end.getMonth()+1;
            var post_date_end=post_live_time_end.getDate();
            var post_hours_end=post_live_time_end.getHours();
            var post_minutes_end=post_live_time_end.getMinutes();
            var timeString_start_end=post_year_end+"/"+post_month_end+"/"+post_date_end+"  "+post_hours_end+":"+post_minutes_end;

            var td_1=$("<td>").html("start："+timeString_start+"<br>"+"end："+timeString_start_end+"<br><br>");
            var td_2=$("<td>").attr({align:"center"}).html("<b>"+res[i].ugcCensorNo+"</b>");
            var td_3=$("<td>").html(s3imgLink);

            var td_4=$("<td>").html("hi");
            var FailboxForm = $("<form>").attr({style:"display: inline-block;vertical-align:400%"});
            
            if ( res[i].canBeFoundInPlayerLog == "YES" ) {
                FailboxForm.append("<p style='color:blue'>Player<br>有播放紀錄</p><br>");
            }
            else if ( res[i].canBeFoundInPlayerLog == "NO" ) {
                FailboxForm.append("<p><b style='color:orange'>Player<br>無播放紀錄</b></p><br>");
            }
            else {
                FailboxForm.append("<p style='color:purple'>仍未匯入Player的log</p><br>");
            }
            
//            var FailboxInputForSourceNotPlayed = $("<input>").attr({
//                     type: "radio",
//                     name: "badLiveContentRadioBtn_"+i,
//                     class: "badLiveContentRadioBtn",
//                     value: "source_not_played",
//                     fbUserId: res[i].fbUserId,
//                     programTimeSlot_id: res[i].programTimeSlot_id,
//                     ugcCensorNo: res[i].ugcCensorNo,
//                     liveState: res[i].liveState,
//                     ownerId_id: res[i].ownerId_id
//            });
//
//            var FailboxInputForNotGenerated = $("<input>").attr({
//                type: "radio",
//                name: "badLiveContentRadioBtn_"+i,
//                class: "badLiveContentRadioBtn",
//                value: "not_generated",
//                fbUserId: res[i].fbUserId,
//                programTimeSlot_id: res[i].programTimeSlot_id,
//                ugcCensorNo: res[i].ugcCensorNo,
//                liveState: res[i].liveState,
//                ownerId_id: res[i].ownerId_id
//            });
//
//            var FailboxInputForNotCorrect = $("<input>").attr({
//                type: "radio",
//                name: "badLiveContentRadioBtn_"+i,
//                class: "badLiveContentRadioBtn",
//                value: "incorrect",
//                fbUserId: res[i].fbUserId,
//                programTimeSlot_id: res[i].programTimeSlot_id,
//                ugcCensorNo: res[i].ugcCensorNo,
//                liveState: res[i].liveState,
//                ownerId_id: res[i].ownerId_id
//            });
//            
//            var FailboxInputForBadExposure = $("<input>").attr({
//                type: "radio",
//                name: "badLiveContentRadioBtn_"+i,
//                class: "badLiveContentRadioBtn",
//                value: "bad_exposure",
//                fbUserId: res[i].fbUserId,
//                programTimeSlot_id: res[i].programTimeSlot_id,
//                ugcCensorNo: res[i].ugcCensorNo,
//                liveState: res[i].liveState,
//                ownerId_id: res[i].ownerId_id
//            });
//
//            var FailboxInputForOtherFailReason = $("<input>").attr({
//                type: "radio",
//                name: "badLiveContentRadioBtn_"+i,
//                class: "badLiveContentRadioBtn",
//                value: "other_fail",
//                fbUserId: res[i].fbUserId,
//                programTimeSlot_id: res[i].programTimeSlot_id,
//                ugcCensorNo: res[i].ugcCensorNo,
//                liveState: res[i].liveState,
//                ownerId_id: res[i].ownerId_id
//            });
//            
//            
//            FailboxForm.append($("<div>").append(FailboxInputForSourceNotPlayed).append("没播出"));
//            FailboxForm.append($("<div>").append(FailboxInputForNotGenerated).append("有播出，但live照片没拍"));
//            FailboxForm.append($("<div>").append(FailboxInputForNotCorrect).append("有播出，但live照片拍錯"));
//            FailboxForm.append($("<div>").append(FailboxInputForBadExposure).append("有播出live照片拍對，但曝光不正確"));
//            FailboxForm.append($("<div>").append(FailboxInputForOtherFailReason).append("其他失敗原因"));
            
            var failLiveContentSelectionDiv = $("<div>").attr({id: "failLiveContentSelectionDiv_"+i}).appendTo(FailboxForm);
            var failLiveContentBtn = $("<input>").attr({type: "radio", rowIndex: i});
            failLiveContentSelectionDiv.append(failLiveContentBtn).append("失敗");
                        
            var failLiveContentSelect = $("<select>").attr({
                class: "badLiveContentCombobox",
                fbUserId: res[i].fbUserId,
                programTimeSlot_id: res[i].programTimeSlot_id,
                ugcCensorNo: res[i].ugcCensorNo,
                liveState: res[i].liveState,
                ownerId_id: res[i].ownerId_id
            }).html('<option value="not_checked">--</option>' +
                    '<option value="source_not_played">没播出</option>' +
                    '<option value="not_generated">有播出但照片没拍</option>' +
                    '<option value="incorrect">有播出但照片拍錯</option>' +
                    '<option value="bad_exposure">拍對了但曝光不正確</option>' +
                    '<option value="other_fail">其他失敗原因</option>' 
            );
            
            failLiveContentBtn.click(function(){
                var divClicked = $("#failLiveContentSelectionDiv_"+$(this).attr("rowIndex"));
                divClicked.html("");
                divClicked.append("請選擇失敗原因：<br>").append(failLiveContentSelect);
            });

            

            //---------  'fail' checkbox  click--------------

//            if( res[i].liveState!="not_checked" ){
//                $("input[name='badLiveContentRadioBtn_"+i+"']").hide();
//                
//                //FailboxForm.append("<b style='color:red'>失敗(done)<b>");
//            }

            
//            if(res[i].liveState=="incorrect"){
//                FailboxInput.hide();
//                FailboxForm.append("<b style='color:red'>失敗(done)<b>");
//
//            }else{
//                FailboxForm.append("失敗")
//            }
            //----------------end 'fail' checkbox  click-----

            tbody.append(tr);
            tr.append(td_1);
            FailboxForm.appendTo(td_1);
            tr.append(td_2);
            tr.append(td_3);

            if(res[i].liveContent.length == 0){
                var tr_for_null = $("<tr>");
                tr.append(tr_for_null);
            }

            
            for(var j=0;j<res[i].liveContent.length;j++){               
                    
                var div_live = $("<div>");
                    
                if(res[i].liveContent[j].url.livePhotos){        //determine livePhotos or not (choose 1/5)
                    for(var k=0;k<res[i].liveContent[j].url.livePhotos.length;k++){
        
                        var span_img = $("<span>").attr({                                                                   
                                            });
                                          
                        var linkS3=$("<a>").attr({href:res[i].liveContent[j].url.livePhotos[k],
                                          target:"_blank"});                                      
                        var inner_img = $("<img>").attr({src:res[i].liveContent[j].url.livePhotos[k],
                                                           width:350,
                                                           height:200,
                                                           id:"testMove",
                                                           class:"ho",
                                                           style:"margin-bottom:10px"
                                                       
                                                      });   
                                          
                        var boxForChoose = $("<input>").attr({
                            style:"margin-left:10px;margin-right:10px;",
                            type:"radio",
                            id:"boxCheckLive",
                            class:"chooseOne",
                            name:"yo",
                            value:res[i].liveContent[j].ownerId.userID, //user id
                            "s3url":res[i].liveContent[j].url.livePhotos[k], //五選一
                            "longPic":res[i].liveContent[j].url.longPhoto, //長條圖
                            "programTimeSlot_id":res[i].programTimeSlot_id,
                            "fbUserId":res[i].fbUserId,
                            "_id":res[i].liveContent[j]._id, //_id
                            "liveTime":res[i].liveContent[j].liveTime,
                            "ugcCensorNo":res[i].ugcCensorNo,
                            "_type":"correct"
                        });

            
                        linkS3.append(inner_img);
                        span_img.append(linkS3);
                        span_img.append(boxForChoose);
                        div_live.append(span_img);  
                        
                        if(k==3){
                            div_live.append("<br>");
                        }
                    }
                        
                    var tr_4=$("<tr>").html(div_live);//"live ugc, 編號+日期+圖+按鈕(靠右的))"
              
                }
                else {
                    if(res[i].liveContent[j].genre == "miix_story_raw"){
                        /*---------------------------------- when genre is   "miix_story_raw"----------------------------------------*/
                        var videoSrc = res[i].liveContent[j].url.s3;
                        if(videoSrc[0] != 'h')
                            videoSrc = 'https://s3.amazonaws.com/miix_content/' + videoSrc;
                        
                        var sourceTag=$("<source>").attr({
                                                    // src:'https://s3.amazonaws.com/miix_content/'+res[i].liveContent[j].url.s3,
                                                    // src:res[i].liveContent[j].url.s3,
                                                    src: videoSrc,
                                                    type: "video/mp4",
                                                });
                        var videoTag = $("<video>").attr({
                                                     controls:"",
                                                     width:500,
                                                     height:500
                                                    });
                        videoTag.append(sourceTag);
                        var tr_4=$("<tr>").html(videoTag);//"live ugc, 編號+日期+圖+按鈕(靠右的))"
                                                
                        /*----------------------------------ends when genre is   "miix_story_raw"----------------------------------------*/
                    }
                    else{
                        /*---------------------------------- when genre is   "miix_image_live_photo" (非五選一 舊版)----------------------------------------*/
                                                var linkS3=$("<a>").attr({href:res[i].liveContent[j].url.s3,
                                                                      target:"_blank"});
                                                var live_img=$("<img>").attr({src:res[i].liveContent[j].url.s3,
                                                                           width:"330",
                                                                           height:"200"});
                                            
                                                linkS3.append(live_img);
                                                var tr_4=$("<tr>").html(linkS3);//"live ugc, 編號+日期+圖+按鈕(靠右的))"
                        /*----------------------------------ends  when genre is   "miix_image_live_photo" (非五選一 舊版)----------------------------------------*/
                    }
                
                }
                    
                var post_live_time=new Date(parseInt(res[i].liveContent[j].liveTime));
                var post_year=post_live_time.getFullYear();
                var post_month=post_live_time.getMonth()+1;
                var post_date=post_live_time.getDate();
                var post_hours=post_live_time.getHours();
                var post_minutes=post_live_time.getMinutes();
                var timeString=post_year+"/"+post_month+"/"+post_date+"  "+post_hours+":"+post_minutes;
                var sp=$("<span>").attr({style:"vertical-align:460%"}).html(res[i].liveContent[j].no+"          │   "+timeString); //sp是編號+日期
                var boxForm = $("<form>").attr({style:"display: inline-block;vertical-align:400%"});
                var boxInput = $("<input>").attr({type:"radio",
                                                  name:"yo",
                                                  value:"ha",
                                                  checked:"checked"});
                                          
                /*------------------------- live content(one image)  or  video btn-----------------------------------------------*/                           
                var boxInput2 = $("<input>").attr({type:"radio",
                    id:"boxCheckLive",
                    class:"good",
                    name:"yo",
                    value:res[i].liveContent[j].ownerId.userID,
                    "s3url":res[i].liveContent[j].url.s3,
                    "longPic":res[i].liveContent[j].url.longPhoto,
                    "_id":res[i].liveContent[j]._id,
                    //
                    "projectId": res[i].liveContent[j].projectId,
                    //
                    "liveTime":res[i].liveContent[j].liveTime,
                    "ugcCensorNo":res[i].ugcCensorNo,
                    "_type":"correct",
                    "genre":res[i].liveContent[j].genre
                });
                /*------------------------- ends live content(one image)  or  video btn -----------------------------------------------*/       
                
                
                 //---------------------- deprecated--------------------------------------------    
                var boxInput3 = $("<input>").attr({type:"radio",
                    id:"boxCheckLive",
                    class:"bad",
                    name:"yo",
                    value:res[i].liveContent[j].ownerId.userID,
                    "s3url":res[i].liveContent[j].url.s3,
                    "longPic":res[i].liveContent[j].url.longPhoto,
                    "_id":res[i].liveContent[j]._id,
                    "liveTime":res[i].liveContent[j].liveTime,
                    "ugcCensorNo":res[i].ugcCensorNo,
                    "_type":"incorrect"});
                //-------------------------------------------------------------------------
        
                if(!res[i].liveContent[j].url.livePhotos){  //determine livePhotos or not to show radio button
                    if(res[i].liveContent[j].state=="correct"){ //for "miix_story_raw" or  "miix_image_live_photo"(非五選一)
                        boxInput2.attr({checked:"checked"});
                        
                        boxInput2.hide();
                        boxInput3.hide();
                        boxInput.hide();
                        
                        
                        
                        boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                        boxForm.append(boxInput);
                        boxForm.append("");
                        boxForm.append("<br>");
                        
                        boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                        boxForm.append(boxInput2);
                        
                        if(res[i].liveContent[j].genre == "miix_story_raw"){
                            boxForm.append("<b style='color:blue'>成功(影片)(done)<b>");
                        }else{
                            boxForm.append("<b style='color:blue'>成功(done)<b>");
                        }
                        
                        boxForm.append("<br>");
                        boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                        boxForm.append(boxInput3);
                        boxForm.append("");
                        /* ends of radio box */
                        tr_4.prepend(sp); //編號日期連接liveimg
                        tr.append(tr_4);
                        tr.append(boxForm);
                        boxForm.appendTo(tr_4)
                        tr.append("<br>");
                        tr.append("<hr>");
                        tr.append("<br>");
                    }else if(res[i].liveContent[j].state=="incorrect"){
                        
                        //--------------- deprecated --------------
                        boxInput3.attr({checked:"checked"});
                        boxInput2.hide();
                        boxInput3.hide();
                        boxInput.hide();
                        
                        
                        boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                        boxForm.append(boxInput);
                        boxForm.append("");
                        boxForm.append("<br>");
                        boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                        boxForm.append(boxInput2);
                        boxForm.append("");
                        boxForm.append("<br>");
                        boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                        boxForm.append(boxInput3);
                        boxForm.append("<b style='color:red'>失敗(done)<b>");
                        /* ends of radio box */
                        tr_4.prepend(sp);
                        tr.append(tr_4);
                        tr.append(boxForm);
                        boxForm.appendTo(tr_4)
                        tr.append("<br>");
                        tr.append("<hr>");
                        tr.append("<br>");
                        //---------------------------------------------
                    }else{
                            boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                            boxForm.append(boxInput);
                            boxForm.append("default");
                            boxForm.append("<br>");
                            boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                            boxForm.append(boxInput2);
                            boxForm.append("正確");
                            
                            tr_4.prepend(sp);
                            tr.append(tr_4);
                            tr.append(boxForm);
                            boxForm.appendTo(tr_4)
                            tr.append("<br>");
                        
                         if(j!=res[i].liveContent.length-1){
                            tr.append("<hr>");
                         }
                        
                        tr.append("<br>");
                    }

                }else{//for 1/5
        
                    if(res[i].liveContent[j].state=="correct"){
                        
                        var chooseResult=$("<a>").attr({href:res[i].liveContent[j].url.s3,
                                          target:"_blank"});                    
                        var selectedImg = $("<img>").attr({src:res[i].liveContent[j].url.s3,
                                                          width:500,height:250});
                        chooseResult.append(selectedImg);                         
                        tr_4.html("");
                        tr_4.append(chooseResult);
                        tr_4.append("<b style='color:blue'>五選一(done)<b>");
                        tr_4.prepend(sp);
                        tr.append(tr_4);
                        tr.append("<br>");
                        
                        if(j!=res[i].liveContent.length-1){
                           tr.append("<hr>");
                        }
                    
                        tr.append("<br>");
                    }else{
                        boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                            
                        tr_4.prepend(sp);
                        tr.append(tr_4);
                        tr.append("<br>");
                        
                        if(j!=res[i].liveContent.length-1){
                           tr.append("<hr>");
                        }
                        
                        tr.append("<br>");
                    }
                }
        
            }
        }


        //-------------for fail 最左邊--------------------------------------
//        $(".badLiveContentCombobox").click(function(){
        $(".badLiveContentCombobox").change(function(){
          //alert("g");
          
          
            var forComfirm=confirm("您按下的是 ***失敗***\n辛苦囉 ~~~!!");
          
            var _id=$(this).attr("programTimeSlot_id");
            var liveState=$(this).val();
            var ugcCensorNo=$(this).attr("ugcCensorNo");
            var fbUserId=$(this).attr("fbUserId");
            var ownerId_id=$(this).attr("ownerId_id");
            
            console.log("programTimeSlot_id:"+_id+"\nfbUserId:"+fbUserId+"\nliveState:"+liveState);
            
            var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/programTimeSlot";
            $.ajax({
                url: url,
                type: 'PUT',
                data: {programTimeSlot_Id:_id,
                    fbUserId:fbUserId,
                    vjson:{liveState: liveState}
                },
                success: function(response) {
                    if(response.message){
                        console.log("[Response] message: PUT"+ url + ':'  + response.message);
                    }
                }
            });
            
            var url=DOMAIN+"fbItem/"+ownerId_id;
            $.ajax({
               url: url,
               type: 'POST',
               data: {type:liveState,
                   ugcCensorNo: ugcCensorNo},
               success: function(response) {
                   if(response.message){
                       console.log("[Response] message: POST"+ url + ':' + response.message);
                   }
               }
            });
            
            var url = DOMAIN + "user_content_attribute";
            var mustPlay = true;
            $.ajax({
                url: url,
                type: 'PUT',
                data: {no: ugcCensorNo, vjson:{mustPlay: mustPlay}},
                success: function(response) {
                    if(response.message){
                        console.log("[Response] message: PUT"+ url + ':' + response.message);
                    }
                }
            });
            
            
        });
        //--------- end 最左邊 fail-----------
        
        
        /* ------------------------------  最右邊正確紐---------------------------------------------------*/
        $("#boxCheckLive.good").click(function(){ //btn for image(only one) and video
        //alert("g");
        
            if($(this).attr("genre") == "miix_story_raw"){
                // alert("it's miix_story_raw");
                var forComfirm=confirm("你按下的是 ***正確***(for video)\n多謝!!");
                if (forComfirm==true)
                {
                }
                else
                {
                    return false;
                }
                                  
                var _id=$(this).attr("_id");
                var userID=$(this).val();
                var s3Url=$(this).attr("s3url");
                var picType=$(this).attr("_type");
                var projectId = $(this).attr("projectId");
                var liveTime=$(this).attr("liveTime");
                var ugcCensorNo=$(this).attr("ugcCensorNo");
                
                console.log("_id: " + _id + 
                            "\n" + "userID: " + userID + 
                            "\n" + "projectId: " + projectId + 
                            "\n" + "liveTime: " + liveTime + 
                            "\n" + "s3Url: " + s3Url + 
                            "\n" + "Type: " + picType);
                
                var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/liveContent";
                $.ajax({
                    url: "/internal/story_cam_controller/available_story_movie",
                    type: "POST",
                    headers : { 'miix_movie_project_id' : projectId, 'record_time' : liveTime },
                    success: function(response) {
                        if(response.message){
                            console.log("[Response] message:" + response.message);
                        }
                    }
                });
                
                var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/liveContent";
                $.ajax({
                    url: url,
                    type: 'PUT',
                    data: {liveContent_Id:_id,
                           vjson:{state: picType}},
                    success: function(response) {
                        if(response.message){
                            console.log("[Response] message:" + response.message);
                        }
                    }
                });
                
                
                var programTimeSlot_id=$(this).attr("programTimeSlot_id");
                var liveState="correct";
                var fbUserId=$(this).attr("fbUserId");
                var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/programTimeSlot";
                $.ajax({
                    url: url,
                    type: 'PUT',
                    data: {programTimeSlot_Id:programTimeSlot_id,
                        fbUserId:fbUserId,
                        vjson:{liveState: liveState}
                    },
                    success: function(response) {
                        if(response.message){
                            console.log("[Response] message: PUT"+ url + ':'  + response.message);
                        }
                    }
                });
                
                /* add code to implement "miix_story_raw"*/
                
                
              
            } else {
                
                var forComfirm=confirm("你按下的是 ***正確***\n送出就沒有後悔的餘地\n觀棋不語真君子，起手無回大丈夫\n多謝!!");
                if (forComfirm==true)
                {
             
                }
                else
                {
            
                    return false;
                }
                
                var _id=$(this).attr("_id");
                var userID=$(this).val();
                var s3Url=$(this).attr("s3url");
                var picType=$(this).attr("_type");
                var longPic=$(this).attr("longPic");
                var liveTime=$(this).attr("liveTime");
                var ugcCensorNo=$(this).attr("ugcCensorNo");
                
                console.log("_id:"+_id+"\nuserID:"+userID+"\ns3Url:"+s3Url+"\nType:"+picType);
                                    
                var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/liveContent";
                $.ajax({
                    url: url,
                    type: 'PUT',
                    data: {liveContent_Id:_id,
                           userID:userID,
                           photoUrl:s3Url,
                           vjson:{state: picType}},
                    success: function(response) {
                        if(response.message){
                            console.log("[Response] message:" + response.message);
                        }
                    }
                });
                
                var url=DOMAIN+"fbItem/"+userID;
                $.ajax({
                    url: url,
                    type: 'POST',
                    data: {s3Url: s3Url,
                           longPic: longPic,
                           type: picType,
                           liveTime: liveTime,
                           ugcCensorNo: ugcCensorNo,
                           liveContent_Id:_id},
                    success: function(response) {
                        if(response.message){
                            console.log("[Response] message:" + response.message);
                        }
                    }
                });
                
                var programTimeSlot_id=$(this).attr("programTimeSlot_id");
                var liveState="correct";
                var fbUserId=$(this).attr("fbUserId");
                var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/programTimeSlot";
                $.ajax({
                    url: url,
                    type: 'PUT',
                    data: {programTimeSlot_Id:programTimeSlot_id,
                        fbUserId:fbUserId,
                        vjson:{liveState: liveState}
                    },
                    success: function(response) {
                        if(response.message){
                            console.log("[Response] message: PUT"+ url + ':'  + response.message);
                        }
                    }
                });

            }
            
            
        });
        /* ------------------------------ end 最右邊正確紐---------------------------------------------------*/
        /* ------------------------------  最右邊五選一紐---------------------------------------------------*/
        $(".chooseOne").click(function(){
            console.log($(this));
            var forComfirm=confirm("你選了五張中最讚的張，請確定好之後送出!");
          
          
          
            var _id=$(this).attr("_id");
            var userID=$(this).val();
            var s3Url=$(this).attr("s3url");
            var picType=$(this).attr("_type");
            var longPic=$(this).attr("longPic");
            var liveTime=$(this).attr("liveTime");
            var ugcCensorNo=$(this).attr("ugcCensorNo");
            
            console.log("_id:"+_id+"\nuserID:"+userID+"\ns3Url:"+s3Url+"\nType:"+picType);
            if (forComfirm==true)
            {
            }else
            {
                return false;
            }
            
            var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/liveContent";
            $.ajax({
                url: url,
                type: 'PUT',
                data: {liveContent_Id:_id,
                    userID:userID,
                    photoUrl:s3Url,
                    vjson:{state: picType,
                           "url.s3": s3Url,
                          }
                      },
                success: function(response) {
                    if(response.message){
                        console.log("[Response] message:" + response.message);
                    }
                }
            });
            
            var url=DOMAIN+"fbItem/"+userID;
            $.ajax({
                url: url,
                type: 'POST',
                data: {s3Url: s3Url,
                    longPic: longPic,
                    type: picType,
                        liveTime: liveTime,
                        ugcCensorNo: ugcCensorNo,
                        liveContent_Id:_id},
                success: function(response) {
                    if(response.message){
                        console.log("[Response] message:" + response.message);
                    }
                }
            });
            
            var programTimeSlot_id=$(this).attr("programTimeSlot_id");
            var liveState="correct";
            var fbUserId=$(this).attr("fbUserId");
            var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/programTimeSlot";
            $.ajax({
                url: url,
                type: 'PUT',
                data: {programTimeSlot_Id:programTimeSlot_id,
                    fbUserId:fbUserId,
                    vjson:{liveState: liveState}
                },
                success: function(response) {
                    if(response.message){
                        console.log("[Response] message: PUT"+ url + ':'  + response.message);
                    }
                }
            });

            
        });
        /* ------------------------------ end 五選一紐---------------------------------------------------*/
        
        /* ------------------------------ deprecated (最右邊失敗鈕)---------------------------------------------------*/
        $("#boxCheckLive.bad").click(function(){
        
            var forComfirm=confirm("你按下的是 ***失敗***\n送出就沒有後悔的餘地\n觀棋不語真君子，起手無回大丈夫\n多謝!!");
          
            var _id=$(this).attr("_id");
            var userID=$(this).val();
            var s3Url=$(this).attr("s3url");
            var picType=$(this).attr("_type");
            var longPic=$(this).attr("longPic");
            var liveTime=$(this).attr("liveTime");
            var ugcCensorNo=$(this).attr("ugcCensorNo");
            
            console.log("_id:"+_id+"\nuserID:"+userID+"\ns3Url:"+s3Url+"\nType:"+picType);
            
            var url=DOMAIN+"doohs/"+DEFAULT_DOOH+"/liveContent";
            $.ajax({
                url: url,
                type: 'PUT',
                data: {liveContent_Id:_id,
                       userID:userID,
                       photoUrl:s3Url,
                       vjson:{state: picType}},
                success: function(response) {
                    if(response.message){
                        console.log("[Response] message:" + response.message);
                    }
                }
            });
            
            var url=DOMAIN+"fbItem/"+userID;
            $.ajax({
                url: url,
                type: 'POST',
                data: {s3Url: s3Url,
                       longPic: longPic,
                       type: picType,
                       liveTime: liveTime,
                       ugcCensorNo: ugcCensorNo},
                success: function(response) {
                    if(response.message){
                        console.log("[Response] message:" + response.message);
                    }
                }
            });
            
            
        });
        /* ------------------------------ends deprecated---------------------------------------------------*/
        
        $.get('/miix_admin/table_censorHistoryList_head.html', function(res){
            $('#table-content-header').html(res);
            // $('#table-content').html('');
        
            $('#createHistoryProgramListBtn').click(function(){
                // $('#table-content').html('');
                var flag = 0;
                var inputSearchData = {};
          
                $('#condition-inner input[class="createHistoryProgramListBtn"]').each(function(i){
          
                    inputSearchData[$(this).attr("name")] = $(this).val();
                    if($(this).val() == "" && flag == 0){
                        alert('請輸入完整的條件!!\n時間格式為2013/08/01 00:00:00');
                        flag = 1; 
                    }else{
                        conditions = inputSearchData;
                    }
                });
                FM.currentContent = FM.live_check;
                FM.currentContent.showCurrentPageContent();   
          
            });
        });
        
    
    }
        
};
