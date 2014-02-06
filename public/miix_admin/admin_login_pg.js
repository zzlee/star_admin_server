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
				console.log("Input: " + JSON.stringify(inputData) );
				if(inputData.id && inputData.password){
					$.get(url, inputData, function(res, textStatus){
						if(res.token && res.role){
							localStorage.token = res.token;
							localStorage.role = res.role;
							location.reload();
						}else{
							console.log("[Response of Login] message:" + res.message);
						}
					});
				}//end of if(inputData.id && inputData.password)

		}//end of event.keyCode
	});//end of keyup
    
});


