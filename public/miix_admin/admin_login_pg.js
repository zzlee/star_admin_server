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
