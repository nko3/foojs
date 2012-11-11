// Params are containers,
// which have a clock key { clock: {} }

// increments the counter for nodeId
exports.increment = function(container, nodeId) {
  if(container.clock) {
    container.clock[nodeId] = (typeof container.clock[nodeId] == 'undefined' ? 1 : container.clock[nodeId] + 1);
  }
  return container;
};

function allKeys(a, b){
  var last = null;
  return Object.keys(a)
    .concat(Object.keys(b))
    .sort()
    .filter(function(item) {
      // to make a set of sorted keys unique, just check that consecutive keys are different
      var isDuplicate = (item == last);
      last = item;
      return !isDuplicate;
    });
}


// like a regular sort function, returns:
// if a < b: -1
// if a == b: 0
// if a > b: 1
exports.compare = function(a, b) {
  var isGreater = false,
      isLess = false;

  allKeys(a.clock, b.clock).forEach(function(key) {
    var diff = (a.clock[key] || 0) - (b.clock[key] || 0);
    if(diff > 0) isGreater = true;
    if(diff < 0) isLess = true;
  });

  if(isGreater && isLess) return 0;
  if(isLess) return -1;
  if(isGreater) return 1;
  return 0; // neither is set, so equal
};

exports.isConcurrent = function(a, b) {
  return !!(exports.compare(a, b) == 0);
};

// given two vector clocks, returns a new vector clock with all values greater than
// those of the merged clocks
exports.merge = function(a, b) {
  var last = null, result = {};
  // allow this function to be called with objects that contain clocks, or the clocks themselves
  if(a.clock) a = a.clock;
  if(b.clock) b = b.clock;

  allKeys(a, b).forEach(function(key) {
    result[key] = Math.max(a[key] || 0, b[key] || 0);
  });

  return result;
};

exports.GT = 1;
exports.LT = -1;
exports.CONCURRENT = 0;
