
var FM = {PARSER:{}};


//create a time slot data : Start
FM.PARSER.createTimeSlot = function(start, end, fmRaw) {
	var slot = {}
	  , sDate = new Date(start)
	  , eDate = new Date(start);
	
	switch(fmRaw.mode) {
		case 'period':
			slot.start = sDate;
			slot.end = eDate;
			var sTime = fmRaw.start.toString().split(":")
			  , eTime = fmRaw.end.toString().split(":");
			sDate.setHours(sTime[0]);
			sDate.setMinutes(sTime[1]);
			sDate.setSeconds(sTime[2]);
			slot.start = sDate.getTime();
			eDate.setHours(eTime[0]);
			eDate.setMinutes(eTime[1]);
			eDate.setSeconds(eTime[2]);
			slot.end = eDate.getTime();
			break;
		default:
			var sTime = fmRaw.start.toString().split(":")
			  , eTime = fmRaw.end.toString().split(":");
			sDate.setHours(sTime[0]);
			sDate.setMinutes(sTime[1]);
			sDate.setSeconds(sTime[2]);
			slot.start = sDate.getTime();
			eDate.setHours(eTime[0]);
			eDate.setMinutes(eTime[1]);
			eDate.setSeconds(eTime[2]);
			slot.end = eDate.getTime();
			break;
	}	
	slot.sequence = fmRaw.sequence;
	slot.duration = fmRaw.duration;
	return slot;
};
//create a time slot data : End

//get day time : Start
FM.PARSER.getDayTime = function(start, end, fmRaw, callback) {
		var sDate = new Date(start)
		  , eDate = new Date(end)
		  , day = null
		  , next = new Date(start)
		  , sTime = fmRaw.start.toString().split(":");
		
		//time base point
		next.setHours(sTime[0]);
		next.setMinutes(sTime[1]);
		next.setSeconds(sTime[2]);
		
		if(next.getDay() > fmRaw.day) { 
			day = 7 - next.getDay() + fmRaw.day; 
			next.setDate(next.getDate() + day);
			if((next.getTime() >= sDate.getTime())&&(next.getTime() < eDate.getTime())) { callback(FM.PARSER.createTimeSlot(next, eDate, fmRaw)); }
		}
		else {
			day = fmRaw.day - next.getDay();
			next.setDate(next.getDate() + day);
			if((next.getTime() >= sDate.getTime())&&(next.getTime() < eDate.getTime())) { callback(FM.PARSER.createTimeSlot(next, eDate, fmRaw)); }
		}
		next.setDate(sDate.getDate() + 7);
		if((next.getTime() >= sDate.getTime())&&(next.getTime() < eDate.getTime())) { FM.PARSER.getDayTime(next, eDate, fmRaw, callback); }	//process.nextTick() : 非同步改善
}
//get day time : End

//get month time : Start
FM.PARSER.getMonthTime = function(start, end, fmRaw, callback) {
	var sDate = new Date(start)
	  , eDate = new Date(end)
	  , now = new Date(start)
	  , sTime = fmRaw.start.toString().split(":");
	
	//time base point
	now.setDate(fmRaw.date);
	now.setHours(sTime[0]);
	now.setMinutes(sTime[1]);
	now.setSeconds(sTime[2]);
	
	if(now.getMonth() < sDate.getMonth()) { now.setDate(fmRaw.date); }
	if((now < eDate)&&(now >= sDate)) {
		callback(FM.PARSER.createTimeSlot(now, eDate, fmRaw));
		now.setMonth(now.getMonth()+1);
		FM.PARSER.getMonthTime(now, eDate, fmRaw, callback);
	}
	else if(now < sDate) {
		now.setMonth(now.getMonth()+1);
		FM.PARSER.getMonthTime(now, eDate, fmRaw, callback);	//process.nextTick() : 非同步改善
	}
}
//get month time : End

//get period time : Start
FM.PARSER.getPeriodTime = function(start, end, fmRaw, callback) {
	var sDate = new Date(start)
	  , eDate = new Date(end)
	  //time base point for start and end
	  , pStartDate = new Date(fmRaw.start_date + " " + fmRaw.start)
	  , pEndDate = new Date(fmRaw.end_date + " " + fmRaw.end);
	
	if((sDate <= pStartDate)&&(pEndDate <= eDate)){
		while(pStartDate <= pEndDate) {
			callback(FM.PARSER.createTimeSlot(pStartDate, pEndDate, fmRaw));
			pStartDate.setDate(pStartDate.getDate()+1);
		}
	}
	else if((sDate > pStartDate)&&(pEndDate <= eDate)){
		while(sDate <= pEndDate) {
			callback(FM.PARSER.createTimeSlot(sDate, pEndDate, fmRaw));
			sDate.setDate(sDate.getDate()+1);
		}
	}
	else if((sDate <= pStartDate)&&(pEndDate > eDate)){
		while(pStartDate <= eDate) {
			callback(FM.PARSER.createTimeSlot(pStartDate, eDate, fmRaw));
			pStartDate.setDate(pStartDate.getDate()+1);
		}
	}
}
//get period time : End

//mode analytics : Test
FM.PARSER.modeAnalytics = function(start, end, data, callback) {
	var err = null
	  , slot = [];
	var toDo = function(info) {
		slot.push(info);
	};
    
    if(start > end){
		err = "error 'period'";
        callback(err, slot);
        return;
    }
    
	process.nextTick(function(){
		for(var i=0; i< data.length; i++) {
			switch(data[i].mode){
				case 'day':
					//console.log('day');
					FM.PARSER.getDayTime(start, end, data[i], toDo);
					break;
				case 'month':
					//console.log('month');
					FM.PARSER.getMonthTime(start, end, data[i], toDo);
					break;
				case 'period':
					//console.log('period');
					FM.PARSER.getPeriodTime(start, end, data[i], toDo);
					break;
			}
		}
        callback(err, slot);
	});
}
//mode analytics : End

//v1.2
FM.PARSER.getTimeSlot = function(period, fmRaw, callback) {
	var startDate = new Date(period.start)
	  , endDate = new Date(period.end);
      
	FM.PARSER.modeAnalytics(startDate.getTime(), endDate.getTime(), fmRaw, callback);
}

module.exports = FM.PARSER;