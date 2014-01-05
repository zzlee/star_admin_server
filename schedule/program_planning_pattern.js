
var programPlanningPattern =(function(){    
    var i = -1;
    var DEFAULT_PROGRAM_SEQUENCE = [ "miix_it", "cultural_and_creative", "mood", "check_in" ]; 
    var programSequence = DEFAULT_PROGRAM_SEQUENCE;
    
    return {
        getProgramGenreToPlan: function(){
            i++;
            if (i >= programSequence.length){
                i = 0;
            }
            return programSequence[i];
        },
        
        resetIndex: function(){
            i = -1;
        },
        
        set: function(_programSequence){
            programSequence = _programSequence;
        },
        
        getProgramSequence: function(){
            return programSequence;    
        },
        
        remove: function(contentGenreToRemove){
            for (var i=0; i<programSequence.length; i++){
                if (programSequence[i]==contentGenreToRemove){
                    programSequence.splice(i, 1);
                    i--;
                }
            }
            
        }
    };
})()

module.exports = programPlanningPattern;