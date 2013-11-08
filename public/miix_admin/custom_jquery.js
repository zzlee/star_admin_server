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




//Login 
$(document).ready(function(){
    $("#login-btn").click(function(){
        var inputData = {};
        var url = DOMAIN + "login";
        $('#login-inner input[class="login-inp"]').each(function(){
            //console.log("item: " + $(this).val());
            inputData[$(this).attr("name")] = $(this).val();
        });
        console.log("Input: " + JSON.stringify(inputData) );
        if(inputData.id && inputData.password){
            $.get(url, inputData, function(res, textStatus){
                if(res.token && res.role){
                    localStorage.token = res.token;
                    localStorage.role = res.role;
                    location.reload();
                }
                else{
                    console.log("[Response of Login] message:" + res.message);
                }
            });
        }        

    });

    $("#logoutBtn").click(function(){
        $.get(DOMAIN + "logout", function(res){
            delete localStorage.token;
            delete localStorage.role;
            location.reload();
        });
    });


});

//Main Page 
$(document).ready(function(){
    FM.memberList = new PageList( 'memberList', 8, '/miix_admin/members');
    FM.miixPlayList = new PageList( 'miixMovieList', 10, '/miix_admin/miix_movies');
    FM.storyPlayList = new PageList( 'storyMovieList', 8, '/miix_admin/story_movies');
    FM.UGCList = new PageList( 'ugcCensorMovieList', 10, '/miix_admin/ugc_censor'); 
    FM.UGCPlayList = new PageList( 'ugcCensorPlayList', 10, '/miix_admin/doohs/'+DEFAULT_DOOH+'/timeslots');
    FM.historyList = new PageList( 'historyList', 15, '/miix_admin/sessions/ ');
    FM.highlightList = new PageList( 'highlightList', 10, '/miix_admin/highlight');
	FM.live_check = new PageList( 'live_check',10,'/miix_admin/dooh/'+DEFAULT_DOOH+'/liveContent',function(res){
	console.log('');
	console.dir(res);
	//alert(res);
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
		//title_td1.html("aaa");
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
		
if(i%2==0){
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

var FailboxInput = $("<input>").attr({
		 type:"radio",
         id:"failbox",
         class:"bad",
         "fbUserId":res[i].fbUserId,
         "programTimeSlot_id":res[i].programTimeSlot_id,
         "ugcCensorNo":res[i].ugcCensorNo,
         "liveState":res[i].liveState,
         "ownerId_id":res[i].ownerId_id
		                             });


                                     





FailboxForm.append(FailboxInput);


//---------  'fail' checkbox  click--------------

if(res[i].liveState=="incorrect"){
	FailboxInput.hide();
	FailboxForm.append("<b style='color:red'>失敗(done)<b>");

}else{
	FailboxForm.append("失敗")
}
//----------------end 'fail' checkbox  click-----

tbody.append(tr);
tr.append(td_1);
FailboxForm.appendTo(td_1);
tr.append(td_2);
tr.append(td_3);
//tr.append(td_4);
// table.html("test");

if(res[i].liveContent.length == 0){
var tr_for_null = $("<tr>");
  
tr.append(tr_for_null);
}


for(var j=0;j<res[i].liveContent.length;j++){
	//alert("a");
	
	//for(var k=0;k<res[i].liveContent.url.livePhotos.length;k++)
	
	var div_live = $("<div>");
	
	if(res[i].liveContent[j].url.livePhotos){ //determine livePhotos or not
	for(var k=0;k<res[i].liveContent[j].url.livePhotos.length;k++){
	//alert("!");
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
        "_id":res[i].liveContent[j]._id, //_id
		"liveTime":res[i].liveContent[j].liveTime,
		"ugcCensorNo":res[i].ugcCensorNo,
        "_type":"correct"});

		
		linkS3.append(inner_img);
     span_img.append(linkS3);
	 span_img.append(boxForChoose);
	 
div_live.append(span_img);	  
if(k==3){
div_live.append("<br>");
}
	  }
var tr_4=$("<tr>").html(div_live);//"live ugc, 編號+日期+圖+按鈕(靠右的))"
	  
	  }else{
	  
	  
	  
	var linkS3=$("<a>").attr({href:res[i].liveContent[j].url.s3,
		                      target:"_blank"});
	var live_img=$("<img>").attr({src:res[i].liveContent[j].url.s3,
		                           width:"330",
		                           height:"200"});
								   
	
	linkS3.append(live_img);
	var tr_4=$("<tr>").html(linkS3);//"live ugc, 編號+日期+圖+按鈕(靠右的))"
	  
	  
}
	
	
	
	
	
	
	
	var post_live_time=new Date(parseInt(res[i].liveContent[j].liveTime));
	var post_year=post_live_time.getFullYear();
	var post_month=post_live_time.getMonth()+1;
	var post_date=post_live_time.getDate();
	var post_hours=post_live_time.getHours();
	var post_minutes=post_live_time.getMinutes();
	var timeString=post_year+"/"+post_month+"/"+post_date+"  "+post_hours+":"+post_minutes;
	
	
	
	var sp=$("<span>").attr({style:"vertical-align:460%"}).html(res[i].liveContent[j].no+"  		│   "+timeString); //sp是編號+日期
	
	
	
	var boxForm = $("<form>").attr({style:"display: inline-block;vertical-align:400%"});
	var boxInput = $("<input>").attr({type:"radio",
		                              name:"yo",
		                              value:"ha",
		                              checked:"checked"});
									  
	//---------------------- deprecated, 因為要一次拍五張 五選一--------------------------------------------								  
	var boxInput2 = $("<input>").attr({type:"radio",
		id:"boxCheckLive",
		class:"good",
        name:"yo",
        value:res[i].liveContent[j].ownerId.userID,
        "s3url":res[i].liveContent[j].url.s3,
		"longPic":res[i].liveContent[j].url.longPhoto,
        "_id":res[i].liveContent[j]._id,
		"liveTime":res[i].liveContent[j].liveTime,
		"ugcCensorNo":res[i].ugcCensorNo,
        "_type":"correct"});
	
	 
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
	
	if(!res[i].liveContent[j].url.livePhotos){  //determine livePhotos to show radio button
if(res[i].liveContent[j].state=="correct"){
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
	boxForm.append("<b style='color:blue'>成功(done)<b>");
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
	//boxForm.append("<br>");
	//boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
	//boxForm.append(boxInput3);
	//boxForm.append("失敗");
	/* ends of radio box */
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
		// tr.append("<hr>");
		
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
	//boxForm.append(boxInput);
	//boxForm.append("default");
	//boxForm.append("<br>");
	//boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
	//boxForm.append(boxInput2);
	//boxForm.append("正確");
	//boxForm.append("<br>");
	//boxForm.append("&nbsp;&nbsp;&nbsp;&nbsp;");
	//boxForm.append(boxInput3);
	//boxForm.append("失敗");
	/* ends of radio box */
	tr_4.prepend(sp);
	tr.append(tr_4);
	//tr.append(boxForm);
	//boxForm.appendTo(tr_4)
	tr.append("<br>");
	
	 if(j!=res[i].liveContent.length-1){
	 tr.append("<hr>");
	 }
	
	tr.append("<br>");
}
}
	
	



}

//form.append(table);
	}
	
	
	//-------------for fail 最左邊--------------------------------------
	 $("#failbox.bad").click(function(){
		  //alert("g");
		  
		  
		  var forComfirm=confirm("你按下的是 ***失敗***\n辛苦囉 ~~~!!");
		  if (forComfirm==true)
		    {
		  // alert("good");
		    }
		  else
		    {
		   //alert("><");
		   return false;
		    }
		  
		  
	    	var _id=$(this).attr("programTimeSlot_id");
	    	var liveState="incorrect";
			var ugcCensorNo=$(this).attr("ugcCensorNo");
			var fbUserId=$(this).attr("fbUserId");
			var ownerId_id=$(this).attr("ownerId_id");
	    	
	    	console.log("programTimeSlot_id:"+_id+"\nfbUserId:"+fbUserId+"\nliveState:"+liveState);
	    	
	    	var url=DOMAIN+"dooh/"+DEFAULT_DOOH+"/programTimeSlot";
	    	$.ajax({
               url: url,
               type: 'PUT',
               data: {programTimeSlot_Id:_id,
            	   fbUserId:fbUserId,
            	   vjson:{liveState: liveState}
               	 },
               success: function(response) {
                   if(response.message){
                       console.log("[Response] message:" + response.message);
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
                       console.log("[Response] message:" + response.message);
                   }
               }
           });
	    	
	    });
	//--------- end 最左邊 fail-----------
	
	 
	/* ------------------------------  最右邊正確紐---------------------------------------------------*/
	  $("#boxCheckLive.good").click(function(){
		  //alert("g");
		  
		  
		  var forComfirm=confirm("你按下的是 ***正確***\n送出就沒有後悔的餘地\n觀棋不語真君子，起手無回大丈夫\n多謝!!");
		  if (forComfirm==true)
		    {
		  // alert("good");
		    }
		  else
		    {
		   //alert("><");
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
	    	
	    	var url=DOMAIN+"dooh/"+DEFAULT_DOOH+"/liveContent";
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
	    	
	    });
		/* ------------------------------ end 最右邊正確紐---------------------------------------------------*/
	 /* ------------------------------  最右邊五選一紐---------------------------------------------------*/
	  $(".chooseOne").click(function(){
		  console.log($(this));
		  //alert("g");
		  
		  
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
		  // alert("good");
		    }
		  else
		    {
		   //alert("><");
		   return false;
		    }
	    	
	    	var url=DOMAIN+"dooh/"+DEFAULT_DOOH+"/liveContent";
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
	    	
	    });
		/* ------------------------------ end 五選一紐---------------------------------------------------*/
		
		/* ------------------------------ deprecated---------------------------------------------------*/
	  $("#boxCheckLive.bad").click(function(){
		  // alert("b");
		  
		  
		 
		  var forComfirm=confirm("你按下的是 ***失敗***\n送出就沒有後悔的餘地\n觀棋不語真君子，起手無回大丈夫\n多謝!!");
		  if (forComfirm==true)
		    {
		   //alert("good");
		    }
		  else
		    {
		   //alert("><");
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
	    	
	    	var url=DOMAIN+"dooh/"+DEFAULT_DOOH+"/liveContent";
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
                      //conditions = inputSearchData;
                      FM.live_check.setConditions(inputSearchData);
                  }
              });
              FM.currentContent = FM.live_check;
              FM.currentContent.showCurrentPageContent();   

          });
	  });
	  
	
	});

    
    
    

    $('#memberListBtn').click( memberListSubPg.loadPage );


    $('#miixPlayListBtn').click(function(){
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#miixPlayList').attr("class", "current");

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

    });
	

    $('#UGCPlayListBtn').click( UGCPlayListSubPg.loadInitialPage );

    $('#historyListBtn').click(function(){
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#historyList').attr("class", "current");

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
    
    
  
    
    // Ajax ---------------------------------------------------------------------    
    $(document).ajaxComplete(function(event,request, settings) {

        var censorCheck = settings.url.substring(0,22);
        var historyCheck = settings.url.substring(0,20);
        var highlightCheck = settings.url.substring(0,21);
        
        //== access control ==
        if ( localStorage.role == "SUPER_ADMINISTRATOR" ) {
            $('#createProgramListBtn').show();
            //$('#ugcCensor').show();
            $("input[id='ugcCensor']").show();
            $('#traceWindow').show();
        }
        else if ( localStorage.role == "OPERATOR" ) {
            $('#createProgramListBtn').hide();
            $("input[id='ugcCensor']").hide();
            $('#pushProgramsBtn').remove();
            $('#traceWindow').hide();
        }


        /**
         * UGCList
         */
        if(censorCheck == '/miix_admin/ugc_censor'){
            /**
             * 查詢影片 click
             */
            var conditions;
            
            $('#ugcSearchBtn').click(function(){
                var inputSearchData = {};
                $('#condition-inner input[class="ugcSearchBtn"]').each(function(){
                    inputSearchData = {'no':$(this).val()};
                    conditions = inputSearchData;
                    
                });
                if(inputSearchData != null){
				    $('#table-content').html('<br> <br>審查名單準備中，請稍候....');
                    FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor');
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
                    FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor');
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
                    FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor');
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
                FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor');
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
                    FM.UGCList = new PageList( 'ugcCensorMovieList', 5, '/miix_admin/ugc_censor');
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

        }// End of UGCList

        
        /**
         * HistoryList
         */
        if(historyCheck == '/miix_admin/sessions'){
            $('#history._idSetBtn').click(function(){
                sessionItemInfo = $(this).attr("name");
                sessionItemInfoArray = sessionItemInfo.split(',');

                $.get('/miix_admin/table_censorPlayList_head.html', function(res){
                    
                    sessionId = sessionItemInfoArray[0];
                    
                    $('#table-content-header').html(res);
                    $('#timeStartText').attr('value', sessionItemInfoArray[1]);
                    $('#timeEndText').attr('value', sessionItemInfoArray[2]);
                    $('#playTimeStartText').attr('value', sessionItemInfoArray[3]);
                    $('#playTimeEndText').attr('value', sessionItemInfoArray[4]);
                    $('#sequenceText').attr('value', sessionItemInfoArray[5]);

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
        var pageNo = parseInt($("#pageNoInput").attr('value'));
        if (pageNo){
            if ( pageNo < 1) {
                pageNo = 1;
            }
            else if ( pageNo > FM.currentContent.totalPageNumber ){
                pageNo = FM.currentContent.totalPageNumber;
            }
            FM.currentContent.showPageContent(pageNo);
            FM.currentContent.currentPage=pageNo;
            $("#pageNoInput").attr('value',pageNo);
        }
        else{
            $("#pageNoInput").attr('value', FM.currentContent.currentPage);
        }
    });



    $('input#rowsPerPage').change(function(){
        var rowsPerPage = parseInt($('input#rowsPerPage').attr('value'));
        if (rowsPerPage){
            if ( rowsPerPage < 1) {
                rowsPerPage = 1;
            }
            FM.currentContent.setRowsPerPage(rowsPerPage);
        }
        else{
            $('input#rowsPerPage').attr('value', FM.currentContent.rowsPerPage);
        }
    });


    //== access control ==
    if ( localStorage.role == "SUPER_ADMINISTRATOR" ) {
        $('#memberList').show();
        $('#miixPlayList').show();
        $('#storyPlayList').show();
        $('#UGCList').show();
        $('#highlightList').show();
        $('#live_check').show();
        FM.currentContent = FM.memberList;
        $('#memberListBtn').click();

    }
    else if ( localStorage.role == "OPERATOR" ) {
        $('#memberList').hide();
        $('#miixPlayList').hide();
        $('#storyPlayList').hide();
        $('#UGCList').hide();
        $('#highlightList').hide();
        $('#live_check').hide();
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
    $('#product-table	tr').hover(function () {
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

