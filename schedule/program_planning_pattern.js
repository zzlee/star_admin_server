var DEFAULT_PROGRAM_SEQUENCE = [ "miix_it", "cultural_and_creative", "mood", "check_in" ]; 

var ProgramPlanningPattern = function(programSequence){
    if (programSequence) {
        this.programSequence = programSequence;
    }
    else {
        this.programSequence = DEFAULT_PROGRAM_SEQUENCE;
    }
    this.index = 0;
};

ProgramPlanningPattern.prototype = {
    getProgramGenreToPlan: function(){
        this.index++;
        if (this.index >= this.programSequence.length){
            this.index = 0;
        }
        return this.programSequence[this.index];
    },
    
    resetIndex: function(){
        this.index = -1;
    },
    
    set: function(_programSequence){
        this.programSequence = _programSequence;
    },
    
    getProgramSequence: function(){
        return this.programSequence;    
    },
    
    remove: function(contentGenreToRemove){
        for (var i=0; i<this.programSequence.length; i++){
            if (this.programSequence[i]==contentGenreToRemove){
                this.programSequence.splice(i, 1);
                i--;
            }
        }
        
    }
};

module.exports = ProgramPlanningPattern;