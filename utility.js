
var utility = {};

utility.pad = function(n, width, z) { //function for padding the number n with character z 
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

utility.getLocalTimeString = function(dateObj) {
    
    var year = utility.pad(dateObj.getFullYear(), 4).toString(); 
    var month = utility.pad(dateObj.getMonth()+1, 2).toString();
    var day = utility.pad(dateObj.getDate(), 2).toString();
    var hour = utility.pad(dateObj.getHours(), 2).toString();
    var minute = utility.pad(dateObj.getMinutes(), 2).toString();
    var second = utility.pad(dateObj.getSeconds(), 2).toString();
    
    return year + month + day + 't' + hour + minute + second;    
};

//test 
//var d = new Date(1389681660000);
//console.log(utility.getLocalTimeString(d));

module.exports = utility;