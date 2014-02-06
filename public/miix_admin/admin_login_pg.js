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

	$("#password").keyup(function(event){
		if(event.keyCode == 13){
			var inputData = {};
				var url = DOMAIN + "login";
				$('#login-inner input[class="login-inp"]').each(function(){
					inputData[$(this).attr("name")] = $(this).val();
				});
				//console.log("Input: " + JSON.stringify(inputData) );
				if(inputData.id && inputData.password){
					$.ajax({
						url : url,
						data : inputData,
						type : "GET",
						success: function(res){
									if(res.token && res.role){
										localStorage.token = res.token;
										localStorage.role = res.role;
										location.reload();
									}else{
										console.log("[Response of Login] message:" + res.message);
									}
								},
						statusCode : {
							401 : function(){
								alert("密碼或帳號有錯，請重新輸入");
							}
						}
					});//End of ajax
				}//end of if(inputData.id && inputData.password)

		}//end of event.keyCode
	});//end of keyup
    
});


