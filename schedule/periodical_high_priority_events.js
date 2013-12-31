var periodicalHighPriorityEvents =(function(){ 
    
    var TIME_INTERVALS = [ { startMinute: 0, endMinute: 10}, { startMinute: 30, endMinute: 35} ]; //in minutes
    
    return {
        isConflictedWith: function(timeIntervalToCheck) {
            
            
            var ti = {};
            var startDateObj = new Date(timeIntervalToCheck.start);
            var endDateObj = new Date(timeIntervalToCheck.end);
            ti.startMinute = startDateObj.getMinutes();
            ti.endMinute = endDateObj.getMinutes()+(endDateObj.getHours()-startDateObj.getHours())*60;
            
            for (var i=0; i<TIME_INTERVALS.length; i++){
                
                //NOTE: this check below is NOT able to handle the time interval like 4:55~5:05
                if ((   ( TIME_INTERVALS[i].startMinute < ti.startMinute ) && ( ti.startMinute < TIME_INTERVALS[i].endMinute )  ) ||
                    (   ( TIME_INTERVALS[i].startMinute < ti.endMinute ) && ( ti.endMinute < TIME_INTERVALS[i].endMinute )  ) ||
                    (   ( TIME_INTERVALS[i].startMinute <= ti.startMinute ) && ( ti.endMinute <= TIME_INTERVALS[i].endMinute )  ) ||
                    (   ( ti.startMinute <= TIME_INTERVALS[i].startMinute ) && ( TIME_INTERVALS[i].endMinute <= ti.endMinute )  )      ) {
                    
                    return true;
                }
            }
            
            return false;
        }
    };
    
})();

module.exports = periodicalHighPriorityEvents;
