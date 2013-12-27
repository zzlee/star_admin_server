

//var ProgramGroup = function(v1) {
//    this.v1 = v1;
//};
//
//ProgramGroup.prototype.method1 = function() {
//    console.log("this.v1 = %s", this.v1);
//};



/**
 * constructor
 * 
 * @param {Object} interval An object specifying the starting and ending of  
 *     of the time interval which this program group covers   
 *     <ul>
 *     <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     </ul>
 *     For example, {start: 1371861000000, end: 1371862000000} 
 *     
 * @param {Object} options specifying the some options:
 *     <ul>
 *     <li>programGroupTemplate: the id of Program Group Template which it use.  Set it null if we don't use any Program Group Template
 *     </ul>
 *     For example, {start: 1371861000000, end: 1371862000000} 
 */
var ProgramGroup = function(interval, options) {
    this.interval = interval;
    this.options = options;
};

ProgramGroup.prototype.generateByTemplate = function(cbOfgenerate) {
    var _this = this;
    
};


module.exports = ProgramGroup;