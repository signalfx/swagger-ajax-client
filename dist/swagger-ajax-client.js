!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.swaggerAjaxClient=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var Promise = _dereq_("./promise/promise").Promise;
var polyfill = _dereq_("./promise/polyfill").polyfill;
exports.Promise = Promise;
exports.polyfill = polyfill;
},{"./promise/polyfill":6,"./promise/promise":7}],3:[function(_dereq_,module,exports){
"use strict";
/* global toString */

var isArray = _dereq_("./utils").isArray;
var isFunction = _dereq_("./utils").isFunction;

/**
  Returns a promise that is fulfilled when all the given promises have been
  fulfilled, or rejected if any of them become rejected. The return promise
  is fulfilled with an array that gives all the values in the order they were
  passed in the `promises` array argument.

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.resolve(2);
  var promise3 = RSVP.resolve(3);
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `RSVP.all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.reject(new Error("2"));
  var promise3 = RSVP.reject(new Error("3"));
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @for RSVP
  @param {Array} promises
  @param {String} label
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
*/
function all(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to all.');
  }

  return new Promise(function(resolve, reject) {
    var results = [], remaining = promises.length,
    promise;

    if (remaining === 0) {
      resolve([]);
    }

    function resolver(index) {
      return function(value) {
        resolveAll(index, value);
      };
    }

    function resolveAll(index, value) {
      results[index] = value;
      if (--remaining === 0) {
        resolve(results);
      }
    }

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && isFunction(promise.then)) {
        promise.then(resolver(i), reject);
      } else {
        resolveAll(i, promise);
      }
    }
  });
}

exports.all = all;
},{"./utils":11}],4:[function(_dereq_,module,exports){
(function (process,global){
"use strict";
var browserGlobal = (typeof window !== 'undefined') ? window : {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

// node
function useNextTick() {
  return function() {
    process.nextTick(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function() {
    node.data = (iterations = ++iterations % 2);
  };
}

function useSetTimeout() {
  return function() {
    local.setTimeout(flush, 1);
  };
}

var queue = [];
function flush() {
  for (var i = 0; i < queue.length; i++) {
    var tuple = queue[i];
    var callback = tuple[0], arg = tuple[1];
    callback(arg);
  }
  queue = [];
}

var scheduleFlush;

// Decide what async method to use to triggering processing of queued callbacks:
if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else {
  scheduleFlush = useSetTimeout();
}

function asap(callback, arg) {
  var length = queue.push([callback, arg]);
  if (length === 1) {
    // If length is 1, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    scheduleFlush();
  }
}

exports.asap = asap;
}).call(this,_dereq_("xp4SSG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"xp4SSG":1}],5:[function(_dereq_,module,exports){
"use strict";
var config = {
  instrument: false
};

function configure(name, value) {
  if (arguments.length === 2) {
    config[name] = value;
  } else {
    return config[name];
  }
}

exports.config = config;
exports.configure = configure;
},{}],6:[function(_dereq_,module,exports){
(function (global){
"use strict";
/*global self*/
var RSVPPromise = _dereq_("./promise").Promise;
var isFunction = _dereq_("./utils").isFunction;

function polyfill() {
  var local;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof window !== 'undefined' && window.document) {
    local = window;
  } else {
    local = self;
  }

  var es6PromiseSupport = 
    "Promise" in local &&
    // Some of these methods are missing from
    // Firefox/Chrome experimental implementations
    "resolve" in local.Promise &&
    "reject" in local.Promise &&
    "all" in local.Promise &&
    "race" in local.Promise &&
    // Older version of the spec had a resolver object
    // as the arg rather than a function
    (function() {
      var resolve;
      new local.Promise(function(r) { resolve = r; });
      return isFunction(resolve);
    }());

  if (!es6PromiseSupport) {
    local.Promise = RSVPPromise;
  }
}

exports.polyfill = polyfill;
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./promise":7,"./utils":11}],7:[function(_dereq_,module,exports){
"use strict";
var config = _dereq_("./config").config;
var configure = _dereq_("./config").configure;
var objectOrFunction = _dereq_("./utils").objectOrFunction;
var isFunction = _dereq_("./utils").isFunction;
var now = _dereq_("./utils").now;
var all = _dereq_("./all").all;
var race = _dereq_("./race").race;
var staticResolve = _dereq_("./resolve").resolve;
var staticReject = _dereq_("./reject").reject;
var asap = _dereq_("./asap").asap;

var counter = 0;

config.async = asap; // default async is asap;

function Promise(resolver) {
  if (!isFunction(resolver)) {
    throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
  }

  if (!(this instanceof Promise)) {
    throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
  }

  this._subscribers = [];

  invokeResolver(resolver, this);
}

function invokeResolver(resolver, promise) {
  function resolvePromise(value) {
    resolve(promise, value);
  }

  function rejectPromise(reason) {
    reject(promise, reason);
  }

  try {
    resolver(resolvePromise, rejectPromise);
  } catch(e) {
    rejectPromise(e);
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value, error, succeeded, failed;

  if (hasCallback) {
    try {
      value = callback(detail);
      succeeded = true;
    } catch(e) {
      failed = true;
      error = e;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (handleThenable(promise, value)) {
    return;
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    resolve(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

var PENDING   = void 0;
var SEALED    = 0;
var FULFILLED = 1;
var REJECTED  = 2;

function subscribe(parent, child, onFulfillment, onRejection) {
  var subscribers = parent._subscribers;
  var length = subscribers.length;

  subscribers[length] = child;
  subscribers[length + FULFILLED] = onFulfillment;
  subscribers[length + REJECTED]  = onRejection;
}

function publish(promise, settled) {
  var child, callback, subscribers = promise._subscribers, detail = promise._detail;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    invokeCallback(settled, child, callback, detail);
  }

  promise._subscribers = null;
}

Promise.prototype = {
  constructor: Promise,

  _state: undefined,
  _detail: undefined,
  _subscribers: undefined,

  then: function(onFulfillment, onRejection) {
    var promise = this;

    var thenPromise = new this.constructor(function() {});

    if (this._state) {
      var callbacks = arguments;
      config.async(function invokePromiseCallback() {
        invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
      });
    } else {
      subscribe(this, thenPromise, onFulfillment, onRejection);
    }

    return thenPromise;
  },

  'catch': function(onRejection) {
    return this.then(null, onRejection);
  }
};

Promise.all = all;
Promise.race = race;
Promise.resolve = staticResolve;
Promise.reject = staticReject;

function handleThenable(promise, value) {
  var then = null,
  resolved;

  try {
    if (promise === value) {
      throw new TypeError("A promises callback cannot return that same promise.");
    }

    if (objectOrFunction(value)) {
      then = value.then;

      if (isFunction(then)) {
        then.call(value, function(val) {
          if (resolved) { return true; }
          resolved = true;

          if (value !== val) {
            resolve(promise, val);
          } else {
            fulfill(promise, val);
          }
        }, function(val) {
          if (resolved) { return true; }
          resolved = true;

          reject(promise, val);
        });

        return true;
      }
    }
  } catch (error) {
    if (resolved) { return true; }
    reject(promise, error);
    return true;
  }

  return false;
}

function resolve(promise, value) {
  if (promise === value) {
    fulfill(promise, value);
  } else if (!handleThenable(promise, value)) {
    fulfill(promise, value);
  }
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = value;

  config.async(publishFulfillment, promise);
}

function reject(promise, reason) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = reason;

  config.async(publishRejection, promise);
}

function publishFulfillment(promise) {
  publish(promise, promise._state = FULFILLED);
}

function publishRejection(promise) {
  publish(promise, promise._state = REJECTED);
}

exports.Promise = Promise;
},{"./all":3,"./asap":4,"./config":5,"./race":8,"./reject":9,"./resolve":10,"./utils":11}],8:[function(_dereq_,module,exports){
"use strict";
/* global toString */
var isArray = _dereq_("./utils").isArray;

/**
  `RSVP.race` allows you to watch a series of promises and act as soon as the
  first promise given to the `promises` argument fulfills or rejects.

  Example:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 2");
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // result === "promise 2" because it was resolved before promise1
    // was resolved.
  });
  ```

  `RSVP.race` is deterministic in that only the state of the first completed
  promise matters. For example, even if other promises given to the `promises`
  array argument are resolved, but the first completed promise has become
  rejected before the other promises became fulfilled, the returned promise
  will become rejected:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error("promise 2"));
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // Code here never runs because there are rejected promises!
  }, function(reason){
    // reason.message === "promise2" because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  @method race
  @for RSVP
  @param {Array} promises array of promises to observe
  @param {String} label optional string for describing the promise returned.
  Useful for tooling.
  @return {Promise} a promise that becomes fulfilled with the value the first
  completed promises is resolved with if the first completed promise was
  fulfilled, or rejected with the reason that the first completed promise
  was rejected with.
*/
function race(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to race.');
  }
  return new Promise(function(resolve, reject) {
    var results = [], promise;

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && typeof promise.then === 'function') {
        promise.then(resolve, reject);
      } else {
        resolve(promise);
      }
    }
  });
}

exports.race = race;
},{"./utils":11}],9:[function(_dereq_,module,exports){
"use strict";
/**
  `RSVP.reject` returns a promise that will become rejected with the passed
  `reason`. `RSVP.reject` is essentially shorthand for the following:

  ```javascript
  var promise = new RSVP.Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  var promise = RSVP.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @for RSVP
  @param {Any} reason value that the returned promise will be rejected with.
  @param {String} label optional string for identifying the returned promise.
  Useful for tooling.
  @return {Promise} a promise that will become rejected with the given
  `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Promise = this;

  return new Promise(function (resolve, reject) {
    reject(reason);
  });
}

exports.reject = reject;
},{}],10:[function(_dereq_,module,exports){
"use strict";
function resolve(value) {
  /*jshint validthis:true */
  if (value && typeof value === 'object' && value.constructor === this) {
    return value;
  }

  var Promise = this;

  return new Promise(function(resolve) {
    resolve(value);
  });
}

exports.resolve = resolve;
},{}],11:[function(_dereq_,module,exports){
"use strict";
function objectOrFunction(x) {
  return isFunction(x) || (typeof x === "object" && x !== null);
}

function isFunction(x) {
  return typeof x === "function";
}

function isArray(x) {
  return Object.prototype.toString.call(x) === "[object Array]";
}

// Date.now is not available in browsers < IE9
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
var now = Date.now || function() { return new Date().getTime(); };


exports.objectOrFunction = objectOrFunction;
exports.isFunction = isFunction;
exports.isArray = isArray;
exports.now = now;
},{}],12:[function(_dereq_,module,exports){
module.exports = _dereq_('./src/createClient');
},{"./src/createClient":20}],13:[function(_dereq_,module,exports){
'use strict';

function DataTypeValidationError(message){
  this.name = 'DataTypeValidationError';
  this.message = message || 'Invalid data type';
}
DataTypeValidationError.prototype = Object.create(Error.prototype);
DataTypeValidationError.prototype.constructor = DataTypeValidationError;
exports.DataTypeValidationError = DataTypeValidationError;

function NotAnIntegerError(value){
  this.name = 'NotAnIntegerError';
  this.message = '"' + value + '" is not an integer';
  this.value = value;
}
NotAnIntegerError.prototype = Object.create(DataTypeValidationError.prototype);
NotAnIntegerError.prototype.constructor = NotAnIntegerError;
exports.NotAnIntegerError = NotAnIntegerError;

function NotANumberError(value, actualType){
  this.name = 'NotANumberError';
  this.message = '"' + value + '" is not a number';
  if(actualType) this.message += ' (got a ' + actualType + ' instead)';

  this.value = value;
}
NotANumberError.prototype = Object.create(DataTypeValidationError.prototype);
NotANumberError.prototype.constructor = NotANumberError;
exports.NotANumberError = NotANumberError;

function NumberTooLargeError(value, max){
  this.name = 'NumberTooLargeError';
  this.message = '"' + value + '" is above the maximum of ' + max.toString();
  this.value = value;
}
NumberTooLargeError.prototype = Object.create(DataTypeValidationError.prototype);
NumberTooLargeError.prototype.constructor = NumberTooLargeError;
exports.NumberTooLargeError = NumberTooLargeError;

function NumberTooSmallError(value, max){
  this.name = 'NumberTooSmallError';
  this.message = '"' + value + '" is above the maximum of ' + max.toString();
  this.value = value;
}
NumberTooSmallError.prototype = Object.create(DataTypeValidationError.prototype);
NumberTooSmallError.prototype.constructor = NumberTooSmallError;
exports.NumberTooSmallError = NumberTooSmallError;

function NotABooleanError(value, actualType){
  this.name = 'NotABooleanError';
  this.message = '"' + value + '" is not a boolean';
  if(actualType) this.message += ' (got a ' + actualType + ' instead)';

  this.value = value;
}
NotABooleanError.prototype = Object.create(DataTypeValidationError.prototype);
NotABooleanError.prototype.constructor = NotABooleanError;
exports.NotABooleanError = NotABooleanError;

function NotAnArrayError(value, actualType){
  this.name = 'NotAnArrayError';
  this.message = '"' + value + '" is not an array';
  if(actualType) this.message += ' (got a ' + actualType + ' instead)';

  this.value = value;
}
NotAnArrayError.prototype = Object.create(DataTypeValidationError.prototype);
NotAnArrayError.prototype.constructor = NotAnArrayError;
exports.NotAnArrayError = NotAnArrayError;

function DuplicateInSetError(arr, dupes){
  this.name = 'DuplicateInSetError';
  this.message = 'Duplicates ("' + dupes.join('", "') + '") found in set: ["' + arr.join('", "') + '"';
  this.dupes = dupes;
  this.value = arr;
}
DuplicateInSetError.prototype = Object.create(DataTypeValidationError.prototype);
DuplicateInSetError.prototype.constructor = DuplicateInSetError;
exports.DuplicateInSetError = DuplicateInSetError;

function NotVoidError(value, actualType){
  this.name = 'NotVoidError';
  this.message = '"' + value + '" is not null or undefined';
  if(actualType) this.message += ' (got a ' + actualType + ' instead)';

  this.value = value;
}
NotVoidError.prototype = Object.create(DataTypeValidationError.prototype);
NotVoidError.prototype.constructor = NotVoidError;
exports.NotVoidError = NotVoidError;

function NotAStringError(value, actualType){
  this.name = 'NotAStringError';
  this.message = '"' + value + '" is not a string';
  if(actualType) this.message += ' (got a ' + actualType + ' instead)';

  this.value = value;
}
NotAStringError.prototype = Object.create(DataTypeValidationError.prototype);
NotAStringError.prototype.constructor = NotAStringError;
exports.NotAStringError = NotAStringError;

function StringNotInEnumError(value, acceptableValues){
  this.name = 'StringNotInEnumError';
  this.message = '"' + value + '" is not an acceptable value: "' + acceptableValues.join('", "') + '"';
 
  this.value = value;
}
StringNotInEnumError.prototype = Object.create(DataTypeValidationError.prototype);
StringNotInEnumError.prototype.constructor = StringNotInEnumError;
exports.StringNotInEnumError = StringNotInEnumError;


function ErrorsInArrayElementsError(errors){
  this.name = 'ErrorsInArrayElementsError';
  this.message = 'Errors in array elements:\n\t' + errors.join(',\n\t');
  this.errors = errors;
}
ErrorsInArrayElementsError.prototype = Object.create(DataTypeValidationError.prototype);
ErrorsInArrayElementsError.prototype.constructor = ErrorsInArrayElementsError;
exports.ErrorsInArrayElementsError = ErrorsInArrayElementsError;

function MissingValueError(){
  this.name = 'MissingValueError';
  
  this.message = 'This value is required but missing';
}
MissingValueError.prototype = Object.create(DataTypeValidationError.prototype);
MissingValueError.prototype.constructor = MissingValueError;
exports.MissingValueError = MissingValueError;

function ValidationError(specName, spec, error){
  this.name = 'ValidationError';
  this.specName = specName;
  this.spec = spec;
  this.error = error;

  this.message = specName + ' is invalid: ' + error.message;
}
ValidationError.prototype = Object.create(DataTypeValidationError.prototype);
ValidationError.prototype.constructor = ValidationError;
exports.ValidationError = ValidationError;

function ValidationErrors(value, specName, spec, errors){
  this.name = 'ValidationErrors';

  this.value = value;
  this.specName = specName;
  this.spec = spec;
  this.errors = errors || [];

  this.message = specName + ' is invalid';

  if(this.errors.length){
    this.message += ':\n\t' + this.errors.map(function(e){ return e.message; }).join('\n\t');
  }
}
ValidationErrors.prototype = Object.create(DataTypeValidationError.prototype);
ValidationErrors.prototype.constructor = ValidationErrors;
exports.ValidationErrors = ValidationErrors;

},{}],14:[function(_dereq_,module,exports){
exports.dataType = _dereq_('./validateDataType');
exports.model = _dereq_('./validateModel');
exports.operation = _dereq_('./validateOperation');
exports.array = _dereq_('./validateArray');
exports.errors = _dereq_('./errorTypes');

var primitives = _dereq_('./validatePrimitiveTypes');
exports.primitive = {
  integer: primitives.validateInteger,
  number: primitives.validateNumber,
  string: primitives.validateString,
  boolean: primitives.validateBoolean,
  void: primitives.validateVoid,
  file: primitives.validateFile
};

},{"./errorTypes":13,"./validateArray":15,"./validateDataType":16,"./validateModel":17,"./validateOperation":18,"./validatePrimitiveTypes":19}],15:[function(_dereq_,module,exports){
'use strict';

var errorTypes = _dereq_('./errorTypes'),
  validate = _dereq_('./index');

function validateArray(candidate, dataType, models){
  if(!Array.isArray(candidate)){
    return new errorTypes.NotAnArrayError(candidate, typeof candidate);
  }

  var items = dataType.items;

  if(dataType.uniqueItems){
    var dupeCheck = [];
    var dupes = candidate.filter(function(value){
      var signature;
      if(items.$ref){
        signature = JSON.stringify(value);
      } else {
        signature = value;
      }
      if(dupeCheck.indexOf(signature) !== -1){
        return true;
      } else {
        dupeCheck.push(signature);
        return false;
      }
    });

    if(dupes.length) {
      return new errorTypes.DuplicateInSetError(candidate, dupes);
    }
  }

  var errors;

  if(items.$ref){
    var model = models[items.$ref];
    errors = candidate.filter(function(value){
      return validate.model(value, model, models);
    });
  } else {
    errors = candidate.filter(function(value){
      return validate.dataType(value, items, models);
    });
  }

  if(errors.length){
    return new errorTypes.ErrorsInArrayElementsError(errors);
  }
}
module.exports = validateArray;
},{"./errorTypes":13,"./index":14}],16:[function(_dereq_,module,exports){
'use strict';

var validate = _dereq_('./index');
  
function validateDataType(candidate, dataType, models){
  models = models || {};
      
  var type = dataType.type || dataType.dataType || dataType.$ref;

  switch(type){
    case 'integer':
      return validate.primitive.integer(candidate, dataType);
    case 'number':
      return validate.primitive.number(candidate, dataType);
    case 'string':
      return validate.primitive.string(candidate, dataType);
    case 'boolean':
      return validate.primitive.boolean(candidate);
    case 'array':
      return validate.array(candidate, dataType, models);
    case 'void':
      return validate.primitive.void(candidate);
    case 'File':
      return validate.primitive.file();
    default:
      // Assumed to be complex model
      var model = models[type];
      return validate.model(candidate, model, models);
  }
}
module.exports = validateDataType;
},{"./index":14}],17:[function(_dereq_,module,exports){
'use strict';

var errorTypes = _dereq_('./errorTypes'),
  ValidationError = errorTypes.ValidationError,
  ValidationErrors = errorTypes.ValidationErrors,
  MissingValueError = errorTypes.MissingValueError,
  validate = _dereq_('./index');

// http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-an-object
function clone(obj){
    if(obj === null || obj === undefined || typeof obj !== 'object') return obj;

    if(Array.isArray(obj)) return obj.slice();

    var temp = {};

    for(var key in obj)
        temp[key] = clone(obj[key]);
    return temp;
}

function addInhertiedProperties(model, modelId, models){
  var parent;

  Object.keys(models).some(function(modelName){
    var potentialParent = models[modelName];
    if (!potentialParent.subTypes) return;

    if(potentialParent.subTypes.indexOf(modelId) !== -1){
      parent = potentialParent;
      return true;
    }
  });

  if(!parent) return;

  for(var propertyName in parent.properties){
    model.properties[propertyName] = parent.properties[propertyName];
  }
  
  if(parent.required) model.required = model.required.concat(parent.required);

  addInhertiedProperties(model, parent.id, models);
}

function validateModel(candidate, model, models){
  if(candidate === null || typeof candidate !== 'object'){
    return new ValidationErrors(candidate, model);
  }

  models = models || {};

  model = clone(model);
  if(!model.required) model.required = [];
  addInhertiedProperties(model, model.id, models);

  var errors = [];

  model.required.forEach(function(propertyName){
    if (propertyName in candidate) return;

    var property = model.properties[propertyName];
    var error = new MissingValueError();
    errors.push(new ValidationError(propertyName, property, error));
  });

  Object.keys(candidate).forEach(function(propertyName){
    var property = model.properties[propertyName];

    var error = validate.dataType(candidate[propertyName], property, models);
    if(error){
      errors.push(new ValidationError(propertyName, property, error));
    }
  });
  
  if(errors.length){
    return new ValidationErrors(candidate, model.id, model, errors);
  }
}
module.exports = validateModel;
},{"./errorTypes":13,"./index":14}],18:[function(_dereq_,module,exports){
'use strict';

var errorTypes = _dereq_('./errorTypes'),
  ValidationError = errorTypes.ValidationError,
  ValidationErrors = errorTypes.ValidationErrors,
  MissingValueError = errorTypes.MissingValueError,
  validate = _dereq_('./index');

function validateOperation(candidate, operation, models){
  var errors = [];
  
  operation.parameters.forEach(function(param){
    if (!param.required) return;
    if (param.name in candidate) return;

    var error = new MissingValueError();
    errors.push(new ValidationError(param.name, param, error));
  });


  Object.keys(candidate).forEach(function(paramName){
    var parameter = operation.parameters.filter(function(param){
      return param.name === paramName;
    })[0];

    var error = validate.dataType(candidate[paramName], parameter, models);
    if(error){
      errors.push(new ValidationError(paramName, parameter, error));
    }
  });
  
  if(errors.length){
    return new ValidationErrors(candidate, operation.nickname, operation, errors);
  }
}
module.exports = validateOperation;
},{"./errorTypes":13,"./index":14}],19:[function(_dereq_,module,exports){
'use strict';

var errorTypes = _dereq_('./errorTypes');

function validateInteger(candidate, dataType){
  var error = validateNumber(candidate, dataType);
  if(error) return error;

  if(candidate % 1){
    return new errorTypes.NotAnIntegerError(candidate);
  }
}
exports.validateInteger = validateInteger;

function validateNumber(candidate, dataType){
  if(!(typeof candidate === 'number' || candidate instanceof Number) || isNaN(candidate)){
    return new errorTypes.NotANumberError(candidate, typeof candidate);
  }
  
  if(('minimum' in dataType) && candidate < parseInt(dataType.minimum, 10)){
    return new errorTypes.NumberTooSmallError(candidate, dataType.minimum);
  }
  
  if(('maximum' in dataType) && candidate > parseInt(dataType.maximum, 10)){
    return new errorTypes.NumberTooLargeError(candidate, dataType.maximum);
  }
}
exports.validateNumber = validateNumber;

function validateBoolean(candidate){
  if(!(typeof candidate === 'boolean' || candidate instanceof Boolean)){
    return new errorTypes.NotABooleanError(candidate, typeof candidate);
  }
}
exports.validateBoolean = validateBoolean;


function validateVoid(candidate){
  if(candidate != null){
    return new errorTypes.NotVoidError(candidate, typeof candidate);
  }
}
exports.validateVoid = validateVoid;

function validateFile(){
  // Not sure how to check this, since anything could qualify as 'File'.
}
exports.validateFile = validateFile;

function validateString(candidate, dataType){
  if(typeof candidate !== 'string' && !(candidate instanceof String)){
    return new errorTypes.NotAStringError(candidate, typeof candidate);
  }

  if('enum' in dataType){
    if(dataType.enum.indexOf(candidate) === -1) {
      return new errorTypes.StringNotInEnumError(candidate, dataType.enum);
    }
  }
}
exports.validateString = validateString;
},{"./errorTypes":13}],20:[function(_dereq_,module,exports){
'use strict';

var createOperationHandler = _dereq_('./createOperationHandler');

function createClient(schema, requestHandler){
  var operations = processSchema(schema),
    api = {};

  function getApi(apiObject){
    var name = getApiName(apiObject);

    if(!(name in api)) api[name] = {};
    return api[name];
  }

  operations.forEach(function(operation){
    var api = getApi(operation.apiObject);

    api[operation.nickname] = createOperationHandler(operation, requestHandler);
  });

  return api;
}

module.exports = createClient;
createClient.createOperationHandler = createOperationHandler;

// Helpper method which assings back pointer to object parents and returns
// the api objects within the given schema.
function processSchema(schema){
  var operations = [];
  
  schema.apis.forEach(function(resourceObject){
    resourceObject.resourceListing = schema;

    resourceObject.apiDeclaration.apis.forEach(function(apiObject){
      apiObject.resourceObject = resourceObject;
      apiObject.apiDeclaration = resourceObject.apiDeclaration;

      apiObject.operations.forEach(function(operation){
        operation.apiObject = apiObject;

        operation.parameters.forEach(function(parameter){
          parameter.operation = operation;
        });

        operations.push(operation);
      });
    });
  });

  return operations;
}

// Takes a path and returns a JavaScript-friendly variable name
function getApiName(apiObject){
  var path = apiObject.apiDeclaration.resourcePath || apiObject.path;

  // String non-word characters
  path = path.replace(/\W/g, '/');

  // Turn paths which look/like/this to lookLikeThis
  path = path.replace(/(\w)\/(\w)/g, function(match, p1, p2){
    return p1 + p2.toUpperCase();
  });

  path = path.replace(/\//g, '');

  return path;
}

},{"./createOperationHandler":21}],21:[function(_dereq_,module,exports){
'use strict';

var getRequestHeaders = _dereq_('./getRequestHeaders'),
  getRequestUrl = _dereq_('./getRequestUrl'),
  getRequestBody = _dereq_('./getRequestBody'),
  errorTypes = _dereq_('./errorTypes'),
  swaggerValidate = _dereq_('swagger-validate');

var allErrorTypes = {};
Object.keys(swaggerValidate.errors).forEach(function(errorName){
  allErrorTypes[errorName] = swaggerValidate.errors[errorName];
});

Object.keys(errorTypes).forEach(function(errorName){
  allErrorTypes[errorName] = errorTypes[errorName];
});

function createOperationHandler(operation, requestHandler){
  function Request(data, options){
    this.method = operation.method;
    this.operation = operation;
    this.errorTypes = allErrorTypes;
    this.data = data;
    this.options = options;
  }

  var operationHandler = function(data, options){
    var error,
      request;
    
    options = options || {};
    
    if(data == null) data = {};

    // if a function is passed in as options, assume it's a callback function
    // for convenience
    if(typeof options === 'function'){
      options.callback = options;
    }

    try{
      data = singleParamConvenienceProcessor(operation, data);
      data = removeUnknownParams(operation, data);

      error = swaggerValidate.operation(data, operation, operation.apiObject.apiDeclaration.models);
      
      request = new Request(data, options);
      
      // If we know there is an error, don't attempt to craft the request params.
      // The request param generators assume valid data to work properly.
      if(!error){
        request.url = getRequestUrl(operation, data);
        request.headers = getRequestHeaders(operation, data, options);
        request.body = getRequestBody(operation, data, request.headers);
      }
    } catch(e){
      error = e;
    }
    
    return requestHandler(error, request);
  };

  // Useful for instanceof checks
  operationHandler.Request = Request;
  operationHandler.errorTypes = allErrorTypes;

  // Useful for reflection
  operationHandler.operation = operation;
  
  // Can be used to preemptively validate without action
  operationHandler.validate = function(data){
    return swaggerValidate.operation(data, operation, operation.apiObject.apiDeclaration.models);
  };

  return operationHandler;
}
module.exports = createOperationHandler;

function noop(){}
createOperationHandler.logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop
};

// Enables data to be passed directly for single param operations.
function singleParamConvenienceProcessor(operation, data){
  // If there are more than one params, bail
  if(operation.parameters.length !== 1) return data;

  var param = operation.parameters[0];
  
  // If the param is already defined explicitly, bail
  if(typeof data === 'object' && (param.name in data)) return data;

  var models = operation.apiObject.apiDeclaration.models;

  // If the data passed is is not valid for the param data type, bail
  try {
    swaggerValidate.dataType(data, param, models); 
    var wrapper = {};
    wrapper[param.name] = data;
    return wrapper;
  } catch(e){
    return data;
  }
}

function removeUnknownParams(operation, data){
  if(!data || typeof data !== 'object') return data;

  var paramNames = {};
  operation.parameters.forEach(function(param){
    paramNames[param.name] = true;
  });

  var unknownKeys = Object.keys(data).filter(function(key){
    return !(key in paramNames);
  });

  createOperationHandler.logger.warn('Unknown parameters removed from request:', 
    unknownKeys.join(', '));

  unknownKeys.forEach(function(key){
    delete data[key];
  });

  return data;
}
},{"./errorTypes":22,"./getRequestBody":23,"./getRequestHeaders":24,"./getRequestUrl":25,"swagger-validate":14}],22:[function(_dereq_,module,exports){
'use strict';

function InvalidRequestError(message){
  this.name = 'InvalidRequestError';
  this.message = message || 'Invalid request';
}
InvalidRequestError.prototype = Object.create(Error.prototype);
InvalidRequestError.prototype.constructor = InvalidRequestError;

exports.InvalidRequestError = InvalidRequestError;


function MissingPathParamsError(pathParams){
  this.name = 'MissingPathParamsError';
  this.message = 'Missing the following required path parameters: ' + pathParams.join('');
}
MissingPathParamsError.prototype = Object.create(InvalidRequestError.prototype);
MissingPathParamsError.prototype.constructor = MissingPathParamsError;

exports.MissingPathParamsError = MissingPathParamsError;


function ContentTypeNotSupportedError(contentType, operation){
  var apiDeclaration = operation.apiObject.apiDeclaration;
  var consumes = operation.consumes || apiDeclaration.consumes || [];

  this.name = 'ContentTypeNotSupportedError';
  this.message = 'Operation [' + operation.nickname + '] does not accept ' + contentType + '. It supports: ' + 
    consumes.join(', ');
}
ContentTypeNotSupportedError.prototype = Object.create(InvalidRequestError.prototype);
ContentTypeNotSupportedError.prototype.constructor = ContentTypeNotSupportedError;

exports.ContentTypeNotSupportedError = ContentTypeNotSupportedError;


function AcceptsNotSupportedError(accepts, operation){
  var apiDeclaration = operation.apiObject.apiDeclaration;
  var produces = operation.produces || apiDeclaration.produces || [];

  this.name = 'AcceptsNotSupportedError';
  this.message = 'Operation [' + operation.nickname + '] does not produce ' + accepts + '. It supports: ' + 
    produces.join(', ');
}
AcceptsNotSupportedError.prototype = Object.create(InvalidRequestError.prototype);
AcceptsNotSupportedError.prototype.constructor = AcceptsNotSupportedError;

exports.AcceptsNotSupportedError = AcceptsNotSupportedError;


function OperationValidationError(operation, errors){
  this.name = 'OperationValidationError';
  this.message = operation.nickname + ' failed validation: \n\t' + errors.join('\n\t');
}
OperationValidationError.prototype = Object.create(InvalidRequestError.prototype);
OperationValidationError.prototype.constructor = OperationValidationError;

exports.OperationValidationError = OperationValidationError;


function ParameterValidationError(parameter, errors){
  this.name = 'ParameterValidationError';
  this.message = parameter.name + ' failed validation: \n\t' + errors.join('\n\t');
}
ParameterValidationError.prototype = Object.create(InvalidRequestError.prototype);
ParameterValidationError.prototype.constructor = ParameterValidationError;

exports.ParameterValidationError = ParameterValidationError;


function DataTypeValidationError(message){
  this.name = 'DataTypeValidationError';
  this.message = message || 'Invalid data type';
}
DataTypeValidationError.prototype = Object.create(Error.prototype);
DataTypeValidationError.prototype.constructor = DataTypeValidationError;

exports.DataTypeValidationError = DataTypeValidationError;
},{}],23:[function(_dereq_,module,exports){
'use strict';

module.exports = function getRequestBody(operation, data, headers){
  var body = operation.parameters.filter(function(param){
    return param.paramType === 'body' && data[param.name] != null;
  }).map(function(param){
    return data[param.name];
  })[0];

  if(!(headers &&  headers['Content-Type'])) return body;

  var contentType = headers['Content-Type'];
  var presentFormParams = operation.parameters.filter(function(param){
    return param.paramType === 'form' && data[param.name] != null;
  });

  if(contentType.indexOf('application/x-www-form-urlencoded') !== -1){
    body = presentFormParams.map(function(param){
      var key = param.name,
        value = data[key];
      return encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }).join('&');
  } else if(contentType.indexOf('multipart/form-data') !== -1){
    var randomness = Math.random().toString(16).substr(2);
    var boundary = 'SwaggerBoundary' + randomness;
    
    body = presentFormParams.map(function(param){
      var key = param.name,
        value = data[key],
        result = '--' + boundary;

      result += '\nContent-Disposition: form-data; name="' + key + '"';
      
      if(value.contentType){
        if(value.name){
          result += '; filename="' + value.name + '"';
        }

        result += '\nContent-Type: ' + value.contentType;
      }

      if(value.contentTransferEncoding){
        result += '\nContent-Transfer-Encoding: ' + value.contentTransferEncoding;
      }

      if(value.body){
        result += '\n\n' + value.body;
      } else {
        result += '\n\n' + value;
      }

      return result;
    }).join('\n');

    body += '\n--' + boundary + '--\n';
    
    headers['Content-Type'] = contentType.replace(
      'multipart/form-data', 
      'multipart/form-data; boundary=' + boundary
    );
  } else if(contentType.indexOf('application/json') !== -1){
    if(typeof body !== 'string'){
      body = JSON.stringify(body);
    }
  }

  return body;
};
},{}],24:[function(_dereq_,module,exports){
'use strict';

var errorTypes = _dereq_('./errorTypes'),
  ContentTypeNotSupportedError = errorTypes.ContentTypeNotSupportedError,
  AcceptsNotSupportedError = errorTypes.AcceptsNotSupportedError;

var DEFAULT_ACCEPT = 'application/json';
module.exports = function getRequestHeaders(operation, data, options){
  data = data || {};
  options = options || {};

  var headers = {};

  operation.parameters.forEach(function(param){
    if(param.paramType === 'header' && data[param.name] != null){
      headers[param.name] = data[param.name];
    }
  });

  // Passed headers
  if(options.headers){
    Object.keys(options.headers).forEach(function(key){
      headers[key] = options.headers[key];
    });
  }

  // Content-Type
  var contentType = options.contentType || getContentType(operation, data, options);
  if(contentType) {
    if(hasAccept(operation, contentType)){
      headers['Content-Type'] = contentType;  
    } else {
      throw new ContentTypeNotSupportedError(contentType, operation);
    }
  }

  // Accept
  var accept = options.accept || DEFAULT_ACCEPT;
  if(accept){
    if(hasContentType(operation, accept)){
      headers.Accept = accept;  
    } else {
      throw new AcceptsNotSupportedError(accept, operation);
    }
  }
  
  return headers;
};

function getContentType(operation, data){
  var hasBody = operation.parameters.some(function(param){
    return param.paramType === 'body' && (param.name in data);
  });

  if (hasBody){
    return 'application/json';
  } else {
    var hasFormParams = operation.parameters.some(function(param){
      return param.paramType === 'form' && (param.name in data);
    });

    var hasFileParam = hasFormParams && 
      operation.parameters.some(function(param){
        return param.type === 'File' && (param.name in data);
      });

    if(hasFileParam) return 'multipart/form-data';
    else if(hasFormParams) return 'application/x-www-form-urlencoded';
  }
}

// Accepts is an optional field in the spec, but must be enforced when present
function hasAccept(operation, contentType){
  var apiDeclaration = operation.apiObject.apiDeclaration;
  var accepts = operation.consumes || apiDeclaration.consumes;

  if(accepts && accepts.length){
    return accepts.indexOf(contentType) !== -1;
  } else {
    return true;
  }
}
exports.hasAccept = hasAccept;

// Content-Type (produces) is an optional field in the spec, but must be enforced when present
function hasContentType(operation, contentType){
  var apiDeclaration = operation.apiObject.apiDeclaration,
    contentTypes = operation.produces || apiDeclaration.produces;

  if(contentTypes && contentTypes.length){
    return contentTypes.indexOf(contentType) !== -1;
  } else {
    return true;
  }
}
exports.hasContentType = hasContentType;
},{"./errorTypes":22}],25:[function(_dereq_,module,exports){
'use strict';

var errorTypes = _dereq_('./errorTypes'),
  MissingPathParamsError = errorTypes.MissingPathParamsError;

module.exports = function getRequestUrl(operation, data){
  var url = getUrlTemplate(operation);

  url = applyPathParams(url, operation, data);

  if(!data) return url;

  var queryParams = operation.parameters.filter(function(param){
    return param.paramType === 'query' && data[param.name] !== undefined;
  }).map(function(param){
    var key = param.name;
    return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
  }).join('&');

  if(queryParams) url += '?' + queryParams;

  return url;
};

function applyPathParams(url, operation, data){
  var pathParams = operation.parameters.filter(function(param){
    return param.paramType === 'path';
  });

  var missingParams = pathParams.filter(function(param){
    return data[param.name] === undefined;
  });

  if(missingParams.length){
    throw new MissingPathParamsError(missingParams.map(function(param){
      return param.name;
    }));
  }

  pathParams.forEach(function(param){
    var key = param.name;
    
    var exp = new RegExp('{' + key + '[^}]*}', 'gi');

    var value = data[key].toString();
    delete data[key];
    value = value.split('/').map(encodeURIComponent).join('/');

    url = url.replace(exp, value);
  });

  return url;
}

function getUrlTemplate(operation){
  var apiObject = operation.apiObject; 

  var basePath = apiObject.apiDeclaration.basePath;
  var path = apiObject.path.replace('{format}', 'json');
  
  return basePath + path;
}

},{"./errorTypes":22}],26:[function(_dereq_,module,exports){
'use strict';

// Promise polyfill
var Promise = _dereq_('es6-promise').Promise;
var clientGenerator = _dereq_('swagger-client-generator');

module.exports = function(schema){
  return clientGenerator(schema, requestHandler);
};

// For mocking during unit testing
if(typeof XMLHttpRequest !== 'undefined'){
  module.exports.XMLHttpRequest = window.XMLHttpRequest;
}

function requestHandler(error, request){
  var XMLHttpRequest = module.exports.XMLHttpRequest;
  return new Promise(function(resolve, reject){
    if(error) return reject(error);

    var method = request.method;
    var url = request.url;
    var body = request.body;
    var headers = request.headers;

    var options = request.options;
    var async = ('async' in options)? options.async : true;
    var xhr = new XMLHttpRequest();

    xhr.open(method, url, async);

    if(headers){
      Object.keys(headers).forEach(function(header){
        xhr.setRequestHeader(header, headers[header]);
      });
    }
    
    if(options.withCredentials) xhr.withCredentials = options.withCredentials;
    if(options.timeout) xhr.timeout = options.timeout;
    if(options.onabort) xhr.onabort = options.onabort;
    if(options.onerror) xhr.onerror = options.onerror;
    if(options.onload) xhr.onload = options.onload;
    if(options.ontimeout) xhr.ontimeout = options.ontimeout;
    if(options.onprogress) xhr.onprogress = options.onprogress;

    xhr.onloadend = function(){
      var data = this.response;
      var contentType = this.getResponseHeader('Content-Type');

      if(contentType && contentType.indexOf('application/json') !== -1){
        try {
          data = JSON.parse(data);
        } catch(error){
          reject({ 
            error: error,
            status: this.status,
            data: data
          });
        }
      }

      if(this.status < 200 || this.status >= 300){
        reject({
          error: error,
          status: this.status,
          data: data
        });
      } else {
        resolve(data);
      }
      
      if(options.onloadend) options.onloadend.call(this);
    };

    xhr.send(body);
  });
}

},{"es6-promise":2,"swagger-client-generator":12}]},{},[26])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImM6XFxVc2Vyc1xcb3phblxcY29kZVxcc3dhZ2dlci1hamF4LWNsaWVudFxcbm9kZV9tb2R1bGVzXFxib2lsZXJwbGF0ZS1ndWxwXFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L25vZGVfbW9kdWxlcy9ib2lsZXJwbGF0ZS1ndWxwL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9tYWluLmpzIiwiYzovVXNlcnMvb3phbi9jb2RlL3N3YWdnZXItYWpheC1jbGllbnQvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9hbGwuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL2FzYXAuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL2NvbmZpZy5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvcG9seWZpbGwuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3Byb21pc2UuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3JhY2UuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3JlamVjdC5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvcmVzb2x2ZS5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvdXRpbHMuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvc3dhZ2dlci1jbGllbnQtZ2VuZXJhdG9yL2luZGV4LmpzIiwiYzovVXNlcnMvb3phbi9jb2RlL3N3YWdnZXItYWpheC1jbGllbnQvbm9kZV9tb2R1bGVzL3N3YWdnZXItY2xpZW50LWdlbmVyYXRvci9ub2RlX21vZHVsZXMvc3dhZ2dlci12YWxpZGF0ZS9zcmMvZXJyb3JUeXBlcy5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L25vZGVfbW9kdWxlcy9zd2FnZ2VyLWNsaWVudC1nZW5lcmF0b3Ivbm9kZV9tb2R1bGVzL3N3YWdnZXItdmFsaWRhdGUvc3JjL2luZGV4LmpzIiwiYzovVXNlcnMvb3phbi9jb2RlL3N3YWdnZXItYWpheC1jbGllbnQvbm9kZV9tb2R1bGVzL3N3YWdnZXItY2xpZW50LWdlbmVyYXRvci9ub2RlX21vZHVsZXMvc3dhZ2dlci12YWxpZGF0ZS9zcmMvdmFsaWRhdGVBcnJheS5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L25vZGVfbW9kdWxlcy9zd2FnZ2VyLWNsaWVudC1nZW5lcmF0b3Ivbm9kZV9tb2R1bGVzL3N3YWdnZXItdmFsaWRhdGUvc3JjL3ZhbGlkYXRlRGF0YVR5cGUuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvc3dhZ2dlci1jbGllbnQtZ2VuZXJhdG9yL25vZGVfbW9kdWxlcy9zd2FnZ2VyLXZhbGlkYXRlL3NyYy92YWxpZGF0ZU1vZGVsLmpzIiwiYzovVXNlcnMvb3phbi9jb2RlL3N3YWdnZXItYWpheC1jbGllbnQvbm9kZV9tb2R1bGVzL3N3YWdnZXItY2xpZW50LWdlbmVyYXRvci9ub2RlX21vZHVsZXMvc3dhZ2dlci12YWxpZGF0ZS9zcmMvdmFsaWRhdGVPcGVyYXRpb24uanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvc3dhZ2dlci1jbGllbnQtZ2VuZXJhdG9yL25vZGVfbW9kdWxlcy9zd2FnZ2VyLXZhbGlkYXRlL3NyYy92YWxpZGF0ZVByaW1pdGl2ZVR5cGVzLmpzIiwiYzovVXNlcnMvb3phbi9jb2RlL3N3YWdnZXItYWpheC1jbGllbnQvbm9kZV9tb2R1bGVzL3N3YWdnZXItY2xpZW50LWdlbmVyYXRvci9zcmMvY3JlYXRlQ2xpZW50LmpzIiwiYzovVXNlcnMvb3phbi9jb2RlL3N3YWdnZXItYWpheC1jbGllbnQvbm9kZV9tb2R1bGVzL3N3YWdnZXItY2xpZW50LWdlbmVyYXRvci9zcmMvY3JlYXRlT3BlcmF0aW9uSGFuZGxlci5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L25vZGVfbW9kdWxlcy9zd2FnZ2VyLWNsaWVudC1nZW5lcmF0b3Ivc3JjL2Vycm9yVHlwZXMuanMiLCJjOi9Vc2Vycy9vemFuL2NvZGUvc3dhZ2dlci1hamF4LWNsaWVudC9ub2RlX21vZHVsZXMvc3dhZ2dlci1jbGllbnQtZ2VuZXJhdG9yL3NyYy9nZXRSZXF1ZXN0Qm9keS5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L25vZGVfbW9kdWxlcy9zd2FnZ2VyLWNsaWVudC1nZW5lcmF0b3Ivc3JjL2dldFJlcXVlc3RIZWFkZXJzLmpzIiwiYzovVXNlcnMvb3phbi9jb2RlL3N3YWdnZXItYWpheC1jbGllbnQvbm9kZV9tb2R1bGVzL3N3YWdnZXItY2xpZW50LWdlbmVyYXRvci9zcmMvZ2V0UmVxdWVzdFVybC5qcyIsImM6L1VzZXJzL296YW4vY29kZS9zd2FnZ2VyLWFqYXgtY2xpZW50L3NyYy9jbGllbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBQcm9taXNlID0gcmVxdWlyZShcIi4vcHJvbWlzZS9wcm9taXNlXCIpLlByb21pc2U7XG52YXIgcG9seWZpbGwgPSByZXF1aXJlKFwiLi9wcm9taXNlL3BvbHlmaWxsXCIpLnBvbHlmaWxsO1xuZXhwb3J0cy5Qcm9taXNlID0gUHJvbWlzZTtcbmV4cG9ydHMucG9seWZpbGwgPSBwb2x5ZmlsbDsiLCJcInVzZSBzdHJpY3RcIjtcbi8qIGdsb2JhbCB0b1N0cmluZyAqL1xuXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLmlzQXJyYXk7XG52YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLmlzRnVuY3Rpb247XG5cbi8qKlxuICBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aGVuIGFsbCB0aGUgZ2l2ZW4gcHJvbWlzZXMgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLiBUaGUgcmV0dXJuIHByb21pc2VcbiAgaXMgZnVsZmlsbGVkIHdpdGggYW4gYXJyYXkgdGhhdCBnaXZlcyBhbGwgdGhlIHZhbHVlcyBpbiB0aGUgb3JkZXIgdGhleSB3ZXJlXG4gIHBhc3NlZCBpbiB0aGUgYHByb21pc2VzYCBhcnJheSBhcmd1bWVudC5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgdmFyIHByb21pc2UxID0gUlNWUC5yZXNvbHZlKDEpO1xuICB2YXIgcHJvbWlzZTIgPSBSU1ZQLnJlc29sdmUoMik7XG4gIHZhciBwcm9taXNlMyA9IFJTVlAucmVzb2x2ZSgzKTtcbiAgdmFyIHByb21pc2VzID0gWyBwcm9taXNlMSwgcHJvbWlzZTIsIHByb21pc2UzIF07XG5cbiAgUlNWUC5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgIC8vIFRoZSBhcnJheSBoZXJlIHdvdWxkIGJlIFsgMSwgMiwgMyBdO1xuICB9KTtcbiAgYGBgXG5cbiAgSWYgYW55IG9mIHRoZSBgcHJvbWlzZXNgIGdpdmVuIHRvIGBSU1ZQLmFsbGAgYXJlIHJlamVjdGVkLCB0aGUgZmlyc3QgcHJvbWlzZVxuICB0aGF0IGlzIHJlamVjdGVkIHdpbGwgYmUgZ2l2ZW4gYXMgYW4gYXJndW1lbnQgdG8gdGhlIHJldHVybmVkIHByb21pc2VzJ3NcbiAgcmVqZWN0aW9uIGhhbmRsZXIuIEZvciBleGFtcGxlOlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICB2YXIgcHJvbWlzZTEgPSBSU1ZQLnJlc29sdmUoMSk7XG4gIHZhciBwcm9taXNlMiA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcihcIjJcIikpO1xuICB2YXIgcHJvbWlzZTMgPSBSU1ZQLnJlamVjdChuZXcgRXJyb3IoXCIzXCIpKTtcbiAgdmFyIHByb21pc2VzID0gWyBwcm9taXNlMSwgcHJvbWlzZTIsIHByb21pc2UzIF07XG5cbiAgUlNWUC5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zIGJlY2F1c2UgdGhlcmUgYXJlIHJlamVjdGVkIHByb21pc2VzIVxuICB9LCBmdW5jdGlvbihlcnJvcikge1xuICAgIC8vIGVycm9yLm1lc3NhZ2UgPT09IFwiMlwiXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIGFsbFxuICBAZm9yIFJTVlBcbiAgQHBhcmFtIHtBcnJheX0gcHJvbWlzZXNcbiAgQHBhcmFtIHtTdHJpbmd9IGxhYmVsXG4gIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2hlbiBhbGwgYHByb21pc2VzYCBoYXZlIGJlZW5cbiAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuXG4qL1xuZnVuY3Rpb24gYWxsKHByb21pc2VzKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBQcm9taXNlID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkocHJvbWlzZXMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byBhbGwuJyk7XG4gIH1cblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXSwgcmVtYWluaW5nID0gcHJvbWlzZXMubGVuZ3RoLFxuICAgIHByb21pc2U7XG5cbiAgICBpZiAocmVtYWluaW5nID09PSAwKSB7XG4gICAgICByZXNvbHZlKFtdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlcihpbmRleCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJlc29sdmVBbGwoaW5kZXgsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZUFsbChpbmRleCwgdmFsdWUpIHtcbiAgICAgIHJlc3VsdHNbaW5kZXhdID0gdmFsdWU7XG4gICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgcmVzb2x2ZShyZXN1bHRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb21pc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9taXNlID0gcHJvbWlzZXNbaV07XG5cbiAgICAgIGlmIChwcm9taXNlICYmIGlzRnVuY3Rpb24ocHJvbWlzZS50aGVuKSkge1xuICAgICAgICBwcm9taXNlLnRoZW4ocmVzb2x2ZXIoaSksIHJlamVjdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlQWxsKGksIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydHMuYWxsID0gYWxsOyIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG52YXIgbG9jYWwgPSAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpID8gZ2xvYmFsIDogKHRoaXMgPT09IHVuZGVmaW5lZD8gd2luZG93OnRoaXMpO1xuXG4vLyBub2RlXG5mdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGxvY2FsLnNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICB9O1xufVxuXG52YXIgcXVldWUgPSBbXTtcbmZ1bmN0aW9uIGZsdXNoKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHR1cGxlID0gcXVldWVbaV07XG4gICAgdmFyIGNhbGxiYWNrID0gdHVwbGVbMF0sIGFyZyA9IHR1cGxlWzFdO1xuICAgIGNhbGxiYWNrKGFyZyk7XG4gIH1cbiAgcXVldWUgPSBbXTtcbn1cblxudmFyIHNjaGVkdWxlRmx1c2g7XG5cbi8vIERlY2lkZSB3aGF0IGFzeW5jIG1ldGhvZCB0byB1c2UgdG8gdHJpZ2dlcmluZyBwcm9jZXNzaW5nIG9mIHF1ZXVlZCBjYWxsYmFja3M6XG5pZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTmV4dFRpY2soKTtcbn0gZWxzZSBpZiAoQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbn0gZWxzZSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VTZXRUaW1lb3V0KCk7XG59XG5cbmZ1bmN0aW9uIGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICB2YXIgbGVuZ3RoID0gcXVldWUucHVzaChbY2FsbGJhY2ssIGFyZ10pO1xuICBpZiAobGVuZ3RoID09PSAxKSB7XG4gICAgLy8gSWYgbGVuZ3RoIGlzIDEsIHRoYXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHNjaGVkdWxlIGFuIGFzeW5jIGZsdXNoLlxuICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgLy8gd2lsbCBiZSBwcm9jZXNzZWQgYnkgdGhpcyBmbHVzaCB0aGF0IHdlIGFyZSBzY2hlZHVsaW5nLlxuICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgfVxufVxuXG5leHBvcnRzLmFzYXAgPSBhc2FwO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJ4cDRTU0dcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIGNvbmZpZyA9IHtcbiAgaW5zdHJ1bWVudDogZmFsc2Vcbn07XG5cbmZ1bmN0aW9uIGNvbmZpZ3VyZShuYW1lLCB2YWx1ZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIGNvbmZpZ1tuYW1lXSA9IHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjb25maWdbbmFtZV07XG4gIH1cbn1cblxuZXhwb3J0cy5jb25maWcgPSBjb25maWc7XG5leHBvcnRzLmNvbmZpZ3VyZSA9IGNvbmZpZ3VyZTsiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcbi8qZ2xvYmFsIHNlbGYqL1xudmFyIFJTVlBQcm9taXNlID0gcmVxdWlyZShcIi4vcHJvbWlzZVwiKS5Qcm9taXNlO1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKFwiLi91dGlsc1wiKS5pc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgdmFyIGxvY2FsO1xuXG4gIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gZ2xvYmFsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5kb2N1bWVudCkge1xuICAgIGxvY2FsID0gd2luZG93O1xuICB9IGVsc2Uge1xuICAgIGxvY2FsID0gc2VsZjtcbiAgfVxuXG4gIHZhciBlczZQcm9taXNlU3VwcG9ydCA9IFxuICAgIFwiUHJvbWlzZVwiIGluIGxvY2FsICYmXG4gICAgLy8gU29tZSBvZiB0aGVzZSBtZXRob2RzIGFyZSBtaXNzaW5nIGZyb21cbiAgICAvLyBGaXJlZm94L0Nocm9tZSBleHBlcmltZW50YWwgaW1wbGVtZW50YXRpb25zXG4gICAgXCJyZXNvbHZlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgIFwicmVqZWN0XCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgIFwiYWxsXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgIFwicmFjZVwiIGluIGxvY2FsLlByb21pc2UgJiZcbiAgICAvLyBPbGRlciB2ZXJzaW9uIG9mIHRoZSBzcGVjIGhhZCBhIHJlc29sdmVyIG9iamVjdFxuICAgIC8vIGFzIHRoZSBhcmcgcmF0aGVyIHRoYW4gYSBmdW5jdGlvblxuICAgIChmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZXNvbHZlO1xuICAgICAgbmV3IGxvY2FsLlByb21pc2UoZnVuY3Rpb24ocikgeyByZXNvbHZlID0gcjsgfSk7XG4gICAgICByZXR1cm4gaXNGdW5jdGlvbihyZXNvbHZlKTtcbiAgICB9KCkpO1xuXG4gIGlmICghZXM2UHJvbWlzZVN1cHBvcnQpIHtcbiAgICBsb2NhbC5Qcm9taXNlID0gUlNWUFByb21pc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5wb2x5ZmlsbCA9IHBvbHlmaWxsO1xufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWdcIikuY29uZmlnO1xudmFyIGNvbmZpZ3VyZSA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKS5jb25maWd1cmU7XG52YXIgb2JqZWN0T3JGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLm9iamVjdE9yRnVuY3Rpb247XG52YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLmlzRnVuY3Rpb247XG52YXIgbm93ID0gcmVxdWlyZShcIi4vdXRpbHNcIikubm93O1xudmFyIGFsbCA9IHJlcXVpcmUoXCIuL2FsbFwiKS5hbGw7XG52YXIgcmFjZSA9IHJlcXVpcmUoXCIuL3JhY2VcIikucmFjZTtcbnZhciBzdGF0aWNSZXNvbHZlID0gcmVxdWlyZShcIi4vcmVzb2x2ZVwiKS5yZXNvbHZlO1xudmFyIHN0YXRpY1JlamVjdCA9IHJlcXVpcmUoXCIuL3JlamVjdFwiKS5yZWplY3Q7XG52YXIgYXNhcCA9IHJlcXVpcmUoXCIuL2FzYXBcIikuYXNhcDtcblxudmFyIGNvdW50ZXIgPSAwO1xuXG5jb25maWcuYXN5bmMgPSBhc2FwOyAvLyBkZWZhdWx0IGFzeW5jIGlzIGFzYXA7XG5cbmZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKHJlc29sdmVyKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3InKTtcbiAgfVxuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7XG4gIH1cblxuICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gIGludm9rZVJlc29sdmVyKHJlc29sdmVyLCB0aGlzKTtcbn1cblxuZnVuY3Rpb24gaW52b2tlUmVzb2x2ZXIocmVzb2x2ZXIsIHByb21pc2UpIHtcbiAgZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gIH1cblxuICB0cnkge1xuICAgIHJlc29sdmVyKHJlc29sdmVQcm9taXNlLCByZWplY3RQcm9taXNlKTtcbiAgfSBjYXRjaChlKSB7XG4gICAgcmVqZWN0UHJvbWlzZShlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBwcm9taXNlLCBjYWxsYmFjaywgZGV0YWlsKSB7XG4gIHZhciBoYXNDYWxsYmFjayA9IGlzRnVuY3Rpb24oY2FsbGJhY2spLFxuICAgICAgdmFsdWUsIGVycm9yLCBzdWNjZWVkZWQsIGZhaWxlZDtcblxuICBpZiAoaGFzQ2FsbGJhY2spIHtcbiAgICB0cnkge1xuICAgICAgdmFsdWUgPSBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIGZhaWxlZCA9IHRydWU7XG4gICAgICBlcnJvciA9IGU7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZGV0YWlsO1xuICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gIH1cblxuICBpZiAoaGFuZGxlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpKSB7XG4gICAgcmV0dXJuO1xuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbnZhciBQRU5ESU5HICAgPSB2b2lkIDA7XG52YXIgU0VBTEVEICAgID0gMDtcbnZhciBGVUxGSUxMRUQgPSAxO1xudmFyIFJFSkVDVEVEICA9IDI7XG5cbmZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICB2YXIgbGVuZ3RoID0gc3Vic2NyaWJlcnMubGVuZ3RoO1xuXG4gIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgRlVMRklMTEVEXSA9IG9uRnVsZmlsbG1lbnQ7XG4gIHN1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSAgPSBvblJlamVjdGlvbjtcbn1cblxuZnVuY3Rpb24gcHVibGlzaChwcm9taXNlLCBzZXR0bGVkKSB7XG4gIHZhciBjaGlsZCwgY2FsbGJhY2ssIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnMsIGRldGFpbCA9IHByb21pc2UuX2RldGFpbDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgY2hpbGQgPSBzdWJzY3JpYmVyc1tpXTtcbiAgICBjYWxsYmFjayA9IHN1YnNjcmliZXJzW2kgKyBzZXR0bGVkXTtcblxuICAgIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgfVxuXG4gIHByb21pc2UuX3N1YnNjcmliZXJzID0gbnVsbDtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBQcm9taXNlLFxuXG4gIF9zdGF0ZTogdW5kZWZpbmVkLFxuICBfZGV0YWlsOiB1bmRlZmluZWQsXG4gIF9zdWJzY3JpYmVyczogdW5kZWZpbmVkLFxuXG4gIHRoZW46IGZ1bmN0aW9uKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuXG4gICAgdmFyIHRoZW5Qcm9taXNlID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZnVuY3Rpb24oKSB7fSk7XG5cbiAgICBpZiAodGhpcy5fc3RhdGUpIHtcbiAgICAgIHZhciBjYWxsYmFja3MgPSBhcmd1bWVudHM7XG4gICAgICBjb25maWcuYXN5bmMoZnVuY3Rpb24gaW52b2tlUHJvbWlzZUNhbGxiYWNrKCkge1xuICAgICAgICBpbnZva2VDYWxsYmFjayhwcm9taXNlLl9zdGF0ZSwgdGhlblByb21pc2UsIGNhbGxiYWNrc1twcm9taXNlLl9zdGF0ZSAtIDFdLCBwcm9taXNlLl9kZXRhaWwpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1YnNjcmliZSh0aGlzLCB0aGVuUHJvbWlzZSwgb25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGVuUHJvbWlzZTtcbiAgfSxcblxuICAnY2F0Y2gnOiBmdW5jdGlvbihvblJlamVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICB9XG59O1xuXG5Qcm9taXNlLmFsbCA9IGFsbDtcblByb21pc2UucmFjZSA9IHJhY2U7XG5Qcm9taXNlLnJlc29sdmUgPSBzdGF0aWNSZXNvbHZlO1xuUHJvbWlzZS5yZWplY3QgPSBzdGF0aWNSZWplY3Q7XG5cbmZ1bmN0aW9uIGhhbmRsZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKSB7XG4gIHZhciB0aGVuID0gbnVsbCxcbiAgcmVzb2x2ZWQ7XG5cbiAgdHJ5IHtcbiAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuXCIpO1xuICAgIH1cblxuICAgIGlmIChvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdGhlbiA9IHZhbHVlLnRoZW47XG5cbiAgICAgIGlmIChpc0Z1bmN0aW9uKHRoZW4pKSB7XG4gICAgICAgIHRoZW4uY2FsbCh2YWx1ZSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgaWYgKHJlc29sdmVkKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKHZhbHVlICE9PSB2YWwpIHtcbiAgICAgICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgaWYgKHJlc29sdmVkKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgcmVqZWN0KHByb21pc2UsIHZhbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKCFoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkpIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykgeyByZXR1cm47IH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBTRUFMRUQ7XG4gIHByb21pc2UuX2RldGFpbCA9IHZhbHVlO1xuXG4gIGNvbmZpZy5hc3luYyhwdWJsaXNoRnVsZmlsbG1lbnQsIHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiByZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykgeyByZXR1cm47IH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBTRUFMRUQ7XG4gIHByb21pc2UuX2RldGFpbCA9IHJlYXNvbjtcblxuICBjb25maWcuYXN5bmMocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2hGdWxmaWxsbWVudChwcm9taXNlKSB7XG4gIHB1Ymxpc2gocHJvbWlzZSwgcHJvbWlzZS5fc3RhdGUgPSBGVUxGSUxMRUQpO1xufVxuXG5mdW5jdGlvbiBwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgcHVibGlzaChwcm9taXNlLCBwcm9taXNlLl9zdGF0ZSA9IFJFSkVDVEVEKTtcbn1cblxuZXhwb3J0cy5Qcm9taXNlID0gUHJvbWlzZTsiLCJcInVzZSBzdHJpY3RcIjtcbi8qIGdsb2JhbCB0b1N0cmluZyAqL1xudmFyIGlzQXJyYXkgPSByZXF1aXJlKFwiLi91dGlsc1wiKS5pc0FycmF5O1xuXG4vKipcbiAgYFJTVlAucmFjZWAgYWxsb3dzIHlvdSB0byB3YXRjaCBhIHNlcmllcyBvZiBwcm9taXNlcyBhbmQgYWN0IGFzIHNvb24gYXMgdGhlXG4gIGZpcnN0IHByb21pc2UgZ2l2ZW4gdG8gdGhlIGBwcm9taXNlc2AgYXJndW1lbnQgZnVsZmlsbHMgb3IgcmVqZWN0cy5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgdmFyIHByb21pc2UxID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoXCJwcm9taXNlIDFcIik7XG4gICAgfSwgMjAwKTtcbiAgfSk7XG5cbiAgdmFyIHByb21pc2UyID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoXCJwcm9taXNlIDJcIik7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUlNWUC5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gcmVzdWx0ID09PSBcInByb21pc2UgMlwiIGJlY2F1c2UgaXQgd2FzIHJlc29sdmVkIGJlZm9yZSBwcm9taXNlMVxuICAgIC8vIHdhcyByZXNvbHZlZC5cbiAgfSk7XG4gIGBgYFxuXG4gIGBSU1ZQLnJhY2VgIGlzIGRldGVybWluaXN0aWMgaW4gdGhhdCBvbmx5IHRoZSBzdGF0ZSBvZiB0aGUgZmlyc3QgY29tcGxldGVkXG4gIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlIGBwcm9taXNlc2BcbiAgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IGNvbXBsZXRlZCBwcm9taXNlIGhhcyBiZWNvbWVcbiAgcmVqZWN0ZWQgYmVmb3JlIHRoZSBvdGhlciBwcm9taXNlcyBiZWNhbWUgZnVsZmlsbGVkLCB0aGUgcmV0dXJuZWQgcHJvbWlzZVxuICB3aWxsIGJlY29tZSByZWplY3RlZDpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlMSA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKFwicHJvbWlzZSAxXCIpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIHZhciBwcm9taXNlMiA9IG5ldyBSU1ZQLlByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZWplY3QobmV3IEVycm9yKFwicHJvbWlzZSAyXCIpKTtcbiAgICB9LCAxMDApO1xuICB9KTtcblxuICBSU1ZQLnJhY2UoW3Byb21pc2UxLCBwcm9taXNlMl0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVucyBiZWNhdXNlIHRoZXJlIGFyZSByZWplY3RlZCBwcm9taXNlcyFcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gXCJwcm9taXNlMlwiIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByYWNlXG4gIEBmb3IgUlNWUFxuICBAcGFyYW0ge0FycmF5fSBwcm9taXNlcyBhcnJheSBvZiBwcm9taXNlcyB0byBvYnNlcnZlXG4gIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCBvcHRpb25hbCBzdHJpbmcgZm9yIGRlc2NyaWJpbmcgdGhlIHByb21pc2UgcmV0dXJuZWQuXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgYmVjb21lcyBmdWxmaWxsZWQgd2l0aCB0aGUgdmFsdWUgdGhlIGZpcnN0XG4gIGNvbXBsZXRlZCBwcm9taXNlcyBpcyByZXNvbHZlZCB3aXRoIGlmIHRoZSBmaXJzdCBjb21wbGV0ZWQgcHJvbWlzZSB3YXNcbiAgZnVsZmlsbGVkLCBvciByZWplY3RlZCB3aXRoIHRoZSByZWFzb24gdGhhdCB0aGUgZmlyc3QgY29tcGxldGVkIHByb21pc2VcbiAgd2FzIHJlamVjdGVkIHdpdGguXG4qL1xuZnVuY3Rpb24gcmFjZShwcm9taXNlcykge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgUHJvbWlzZSA9IHRoaXM7XG5cbiAgaWYgKCFpc0FycmF5KHByb21pc2VzKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKTtcbiAgfVxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXSwgcHJvbWlzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvbWlzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlc1tpXTtcblxuICAgICAgaWYgKHByb21pc2UgJiYgdHlwZW9mIHByb21pc2UudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwcm9taXNlLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0cy5yYWNlID0gcmFjZTsiLCJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICBgUlNWUC5yZWplY3RgIHJldHVybnMgYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkXG4gIGByZWFzb25gLiBgUlNWUC5yZWplY3RgIGlzIGVzc2VudGlhbGx5IHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ1dIT09QUydcbiAgfSk7XG4gIGBgYFxuXG4gIEluc3RlYWQgb2Ygd3JpdGluZyB0aGUgYWJvdmUsIHlvdXIgY29kZSBub3cgc2ltcGx5IGJlY29tZXMgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlID0gUlNWUC5yZWplY3QobmV3IEVycm9yKCdXSE9PUFMnKSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyBDb2RlIGhlcmUgZG9lc24ndCBydW4gYmVjYXVzZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCFcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ1dIT09QUydcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgcmVqZWN0XG4gIEBmb3IgUlNWUFxuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBpZGVudGlmeWluZyB0aGUgcmV0dXJuZWQgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlblxuICBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QocmVhc29uKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBQcm9taXNlID0gdGhpcztcblxuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHJlamVjdChyZWFzb24pO1xuICB9KTtcbn1cblxuZXhwb3J0cy5yZWplY3QgPSByZWplY3Q7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiByZXNvbHZlKHZhbHVlKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSB0aGlzKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgdmFyIFByb21pc2UgPSB0aGlzO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgcmVzb2x2ZSh2YWx1ZSk7XG4gIH0pO1xufVxuXG5leHBvcnRzLnJlc29sdmUgPSByZXNvbHZlOyIsIlwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gb2JqZWN0T3JGdW5jdGlvbih4KSB7XG4gIHJldHVybiBpc0Z1bmN0aW9uKHgpIHx8ICh0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiB4ICE9PSBudWxsKTtcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbih4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KHgpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xufVxuXG4vLyBEYXRlLm5vdyBpcyBub3QgYXZhaWxhYmxlIGluIGJyb3dzZXJzIDwgSUU5XG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9EYXRlL25vdyNDb21wYXRpYmlsaXR5XG52YXIgbm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuXG5leHBvcnRzLm9iamVjdE9yRnVuY3Rpb24gPSBvYmplY3RPckZ1bmN0aW9uO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5leHBvcnRzLm5vdyA9IG5vdzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2NyZWF0ZUNsaWVudCcpOyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIERhdGFUeXBlVmFsaWRhdGlvbkVycm9yKG1lc3NhZ2Upe1xyXG4gIHRoaXMubmFtZSA9ICdEYXRhVHlwZVZhbGlkYXRpb25FcnJvcic7XHJcbiAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZSB8fCAnSW52YWxpZCBkYXRhIHR5cGUnO1xyXG59XHJcbkRhdGFUeXBlVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcclxuRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3I7XHJcbmV4cG9ydHMuRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IgPSBEYXRhVHlwZVZhbGlkYXRpb25FcnJvcjtcclxuXHJcbmZ1bmN0aW9uIE5vdEFuSW50ZWdlckVycm9yKHZhbHVlKXtcclxuICB0aGlzLm5hbWUgPSAnTm90QW5JbnRlZ2VyRXJyb3InO1xyXG4gIHRoaXMubWVzc2FnZSA9ICdcIicgKyB2YWx1ZSArICdcIiBpcyBub3QgYW4gaW50ZWdlcic7XHJcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG59XHJcbk5vdEFuSW50ZWdlckVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlKTtcclxuTm90QW5JbnRlZ2VyRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTm90QW5JbnRlZ2VyRXJyb3I7XHJcbmV4cG9ydHMuTm90QW5JbnRlZ2VyRXJyb3IgPSBOb3RBbkludGVnZXJFcnJvcjtcclxuXHJcbmZ1bmN0aW9uIE5vdEFOdW1iZXJFcnJvcih2YWx1ZSwgYWN0dWFsVHlwZSl7XHJcbiAgdGhpcy5uYW1lID0gJ05vdEFOdW1iZXJFcnJvcic7XHJcbiAgdGhpcy5tZXNzYWdlID0gJ1wiJyArIHZhbHVlICsgJ1wiIGlzIG5vdCBhIG51bWJlcic7XHJcbiAgaWYoYWN0dWFsVHlwZSkgdGhpcy5tZXNzYWdlICs9ICcgKGdvdCBhICcgKyBhY3R1YWxUeXBlICsgJyBpbnN0ZWFkKSc7XHJcblxyXG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxufVxyXG5Ob3RBTnVtYmVyRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShEYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUpO1xyXG5Ob3RBTnVtYmVyRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTm90QU51bWJlckVycm9yO1xyXG5leHBvcnRzLk5vdEFOdW1iZXJFcnJvciA9IE5vdEFOdW1iZXJFcnJvcjtcclxuXHJcbmZ1bmN0aW9uIE51bWJlclRvb0xhcmdlRXJyb3IodmFsdWUsIG1heCl7XHJcbiAgdGhpcy5uYW1lID0gJ051bWJlclRvb0xhcmdlRXJyb3InO1xyXG4gIHRoaXMubWVzc2FnZSA9ICdcIicgKyB2YWx1ZSArICdcIiBpcyBhYm92ZSB0aGUgbWF4aW11bSBvZiAnICsgbWF4LnRvU3RyaW5nKCk7XHJcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG59XHJcbk51bWJlclRvb0xhcmdlRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShEYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUpO1xyXG5OdW1iZXJUb29MYXJnZUVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE51bWJlclRvb0xhcmdlRXJyb3I7XHJcbmV4cG9ydHMuTnVtYmVyVG9vTGFyZ2VFcnJvciA9IE51bWJlclRvb0xhcmdlRXJyb3I7XHJcblxyXG5mdW5jdGlvbiBOdW1iZXJUb29TbWFsbEVycm9yKHZhbHVlLCBtYXgpe1xyXG4gIHRoaXMubmFtZSA9ICdOdW1iZXJUb29TbWFsbEVycm9yJztcclxuICB0aGlzLm1lc3NhZ2UgPSAnXCInICsgdmFsdWUgKyAnXCIgaXMgYWJvdmUgdGhlIG1heGltdW0gb2YgJyArIG1heC50b1N0cmluZygpO1xyXG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxufVxyXG5OdW1iZXJUb29TbWFsbEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlKTtcclxuTnVtYmVyVG9vU21hbGxFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBOdW1iZXJUb29TbWFsbEVycm9yO1xyXG5leHBvcnRzLk51bWJlclRvb1NtYWxsRXJyb3IgPSBOdW1iZXJUb29TbWFsbEVycm9yO1xyXG5cclxuZnVuY3Rpb24gTm90QUJvb2xlYW5FcnJvcih2YWx1ZSwgYWN0dWFsVHlwZSl7XHJcbiAgdGhpcy5uYW1lID0gJ05vdEFCb29sZWFuRXJyb3InO1xyXG4gIHRoaXMubWVzc2FnZSA9ICdcIicgKyB2YWx1ZSArICdcIiBpcyBub3QgYSBib29sZWFuJztcclxuICBpZihhY3R1YWxUeXBlKSB0aGlzLm1lc3NhZ2UgKz0gJyAoZ290IGEgJyArIGFjdHVhbFR5cGUgKyAnIGluc3RlYWQpJztcclxuXHJcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG59XHJcbk5vdEFCb29sZWFuRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShEYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUpO1xyXG5Ob3RBQm9vbGVhbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE5vdEFCb29sZWFuRXJyb3I7XHJcbmV4cG9ydHMuTm90QUJvb2xlYW5FcnJvciA9IE5vdEFCb29sZWFuRXJyb3I7XHJcblxyXG5mdW5jdGlvbiBOb3RBbkFycmF5RXJyb3IodmFsdWUsIGFjdHVhbFR5cGUpe1xyXG4gIHRoaXMubmFtZSA9ICdOb3RBbkFycmF5RXJyb3InO1xyXG4gIHRoaXMubWVzc2FnZSA9ICdcIicgKyB2YWx1ZSArICdcIiBpcyBub3QgYW4gYXJyYXknO1xyXG4gIGlmKGFjdHVhbFR5cGUpIHRoaXMubWVzc2FnZSArPSAnIChnb3QgYSAnICsgYWN0dWFsVHlwZSArICcgaW5zdGVhZCknO1xyXG5cclxuICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbn1cclxuTm90QW5BcnJheUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlKTtcclxuTm90QW5BcnJheUVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE5vdEFuQXJyYXlFcnJvcjtcclxuZXhwb3J0cy5Ob3RBbkFycmF5RXJyb3IgPSBOb3RBbkFycmF5RXJyb3I7XHJcblxyXG5mdW5jdGlvbiBEdXBsaWNhdGVJblNldEVycm9yKGFyciwgZHVwZXMpe1xyXG4gIHRoaXMubmFtZSA9ICdEdXBsaWNhdGVJblNldEVycm9yJztcclxuICB0aGlzLm1lc3NhZ2UgPSAnRHVwbGljYXRlcyAoXCInICsgZHVwZXMuam9pbignXCIsIFwiJykgKyAnXCIpIGZvdW5kIGluIHNldDogW1wiJyArIGFyci5qb2luKCdcIiwgXCInKSArICdcIic7XHJcbiAgdGhpcy5kdXBlcyA9IGR1cGVzO1xyXG4gIHRoaXMudmFsdWUgPSBhcnI7XHJcbn1cclxuRHVwbGljYXRlSW5TZXRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKERhdGFUeXBlVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSk7XHJcbkR1cGxpY2F0ZUluU2V0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRHVwbGljYXRlSW5TZXRFcnJvcjtcclxuZXhwb3J0cy5EdXBsaWNhdGVJblNldEVycm9yID0gRHVwbGljYXRlSW5TZXRFcnJvcjtcclxuXHJcbmZ1bmN0aW9uIE5vdFZvaWRFcnJvcih2YWx1ZSwgYWN0dWFsVHlwZSl7XHJcbiAgdGhpcy5uYW1lID0gJ05vdFZvaWRFcnJvcic7XHJcbiAgdGhpcy5tZXNzYWdlID0gJ1wiJyArIHZhbHVlICsgJ1wiIGlzIG5vdCBudWxsIG9yIHVuZGVmaW5lZCc7XHJcbiAgaWYoYWN0dWFsVHlwZSkgdGhpcy5tZXNzYWdlICs9ICcgKGdvdCBhICcgKyBhY3R1YWxUeXBlICsgJyBpbnN0ZWFkKSc7XHJcblxyXG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxufVxyXG5Ob3RWb2lkRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShEYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUpO1xyXG5Ob3RWb2lkRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTm90Vm9pZEVycm9yO1xyXG5leHBvcnRzLk5vdFZvaWRFcnJvciA9IE5vdFZvaWRFcnJvcjtcclxuXHJcbmZ1bmN0aW9uIE5vdEFTdHJpbmdFcnJvcih2YWx1ZSwgYWN0dWFsVHlwZSl7XHJcbiAgdGhpcy5uYW1lID0gJ05vdEFTdHJpbmdFcnJvcic7XHJcbiAgdGhpcy5tZXNzYWdlID0gJ1wiJyArIHZhbHVlICsgJ1wiIGlzIG5vdCBhIHN0cmluZyc7XHJcbiAgaWYoYWN0dWFsVHlwZSkgdGhpcy5tZXNzYWdlICs9ICcgKGdvdCBhICcgKyBhY3R1YWxUeXBlICsgJyBpbnN0ZWFkKSc7XHJcblxyXG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxufVxyXG5Ob3RBU3RyaW5nRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShEYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUpO1xyXG5Ob3RBU3RyaW5nRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTm90QVN0cmluZ0Vycm9yO1xyXG5leHBvcnRzLk5vdEFTdHJpbmdFcnJvciA9IE5vdEFTdHJpbmdFcnJvcjtcclxuXHJcbmZ1bmN0aW9uIFN0cmluZ05vdEluRW51bUVycm9yKHZhbHVlLCBhY2NlcHRhYmxlVmFsdWVzKXtcclxuICB0aGlzLm5hbWUgPSAnU3RyaW5nTm90SW5FbnVtRXJyb3InO1xyXG4gIHRoaXMubWVzc2FnZSA9ICdcIicgKyB2YWx1ZSArICdcIiBpcyBub3QgYW4gYWNjZXB0YWJsZSB2YWx1ZTogXCInICsgYWNjZXB0YWJsZVZhbHVlcy5qb2luKCdcIiwgXCInKSArICdcIic7XHJcbiBcclxuICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbn1cclxuU3RyaW5nTm90SW5FbnVtRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShEYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUpO1xyXG5TdHJpbmdOb3RJbkVudW1FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdHJpbmdOb3RJbkVudW1FcnJvcjtcclxuZXhwb3J0cy5TdHJpbmdOb3RJbkVudW1FcnJvciA9IFN0cmluZ05vdEluRW51bUVycm9yO1xyXG5cclxuXHJcbmZ1bmN0aW9uIEVycm9yc0luQXJyYXlFbGVtZW50c0Vycm9yKGVycm9ycyl7XHJcbiAgdGhpcy5uYW1lID0gJ0Vycm9yc0luQXJyYXlFbGVtZW50c0Vycm9yJztcclxuICB0aGlzLm1lc3NhZ2UgPSAnRXJyb3JzIGluIGFycmF5IGVsZW1lbnRzOlxcblxcdCcgKyBlcnJvcnMuam9pbignLFxcblxcdCcpO1xyXG4gIHRoaXMuZXJyb3JzID0gZXJyb3JzO1xyXG59XHJcbkVycm9yc0luQXJyYXlFbGVtZW50c0Vycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlKTtcclxuRXJyb3JzSW5BcnJheUVsZW1lbnRzRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRXJyb3JzSW5BcnJheUVsZW1lbnRzRXJyb3I7XHJcbmV4cG9ydHMuRXJyb3JzSW5BcnJheUVsZW1lbnRzRXJyb3IgPSBFcnJvcnNJbkFycmF5RWxlbWVudHNFcnJvcjtcclxuXHJcbmZ1bmN0aW9uIE1pc3NpbmdWYWx1ZUVycm9yKCl7XHJcbiAgdGhpcy5uYW1lID0gJ01pc3NpbmdWYWx1ZUVycm9yJztcclxuICBcclxuICB0aGlzLm1lc3NhZ2UgPSAnVGhpcyB2YWx1ZSBpcyByZXF1aXJlZCBidXQgbWlzc2luZyc7XHJcbn1cclxuTWlzc2luZ1ZhbHVlRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShEYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUpO1xyXG5NaXNzaW5nVmFsdWVFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNaXNzaW5nVmFsdWVFcnJvcjtcclxuZXhwb3J0cy5NaXNzaW5nVmFsdWVFcnJvciA9IE1pc3NpbmdWYWx1ZUVycm9yO1xyXG5cclxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKHNwZWNOYW1lLCBzcGVjLCBlcnJvcil7XHJcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XHJcbiAgdGhpcy5zcGVjTmFtZSA9IHNwZWNOYW1lO1xyXG4gIHRoaXMuc3BlYyA9IHNwZWM7XHJcbiAgdGhpcy5lcnJvciA9IGVycm9yO1xyXG5cclxuICB0aGlzLm1lc3NhZ2UgPSBzcGVjTmFtZSArICcgaXMgaW52YWxpZDogJyArIGVycm9yLm1lc3NhZ2U7XHJcbn1cclxuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlKTtcclxuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRpb25FcnJvcjtcclxuZXhwb3J0cy5WYWxpZGF0aW9uRXJyb3IgPSBWYWxpZGF0aW9uRXJyb3I7XHJcblxyXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3JzKHZhbHVlLCBzcGVjTmFtZSwgc3BlYywgZXJyb3JzKXtcclxuICB0aGlzLm5hbWUgPSAnVmFsaWRhdGlvbkVycm9ycyc7XHJcblxyXG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuICB0aGlzLnNwZWNOYW1lID0gc3BlY05hbWU7XHJcbiAgdGhpcy5zcGVjID0gc3BlYztcclxuICB0aGlzLmVycm9ycyA9IGVycm9ycyB8fCBbXTtcclxuXHJcbiAgdGhpcy5tZXNzYWdlID0gc3BlY05hbWUgKyAnIGlzIGludmFsaWQnO1xyXG5cclxuICBpZih0aGlzLmVycm9ycy5sZW5ndGgpe1xyXG4gICAgdGhpcy5tZXNzYWdlICs9ICc6XFxuXFx0JyArIHRoaXMuZXJyb3JzLm1hcChmdW5jdGlvbihlKXsgcmV0dXJuIGUubWVzc2FnZTsgfSkuam9pbignXFxuXFx0Jyk7XHJcbiAgfVxyXG59XHJcblZhbGlkYXRpb25FcnJvcnMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShEYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUpO1xyXG5WYWxpZGF0aW9uRXJyb3JzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRpb25FcnJvcnM7XHJcbmV4cG9ydHMuVmFsaWRhdGlvbkVycm9ycyA9IFZhbGlkYXRpb25FcnJvcnM7XHJcbiIsImV4cG9ydHMuZGF0YVR5cGUgPSByZXF1aXJlKCcuL3ZhbGlkYXRlRGF0YVR5cGUnKTtcclxuZXhwb3J0cy5tb2RlbCA9IHJlcXVpcmUoJy4vdmFsaWRhdGVNb2RlbCcpO1xyXG5leHBvcnRzLm9wZXJhdGlvbiA9IHJlcXVpcmUoJy4vdmFsaWRhdGVPcGVyYXRpb24nKTtcclxuZXhwb3J0cy5hcnJheSA9IHJlcXVpcmUoJy4vdmFsaWRhdGVBcnJheScpO1xyXG5leHBvcnRzLmVycm9ycyA9IHJlcXVpcmUoJy4vZXJyb3JUeXBlcycpO1xyXG5cclxudmFyIHByaW1pdGl2ZXMgPSByZXF1aXJlKCcuL3ZhbGlkYXRlUHJpbWl0aXZlVHlwZXMnKTtcclxuZXhwb3J0cy5wcmltaXRpdmUgPSB7XHJcbiAgaW50ZWdlcjogcHJpbWl0aXZlcy52YWxpZGF0ZUludGVnZXIsXHJcbiAgbnVtYmVyOiBwcmltaXRpdmVzLnZhbGlkYXRlTnVtYmVyLFxyXG4gIHN0cmluZzogcHJpbWl0aXZlcy52YWxpZGF0ZVN0cmluZyxcclxuICBib29sZWFuOiBwcmltaXRpdmVzLnZhbGlkYXRlQm9vbGVhbixcclxuICB2b2lkOiBwcmltaXRpdmVzLnZhbGlkYXRlVm9pZCxcclxuICBmaWxlOiBwcmltaXRpdmVzLnZhbGlkYXRlRmlsZVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgZXJyb3JUeXBlcyA9IHJlcXVpcmUoJy4vZXJyb3JUeXBlcycpLFxyXG4gIHZhbGlkYXRlID0gcmVxdWlyZSgnLi9pbmRleCcpO1xyXG5cclxuZnVuY3Rpb24gdmFsaWRhdGVBcnJheShjYW5kaWRhdGUsIGRhdGFUeXBlLCBtb2RlbHMpe1xyXG4gIGlmKCFBcnJheS5pc0FycmF5KGNhbmRpZGF0ZSkpe1xyXG4gICAgcmV0dXJuIG5ldyBlcnJvclR5cGVzLk5vdEFuQXJyYXlFcnJvcihjYW5kaWRhdGUsIHR5cGVvZiBjYW5kaWRhdGUpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGl0ZW1zID0gZGF0YVR5cGUuaXRlbXM7XHJcblxyXG4gIGlmKGRhdGFUeXBlLnVuaXF1ZUl0ZW1zKXtcclxuICAgIHZhciBkdXBlQ2hlY2sgPSBbXTtcclxuICAgIHZhciBkdXBlcyA9IGNhbmRpZGF0ZS5maWx0ZXIoZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICB2YXIgc2lnbmF0dXJlO1xyXG4gICAgICBpZihpdGVtcy4kcmVmKXtcclxuICAgICAgICBzaWduYXR1cmUgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc2lnbmF0dXJlID0gdmFsdWU7XHJcbiAgICAgIH1cclxuICAgICAgaWYoZHVwZUNoZWNrLmluZGV4T2Yoc2lnbmF0dXJlKSAhPT0gLTEpe1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGR1cGVDaGVjay5wdXNoKHNpZ25hdHVyZSk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZihkdXBlcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuIG5ldyBlcnJvclR5cGVzLkR1cGxpY2F0ZUluU2V0RXJyb3IoY2FuZGlkYXRlLCBkdXBlcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgZXJyb3JzO1xyXG5cclxuICBpZihpdGVtcy4kcmVmKXtcclxuICAgIHZhciBtb2RlbCA9IG1vZGVsc1tpdGVtcy4kcmVmXTtcclxuICAgIGVycm9ycyA9IGNhbmRpZGF0ZS5maWx0ZXIoZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICByZXR1cm4gdmFsaWRhdGUubW9kZWwodmFsdWUsIG1vZGVsLCBtb2RlbHMpO1xyXG4gICAgfSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGVycm9ycyA9IGNhbmRpZGF0ZS5maWx0ZXIoZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICByZXR1cm4gdmFsaWRhdGUuZGF0YVR5cGUodmFsdWUsIGl0ZW1zLCBtb2RlbHMpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBpZihlcnJvcnMubGVuZ3RoKXtcclxuICAgIHJldHVybiBuZXcgZXJyb3JUeXBlcy5FcnJvcnNJbkFycmF5RWxlbWVudHNFcnJvcihlcnJvcnMpO1xyXG4gIH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cyA9IHZhbGlkYXRlQXJyYXk7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHZhbGlkYXRlID0gcmVxdWlyZSgnLi9pbmRleCcpO1xyXG4gIFxyXG5mdW5jdGlvbiB2YWxpZGF0ZURhdGFUeXBlKGNhbmRpZGF0ZSwgZGF0YVR5cGUsIG1vZGVscyl7XHJcbiAgbW9kZWxzID0gbW9kZWxzIHx8IHt9O1xyXG4gICAgICBcclxuICB2YXIgdHlwZSA9IGRhdGFUeXBlLnR5cGUgfHwgZGF0YVR5cGUuZGF0YVR5cGUgfHwgZGF0YVR5cGUuJHJlZjtcclxuXHJcbiAgc3dpdGNoKHR5cGUpe1xyXG4gICAgY2FzZSAnaW50ZWdlcic6XHJcbiAgICAgIHJldHVybiB2YWxpZGF0ZS5wcmltaXRpdmUuaW50ZWdlcihjYW5kaWRhdGUsIGRhdGFUeXBlKTtcclxuICAgIGNhc2UgJ251bWJlcic6XHJcbiAgICAgIHJldHVybiB2YWxpZGF0ZS5wcmltaXRpdmUubnVtYmVyKGNhbmRpZGF0ZSwgZGF0YVR5cGUpO1xyXG4gICAgY2FzZSAnc3RyaW5nJzpcclxuICAgICAgcmV0dXJuIHZhbGlkYXRlLnByaW1pdGl2ZS5zdHJpbmcoY2FuZGlkYXRlLCBkYXRhVHlwZSk7XHJcbiAgICBjYXNlICdib29sZWFuJzpcclxuICAgICAgcmV0dXJuIHZhbGlkYXRlLnByaW1pdGl2ZS5ib29sZWFuKGNhbmRpZGF0ZSk7XHJcbiAgICBjYXNlICdhcnJheSc6XHJcbiAgICAgIHJldHVybiB2YWxpZGF0ZS5hcnJheShjYW5kaWRhdGUsIGRhdGFUeXBlLCBtb2RlbHMpO1xyXG4gICAgY2FzZSAndm9pZCc6XHJcbiAgICAgIHJldHVybiB2YWxpZGF0ZS5wcmltaXRpdmUudm9pZChjYW5kaWRhdGUpO1xyXG4gICAgY2FzZSAnRmlsZSc6XHJcbiAgICAgIHJldHVybiB2YWxpZGF0ZS5wcmltaXRpdmUuZmlsZSgpO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgLy8gQXNzdW1lZCB0byBiZSBjb21wbGV4IG1vZGVsXHJcbiAgICAgIHZhciBtb2RlbCA9IG1vZGVsc1t0eXBlXTtcclxuICAgICAgcmV0dXJuIHZhbGlkYXRlLm1vZGVsKGNhbmRpZGF0ZSwgbW9kZWwsIG1vZGVscyk7XHJcbiAgfVxyXG59XHJcbm1vZHVsZS5leHBvcnRzID0gdmFsaWRhdGVEYXRhVHlwZTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgZXJyb3JUeXBlcyA9IHJlcXVpcmUoJy4vZXJyb3JUeXBlcycpLFxyXG4gIFZhbGlkYXRpb25FcnJvciA9IGVycm9yVHlwZXMuVmFsaWRhdGlvbkVycm9yLFxyXG4gIFZhbGlkYXRpb25FcnJvcnMgPSBlcnJvclR5cGVzLlZhbGlkYXRpb25FcnJvcnMsXHJcbiAgTWlzc2luZ1ZhbHVlRXJyb3IgPSBlcnJvclR5cGVzLk1pc3NpbmdWYWx1ZUVycm9yLFxyXG4gIHZhbGlkYXRlID0gcmVxdWlyZSgnLi9pbmRleCcpO1xyXG5cclxuLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMjIxMDIvd2hhdC1pcy10aGUtbW9zdC1lZmZpY2llbnQtd2F5LXRvLWNsb25lLWFuLW9iamVjdFxyXG5mdW5jdGlvbiBjbG9uZShvYmope1xyXG4gICAgaWYob2JqID09PSBudWxsIHx8IG9iaiA9PT0gdW5kZWZpbmVkIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSByZXR1cm4gb2JqO1xyXG5cclxuICAgIGlmKEFycmF5LmlzQXJyYXkob2JqKSkgcmV0dXJuIG9iai5zbGljZSgpO1xyXG5cclxuICAgIHZhciB0ZW1wID0ge307XHJcblxyXG4gICAgZm9yKHZhciBrZXkgaW4gb2JqKVxyXG4gICAgICAgIHRlbXBba2V5XSA9IGNsb25lKG9ialtrZXldKTtcclxuICAgIHJldHVybiB0ZW1wO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRJbmhlcnRpZWRQcm9wZXJ0aWVzKG1vZGVsLCBtb2RlbElkLCBtb2RlbHMpe1xyXG4gIHZhciBwYXJlbnQ7XHJcblxyXG4gIE9iamVjdC5rZXlzKG1vZGVscykuc29tZShmdW5jdGlvbihtb2RlbE5hbWUpe1xyXG4gICAgdmFyIHBvdGVudGlhbFBhcmVudCA9IG1vZGVsc1ttb2RlbE5hbWVdO1xyXG4gICAgaWYgKCFwb3RlbnRpYWxQYXJlbnQuc3ViVHlwZXMpIHJldHVybjtcclxuXHJcbiAgICBpZihwb3RlbnRpYWxQYXJlbnQuc3ViVHlwZXMuaW5kZXhPZihtb2RlbElkKSAhPT0gLTEpe1xyXG4gICAgICBwYXJlbnQgPSBwb3RlbnRpYWxQYXJlbnQ7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBpZighcGFyZW50KSByZXR1cm47XHJcblxyXG4gIGZvcih2YXIgcHJvcGVydHlOYW1lIGluIHBhcmVudC5wcm9wZXJ0aWVzKXtcclxuICAgIG1vZGVsLnByb3BlcnRpZXNbcHJvcGVydHlOYW1lXSA9IHBhcmVudC5wcm9wZXJ0aWVzW3Byb3BlcnR5TmFtZV07XHJcbiAgfVxyXG4gIFxyXG4gIGlmKHBhcmVudC5yZXF1aXJlZCkgbW9kZWwucmVxdWlyZWQgPSBtb2RlbC5yZXF1aXJlZC5jb25jYXQocGFyZW50LnJlcXVpcmVkKTtcclxuXHJcbiAgYWRkSW5oZXJ0aWVkUHJvcGVydGllcyhtb2RlbCwgcGFyZW50LmlkLCBtb2RlbHMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2YWxpZGF0ZU1vZGVsKGNhbmRpZGF0ZSwgbW9kZWwsIG1vZGVscyl7XHJcbiAgaWYoY2FuZGlkYXRlID09PSBudWxsIHx8IHR5cGVvZiBjYW5kaWRhdGUgIT09ICdvYmplY3QnKXtcclxuICAgIHJldHVybiBuZXcgVmFsaWRhdGlvbkVycm9ycyhjYW5kaWRhdGUsIG1vZGVsKTtcclxuICB9XHJcblxyXG4gIG1vZGVscyA9IG1vZGVscyB8fCB7fTtcclxuXHJcbiAgbW9kZWwgPSBjbG9uZShtb2RlbCk7XHJcbiAgaWYoIW1vZGVsLnJlcXVpcmVkKSBtb2RlbC5yZXF1aXJlZCA9IFtdO1xyXG4gIGFkZEluaGVydGllZFByb3BlcnRpZXMobW9kZWwsIG1vZGVsLmlkLCBtb2RlbHMpO1xyXG5cclxuICB2YXIgZXJyb3JzID0gW107XHJcblxyXG4gIG1vZGVsLnJlcXVpcmVkLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHlOYW1lKXtcclxuICAgIGlmIChwcm9wZXJ0eU5hbWUgaW4gY2FuZGlkYXRlKSByZXR1cm47XHJcblxyXG4gICAgdmFyIHByb3BlcnR5ID0gbW9kZWwucHJvcGVydGllc1twcm9wZXJ0eU5hbWVdO1xyXG4gICAgdmFyIGVycm9yID0gbmV3IE1pc3NpbmdWYWx1ZUVycm9yKCk7XHJcbiAgICBlcnJvcnMucHVzaChuZXcgVmFsaWRhdGlvbkVycm9yKHByb3BlcnR5TmFtZSwgcHJvcGVydHksIGVycm9yKSk7XHJcbiAgfSk7XHJcblxyXG4gIE9iamVjdC5rZXlzKGNhbmRpZGF0ZSkuZm9yRWFjaChmdW5jdGlvbihwcm9wZXJ0eU5hbWUpe1xyXG4gICAgdmFyIHByb3BlcnR5ID0gbW9kZWwucHJvcGVydGllc1twcm9wZXJ0eU5hbWVdO1xyXG5cclxuICAgIHZhciBlcnJvciA9IHZhbGlkYXRlLmRhdGFUeXBlKGNhbmRpZGF0ZVtwcm9wZXJ0eU5hbWVdLCBwcm9wZXJ0eSwgbW9kZWxzKTtcclxuICAgIGlmKGVycm9yKXtcclxuICAgICAgZXJyb3JzLnB1c2gobmV3IFZhbGlkYXRpb25FcnJvcihwcm9wZXJ0eU5hbWUsIHByb3BlcnR5LCBlcnJvcikpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIFxyXG4gIGlmKGVycm9ycy5sZW5ndGgpe1xyXG4gICAgcmV0dXJuIG5ldyBWYWxpZGF0aW9uRXJyb3JzKGNhbmRpZGF0ZSwgbW9kZWwuaWQsIG1vZGVsLCBlcnJvcnMpO1xyXG4gIH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cyA9IHZhbGlkYXRlTW9kZWw7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGVycm9yVHlwZXMgPSByZXF1aXJlKCcuL2Vycm9yVHlwZXMnKSxcclxuICBWYWxpZGF0aW9uRXJyb3IgPSBlcnJvclR5cGVzLlZhbGlkYXRpb25FcnJvcixcclxuICBWYWxpZGF0aW9uRXJyb3JzID0gZXJyb3JUeXBlcy5WYWxpZGF0aW9uRXJyb3JzLFxyXG4gIE1pc3NpbmdWYWx1ZUVycm9yID0gZXJyb3JUeXBlcy5NaXNzaW5nVmFsdWVFcnJvcixcclxuICB2YWxpZGF0ZSA9IHJlcXVpcmUoJy4vaW5kZXgnKTtcclxuXHJcbmZ1bmN0aW9uIHZhbGlkYXRlT3BlcmF0aW9uKGNhbmRpZGF0ZSwgb3BlcmF0aW9uLCBtb2RlbHMpe1xyXG4gIHZhciBlcnJvcnMgPSBbXTtcclxuICBcclxuICBvcGVyYXRpb24ucGFyYW1ldGVycy5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtKXtcclxuICAgIGlmICghcGFyYW0ucmVxdWlyZWQpIHJldHVybjtcclxuICAgIGlmIChwYXJhbS5uYW1lIGluIGNhbmRpZGF0ZSkgcmV0dXJuO1xyXG5cclxuICAgIHZhciBlcnJvciA9IG5ldyBNaXNzaW5nVmFsdWVFcnJvcigpO1xyXG4gICAgZXJyb3JzLnB1c2gobmV3IFZhbGlkYXRpb25FcnJvcihwYXJhbS5uYW1lLCBwYXJhbSwgZXJyb3IpKTtcclxuICB9KTtcclxuXHJcblxyXG4gIE9iamVjdC5rZXlzKGNhbmRpZGF0ZSkuZm9yRWFjaChmdW5jdGlvbihwYXJhbU5hbWUpe1xyXG4gICAgdmFyIHBhcmFtZXRlciA9IG9wZXJhdGlvbi5wYXJhbWV0ZXJzLmZpbHRlcihmdW5jdGlvbihwYXJhbSl7XHJcbiAgICAgIHJldHVybiBwYXJhbS5uYW1lID09PSBwYXJhbU5hbWU7XHJcbiAgICB9KVswXTtcclxuXHJcbiAgICB2YXIgZXJyb3IgPSB2YWxpZGF0ZS5kYXRhVHlwZShjYW5kaWRhdGVbcGFyYW1OYW1lXSwgcGFyYW1ldGVyLCBtb2RlbHMpO1xyXG4gICAgaWYoZXJyb3Ipe1xyXG4gICAgICBlcnJvcnMucHVzaChuZXcgVmFsaWRhdGlvbkVycm9yKHBhcmFtTmFtZSwgcGFyYW1ldGVyLCBlcnJvcikpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIFxyXG4gIGlmKGVycm9ycy5sZW5ndGgpe1xyXG4gICAgcmV0dXJuIG5ldyBWYWxpZGF0aW9uRXJyb3JzKGNhbmRpZGF0ZSwgb3BlcmF0aW9uLm5pY2tuYW1lLCBvcGVyYXRpb24sIGVycm9ycyk7XHJcbiAgfVxyXG59XHJcbm1vZHVsZS5leHBvcnRzID0gdmFsaWRhdGVPcGVyYXRpb247IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGVycm9yVHlwZXMgPSByZXF1aXJlKCcuL2Vycm9yVHlwZXMnKTtcclxuXHJcbmZ1bmN0aW9uIHZhbGlkYXRlSW50ZWdlcihjYW5kaWRhdGUsIGRhdGFUeXBlKXtcclxuICB2YXIgZXJyb3IgPSB2YWxpZGF0ZU51bWJlcihjYW5kaWRhdGUsIGRhdGFUeXBlKTtcclxuICBpZihlcnJvcikgcmV0dXJuIGVycm9yO1xyXG5cclxuICBpZihjYW5kaWRhdGUgJSAxKXtcclxuICAgIHJldHVybiBuZXcgZXJyb3JUeXBlcy5Ob3RBbkludGVnZXJFcnJvcihjYW5kaWRhdGUpO1xyXG4gIH1cclxufVxyXG5leHBvcnRzLnZhbGlkYXRlSW50ZWdlciA9IHZhbGlkYXRlSW50ZWdlcjtcclxuXHJcbmZ1bmN0aW9uIHZhbGlkYXRlTnVtYmVyKGNhbmRpZGF0ZSwgZGF0YVR5cGUpe1xyXG4gIGlmKCEodHlwZW9mIGNhbmRpZGF0ZSA9PT0gJ251bWJlcicgfHwgY2FuZGlkYXRlIGluc3RhbmNlb2YgTnVtYmVyKSB8fCBpc05hTihjYW5kaWRhdGUpKXtcclxuICAgIHJldHVybiBuZXcgZXJyb3JUeXBlcy5Ob3RBTnVtYmVyRXJyb3IoY2FuZGlkYXRlLCB0eXBlb2YgY2FuZGlkYXRlKTtcclxuICB9XHJcbiAgXHJcbiAgaWYoKCdtaW5pbXVtJyBpbiBkYXRhVHlwZSkgJiYgY2FuZGlkYXRlIDwgcGFyc2VJbnQoZGF0YVR5cGUubWluaW11bSwgMTApKXtcclxuICAgIHJldHVybiBuZXcgZXJyb3JUeXBlcy5OdW1iZXJUb29TbWFsbEVycm9yKGNhbmRpZGF0ZSwgZGF0YVR5cGUubWluaW11bSk7XHJcbiAgfVxyXG4gIFxyXG4gIGlmKCgnbWF4aW11bScgaW4gZGF0YVR5cGUpICYmIGNhbmRpZGF0ZSA+IHBhcnNlSW50KGRhdGFUeXBlLm1heGltdW0sIDEwKSl7XHJcbiAgICByZXR1cm4gbmV3IGVycm9yVHlwZXMuTnVtYmVyVG9vTGFyZ2VFcnJvcihjYW5kaWRhdGUsIGRhdGFUeXBlLm1heGltdW0pO1xyXG4gIH1cclxufVxyXG5leHBvcnRzLnZhbGlkYXRlTnVtYmVyID0gdmFsaWRhdGVOdW1iZXI7XHJcblxyXG5mdW5jdGlvbiB2YWxpZGF0ZUJvb2xlYW4oY2FuZGlkYXRlKXtcclxuICBpZighKHR5cGVvZiBjYW5kaWRhdGUgPT09ICdib29sZWFuJyB8fCBjYW5kaWRhdGUgaW5zdGFuY2VvZiBCb29sZWFuKSl7XHJcbiAgICByZXR1cm4gbmV3IGVycm9yVHlwZXMuTm90QUJvb2xlYW5FcnJvcihjYW5kaWRhdGUsIHR5cGVvZiBjYW5kaWRhdGUpO1xyXG4gIH1cclxufVxyXG5leHBvcnRzLnZhbGlkYXRlQm9vbGVhbiA9IHZhbGlkYXRlQm9vbGVhbjtcclxuXHJcblxyXG5mdW5jdGlvbiB2YWxpZGF0ZVZvaWQoY2FuZGlkYXRlKXtcclxuICBpZihjYW5kaWRhdGUgIT0gbnVsbCl7XHJcbiAgICByZXR1cm4gbmV3IGVycm9yVHlwZXMuTm90Vm9pZEVycm9yKGNhbmRpZGF0ZSwgdHlwZW9mIGNhbmRpZGF0ZSk7XHJcbiAgfVxyXG59XHJcbmV4cG9ydHMudmFsaWRhdGVWb2lkID0gdmFsaWRhdGVWb2lkO1xyXG5cclxuZnVuY3Rpb24gdmFsaWRhdGVGaWxlKCl7XHJcbiAgLy8gTm90IHN1cmUgaG93IHRvIGNoZWNrIHRoaXMsIHNpbmNlIGFueXRoaW5nIGNvdWxkIHF1YWxpZnkgYXMgJ0ZpbGUnLlxyXG59XHJcbmV4cG9ydHMudmFsaWRhdGVGaWxlID0gdmFsaWRhdGVGaWxlO1xyXG5cclxuZnVuY3Rpb24gdmFsaWRhdGVTdHJpbmcoY2FuZGlkYXRlLCBkYXRhVHlwZSl7XHJcbiAgaWYodHlwZW9mIGNhbmRpZGF0ZSAhPT0gJ3N0cmluZycgJiYgIShjYW5kaWRhdGUgaW5zdGFuY2VvZiBTdHJpbmcpKXtcclxuICAgIHJldHVybiBuZXcgZXJyb3JUeXBlcy5Ob3RBU3RyaW5nRXJyb3IoY2FuZGlkYXRlLCB0eXBlb2YgY2FuZGlkYXRlKTtcclxuICB9XHJcblxyXG4gIGlmKCdlbnVtJyBpbiBkYXRhVHlwZSl7XHJcbiAgICBpZihkYXRhVHlwZS5lbnVtLmluZGV4T2YoY2FuZGlkYXRlKSA9PT0gLTEpIHtcclxuICAgICAgcmV0dXJuIG5ldyBlcnJvclR5cGVzLlN0cmluZ05vdEluRW51bUVycm9yKGNhbmRpZGF0ZSwgZGF0YVR5cGUuZW51bSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbmV4cG9ydHMudmFsaWRhdGVTdHJpbmcgPSB2YWxpZGF0ZVN0cmluZzsiLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgY3JlYXRlT3BlcmF0aW9uSGFuZGxlciA9IHJlcXVpcmUoJy4vY3JlYXRlT3BlcmF0aW9uSGFuZGxlcicpO1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ2xpZW50KHNjaGVtYSwgcmVxdWVzdEhhbmRsZXIpe1xyXG4gIHZhciBvcGVyYXRpb25zID0gcHJvY2Vzc1NjaGVtYShzY2hlbWEpLFxyXG4gICAgYXBpID0ge307XHJcblxyXG4gIGZ1bmN0aW9uIGdldEFwaShhcGlPYmplY3Qpe1xyXG4gICAgdmFyIG5hbWUgPSBnZXRBcGlOYW1lKGFwaU9iamVjdCk7XHJcblxyXG4gICAgaWYoIShuYW1lIGluIGFwaSkpIGFwaVtuYW1lXSA9IHt9O1xyXG4gICAgcmV0dXJuIGFwaVtuYW1lXTtcclxuICB9XHJcblxyXG4gIG9wZXJhdGlvbnMuZm9yRWFjaChmdW5jdGlvbihvcGVyYXRpb24pe1xyXG4gICAgdmFyIGFwaSA9IGdldEFwaShvcGVyYXRpb24uYXBpT2JqZWN0KTtcclxuXHJcbiAgICBhcGlbb3BlcmF0aW9uLm5pY2tuYW1lXSA9IGNyZWF0ZU9wZXJhdGlvbkhhbmRsZXIob3BlcmF0aW9uLCByZXF1ZXN0SGFuZGxlcik7XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBhcGk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlQ2xpZW50O1xyXG5jcmVhdGVDbGllbnQuY3JlYXRlT3BlcmF0aW9uSGFuZGxlciA9IGNyZWF0ZU9wZXJhdGlvbkhhbmRsZXI7XHJcblxyXG4vLyBIZWxwcGVyIG1ldGhvZCB3aGljaCBhc3NpbmdzIGJhY2sgcG9pbnRlciB0byBvYmplY3QgcGFyZW50cyBhbmQgcmV0dXJuc1xyXG4vLyB0aGUgYXBpIG9iamVjdHMgd2l0aGluIHRoZSBnaXZlbiBzY2hlbWEuXHJcbmZ1bmN0aW9uIHByb2Nlc3NTY2hlbWEoc2NoZW1hKXtcclxuICB2YXIgb3BlcmF0aW9ucyA9IFtdO1xyXG4gIFxyXG4gIHNjaGVtYS5hcGlzLmZvckVhY2goZnVuY3Rpb24ocmVzb3VyY2VPYmplY3Qpe1xyXG4gICAgcmVzb3VyY2VPYmplY3QucmVzb3VyY2VMaXN0aW5nID0gc2NoZW1hO1xyXG5cclxuICAgIHJlc291cmNlT2JqZWN0LmFwaURlY2xhcmF0aW9uLmFwaXMuZm9yRWFjaChmdW5jdGlvbihhcGlPYmplY3Qpe1xyXG4gICAgICBhcGlPYmplY3QucmVzb3VyY2VPYmplY3QgPSByZXNvdXJjZU9iamVjdDtcclxuICAgICAgYXBpT2JqZWN0LmFwaURlY2xhcmF0aW9uID0gcmVzb3VyY2VPYmplY3QuYXBpRGVjbGFyYXRpb247XHJcblxyXG4gICAgICBhcGlPYmplY3Qub3BlcmF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKG9wZXJhdGlvbil7XHJcbiAgICAgICAgb3BlcmF0aW9uLmFwaU9iamVjdCA9IGFwaU9iamVjdDtcclxuXHJcbiAgICAgICAgb3BlcmF0aW9uLnBhcmFtZXRlcnMuZm9yRWFjaChmdW5jdGlvbihwYXJhbWV0ZXIpe1xyXG4gICAgICAgICAgcGFyYW1ldGVyLm9wZXJhdGlvbiA9IG9wZXJhdGlvbjtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgb3BlcmF0aW9ucy5wdXNoKG9wZXJhdGlvbik7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBvcGVyYXRpb25zO1xyXG59XHJcblxyXG4vLyBUYWtlcyBhIHBhdGggYW5kIHJldHVybnMgYSBKYXZhU2NyaXB0LWZyaWVuZGx5IHZhcmlhYmxlIG5hbWVcclxuZnVuY3Rpb24gZ2V0QXBpTmFtZShhcGlPYmplY3Qpe1xyXG4gIHZhciBwYXRoID0gYXBpT2JqZWN0LmFwaURlY2xhcmF0aW9uLnJlc291cmNlUGF0aCB8fCBhcGlPYmplY3QucGF0aDtcclxuXHJcbiAgLy8gU3RyaW5nIG5vbi13b3JkIGNoYXJhY3RlcnNcclxuICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXFcvZywgJy8nKTtcclxuXHJcbiAgLy8gVHVybiBwYXRocyB3aGljaCBsb29rL2xpa2UvdGhpcyB0byBsb29rTGlrZVRoaXNcclxuICBwYXRoID0gcGF0aC5yZXBsYWNlKC8oXFx3KVxcLyhcXHcpL2csIGZ1bmN0aW9uKG1hdGNoLCBwMSwgcDIpe1xyXG4gICAgcmV0dXJuIHAxICsgcDIudG9VcHBlckNhc2UoKTtcclxuICB9KTtcclxuXHJcbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvL2csICcnKTtcclxuXHJcbiAgcmV0dXJuIHBhdGg7XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGdldFJlcXVlc3RIZWFkZXJzID0gcmVxdWlyZSgnLi9nZXRSZXF1ZXN0SGVhZGVycycpLFxyXG4gIGdldFJlcXVlc3RVcmwgPSByZXF1aXJlKCcuL2dldFJlcXVlc3RVcmwnKSxcclxuICBnZXRSZXF1ZXN0Qm9keSA9IHJlcXVpcmUoJy4vZ2V0UmVxdWVzdEJvZHknKSxcclxuICBlcnJvclR5cGVzID0gcmVxdWlyZSgnLi9lcnJvclR5cGVzJyksXHJcbiAgc3dhZ2dlclZhbGlkYXRlID0gcmVxdWlyZSgnc3dhZ2dlci12YWxpZGF0ZScpO1xyXG5cclxudmFyIGFsbEVycm9yVHlwZXMgPSB7fTtcclxuT2JqZWN0LmtleXMoc3dhZ2dlclZhbGlkYXRlLmVycm9ycykuZm9yRWFjaChmdW5jdGlvbihlcnJvck5hbWUpe1xyXG4gIGFsbEVycm9yVHlwZXNbZXJyb3JOYW1lXSA9IHN3YWdnZXJWYWxpZGF0ZS5lcnJvcnNbZXJyb3JOYW1lXTtcclxufSk7XHJcblxyXG5PYmplY3Qua2V5cyhlcnJvclR5cGVzKS5mb3JFYWNoKGZ1bmN0aW9uKGVycm9yTmFtZSl7XHJcbiAgYWxsRXJyb3JUeXBlc1tlcnJvck5hbWVdID0gZXJyb3JUeXBlc1tlcnJvck5hbWVdO1xyXG59KTtcclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU9wZXJhdGlvbkhhbmRsZXIob3BlcmF0aW9uLCByZXF1ZXN0SGFuZGxlcil7XHJcbiAgZnVuY3Rpb24gUmVxdWVzdChkYXRhLCBvcHRpb25zKXtcclxuICAgIHRoaXMubWV0aG9kID0gb3BlcmF0aW9uLm1ldGhvZDtcclxuICAgIHRoaXMub3BlcmF0aW9uID0gb3BlcmF0aW9uO1xyXG4gICAgdGhpcy5lcnJvclR5cGVzID0gYWxsRXJyb3JUeXBlcztcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xyXG4gIH1cclxuXHJcbiAgdmFyIG9wZXJhdGlvbkhhbmRsZXIgPSBmdW5jdGlvbihkYXRhLCBvcHRpb25zKXtcclxuICAgIHZhciBlcnJvcixcclxuICAgICAgcmVxdWVzdDtcclxuICAgIFxyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICBcclxuICAgIGlmKGRhdGEgPT0gbnVsbCkgZGF0YSA9IHt9O1xyXG5cclxuICAgIC8vIGlmIGEgZnVuY3Rpb24gaXMgcGFzc2VkIGluIGFzIG9wdGlvbnMsIGFzc3VtZSBpdCdzIGEgY2FsbGJhY2sgZnVuY3Rpb25cclxuICAgIC8vIGZvciBjb252ZW5pZW5jZVxyXG4gICAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICBvcHRpb25zLmNhbGxiYWNrID0gb3B0aW9ucztcclxuICAgIH1cclxuXHJcbiAgICB0cnl7XHJcbiAgICAgIGRhdGEgPSBzaW5nbGVQYXJhbUNvbnZlbmllbmNlUHJvY2Vzc29yKG9wZXJhdGlvbiwgZGF0YSk7XHJcbiAgICAgIGRhdGEgPSByZW1vdmVVbmtub3duUGFyYW1zKG9wZXJhdGlvbiwgZGF0YSk7XHJcblxyXG4gICAgICBlcnJvciA9IHN3YWdnZXJWYWxpZGF0ZS5vcGVyYXRpb24oZGF0YSwgb3BlcmF0aW9uLCBvcGVyYXRpb24uYXBpT2JqZWN0LmFwaURlY2xhcmF0aW9uLm1vZGVscyk7XHJcbiAgICAgIFxyXG4gICAgICByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoZGF0YSwgb3B0aW9ucyk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiB3ZSBrbm93IHRoZXJlIGlzIGFuIGVycm9yLCBkb24ndCBhdHRlbXB0IHRvIGNyYWZ0IHRoZSByZXF1ZXN0IHBhcmFtcy5cclxuICAgICAgLy8gVGhlIHJlcXVlc3QgcGFyYW0gZ2VuZXJhdG9ycyBhc3N1bWUgdmFsaWQgZGF0YSB0byB3b3JrIHByb3Blcmx5LlxyXG4gICAgICBpZighZXJyb3Ipe1xyXG4gICAgICAgIHJlcXVlc3QudXJsID0gZ2V0UmVxdWVzdFVybChvcGVyYXRpb24sIGRhdGEpO1xyXG4gICAgICAgIHJlcXVlc3QuaGVhZGVycyA9IGdldFJlcXVlc3RIZWFkZXJzKG9wZXJhdGlvbiwgZGF0YSwgb3B0aW9ucyk7XHJcbiAgICAgICAgcmVxdWVzdC5ib2R5ID0gZ2V0UmVxdWVzdEJvZHkob3BlcmF0aW9uLCBkYXRhLCByZXF1ZXN0LmhlYWRlcnMpO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoKGUpe1xyXG4gICAgICBlcnJvciA9IGU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiByZXF1ZXN0SGFuZGxlcihlcnJvciwgcmVxdWVzdCk7XHJcbiAgfTtcclxuXHJcbiAgLy8gVXNlZnVsIGZvciBpbnN0YW5jZW9mIGNoZWNrc1xyXG4gIG9wZXJhdGlvbkhhbmRsZXIuUmVxdWVzdCA9IFJlcXVlc3Q7XHJcbiAgb3BlcmF0aW9uSGFuZGxlci5lcnJvclR5cGVzID0gYWxsRXJyb3JUeXBlcztcclxuXHJcbiAgLy8gVXNlZnVsIGZvciByZWZsZWN0aW9uXHJcbiAgb3BlcmF0aW9uSGFuZGxlci5vcGVyYXRpb24gPSBvcGVyYXRpb247XHJcbiAgXHJcbiAgLy8gQ2FuIGJlIHVzZWQgdG8gcHJlZW1wdGl2ZWx5IHZhbGlkYXRlIHdpdGhvdXQgYWN0aW9uXHJcbiAgb3BlcmF0aW9uSGFuZGxlci52YWxpZGF0ZSA9IGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgcmV0dXJuIHN3YWdnZXJWYWxpZGF0ZS5vcGVyYXRpb24oZGF0YSwgb3BlcmF0aW9uLCBvcGVyYXRpb24uYXBpT2JqZWN0LmFwaURlY2xhcmF0aW9uLm1vZGVscyk7XHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIG9wZXJhdGlvbkhhbmRsZXI7XHJcbn1cclxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVPcGVyYXRpb25IYW5kbGVyO1xyXG5cclxuZnVuY3Rpb24gbm9vcCgpe31cclxuY3JlYXRlT3BlcmF0aW9uSGFuZGxlci5sb2dnZXIgPSB7XHJcbiAgZGVidWc6IG5vb3AsXHJcbiAgaW5mbzogbm9vcCxcclxuICB3YXJuOiBub29wLFxyXG4gIGVycm9yOiBub29wXHJcbn07XHJcblxyXG4vLyBFbmFibGVzIGRhdGEgdG8gYmUgcGFzc2VkIGRpcmVjdGx5IGZvciBzaW5nbGUgcGFyYW0gb3BlcmF0aW9ucy5cclxuZnVuY3Rpb24gc2luZ2xlUGFyYW1Db252ZW5pZW5jZVByb2Nlc3NvcihvcGVyYXRpb24sIGRhdGEpe1xyXG4gIC8vIElmIHRoZXJlIGFyZSBtb3JlIHRoYW4gb25lIHBhcmFtcywgYmFpbFxyXG4gIGlmKG9wZXJhdGlvbi5wYXJhbWV0ZXJzLmxlbmd0aCAhPT0gMSkgcmV0dXJuIGRhdGE7XHJcblxyXG4gIHZhciBwYXJhbSA9IG9wZXJhdGlvbi5wYXJhbWV0ZXJzWzBdO1xyXG4gIFxyXG4gIC8vIElmIHRoZSBwYXJhbSBpcyBhbHJlYWR5IGRlZmluZWQgZXhwbGljaXRseSwgYmFpbFxyXG4gIGlmKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiAocGFyYW0ubmFtZSBpbiBkYXRhKSkgcmV0dXJuIGRhdGE7XHJcblxyXG4gIHZhciBtb2RlbHMgPSBvcGVyYXRpb24uYXBpT2JqZWN0LmFwaURlY2xhcmF0aW9uLm1vZGVscztcclxuXHJcbiAgLy8gSWYgdGhlIGRhdGEgcGFzc2VkIGlzIGlzIG5vdCB2YWxpZCBmb3IgdGhlIHBhcmFtIGRhdGEgdHlwZSwgYmFpbFxyXG4gIHRyeSB7XHJcbiAgICBzd2FnZ2VyVmFsaWRhdGUuZGF0YVR5cGUoZGF0YSwgcGFyYW0sIG1vZGVscyk7IFxyXG4gICAgdmFyIHdyYXBwZXIgPSB7fTtcclxuICAgIHdyYXBwZXJbcGFyYW0ubmFtZV0gPSBkYXRhO1xyXG4gICAgcmV0dXJuIHdyYXBwZXI7XHJcbiAgfSBjYXRjaChlKXtcclxuICAgIHJldHVybiBkYXRhO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVW5rbm93blBhcmFtcyhvcGVyYXRpb24sIGRhdGEpe1xyXG4gIGlmKCFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0JykgcmV0dXJuIGRhdGE7XHJcblxyXG4gIHZhciBwYXJhbU5hbWVzID0ge307XHJcbiAgb3BlcmF0aW9uLnBhcmFtZXRlcnMuZm9yRWFjaChmdW5jdGlvbihwYXJhbSl7XHJcbiAgICBwYXJhbU5hbWVzW3BhcmFtLm5hbWVdID0gdHJ1ZTtcclxuICB9KTtcclxuXHJcbiAgdmFyIHVua25vd25LZXlzID0gT2JqZWN0LmtleXMoZGF0YSkuZmlsdGVyKGZ1bmN0aW9uKGtleSl7XHJcbiAgICByZXR1cm4gIShrZXkgaW4gcGFyYW1OYW1lcyk7XHJcbiAgfSk7XHJcblxyXG4gIGNyZWF0ZU9wZXJhdGlvbkhhbmRsZXIubG9nZ2VyLndhcm4oJ1Vua25vd24gcGFyYW1ldGVycyByZW1vdmVkIGZyb20gcmVxdWVzdDonLCBcclxuICAgIHVua25vd25LZXlzLmpvaW4oJywgJykpO1xyXG5cclxuICB1bmtub3duS2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XHJcbiAgICBkZWxldGUgZGF0YVtrZXldO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gZGF0YTtcclxufSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIEludmFsaWRSZXF1ZXN0RXJyb3IobWVzc2FnZSl7XHJcbiAgdGhpcy5uYW1lID0gJ0ludmFsaWRSZXF1ZXN0RXJyb3InO1xyXG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2UgfHwgJ0ludmFsaWQgcmVxdWVzdCc7XHJcbn1cclxuSW52YWxpZFJlcXVlc3RFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XHJcbkludmFsaWRSZXF1ZXN0RXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSW52YWxpZFJlcXVlc3RFcnJvcjtcclxuXHJcbmV4cG9ydHMuSW52YWxpZFJlcXVlc3RFcnJvciA9IEludmFsaWRSZXF1ZXN0RXJyb3I7XHJcblxyXG5cclxuZnVuY3Rpb24gTWlzc2luZ1BhdGhQYXJhbXNFcnJvcihwYXRoUGFyYW1zKXtcclxuICB0aGlzLm5hbWUgPSAnTWlzc2luZ1BhdGhQYXJhbXNFcnJvcic7XHJcbiAgdGhpcy5tZXNzYWdlID0gJ01pc3NpbmcgdGhlIGZvbGxvd2luZyByZXF1aXJlZCBwYXRoIHBhcmFtZXRlcnM6ICcgKyBwYXRoUGFyYW1zLmpvaW4oJycpO1xyXG59XHJcbk1pc3NpbmdQYXRoUGFyYW1zRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJbnZhbGlkUmVxdWVzdEVycm9yLnByb3RvdHlwZSk7XHJcbk1pc3NpbmdQYXRoUGFyYW1zRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTWlzc2luZ1BhdGhQYXJhbXNFcnJvcjtcclxuXHJcbmV4cG9ydHMuTWlzc2luZ1BhdGhQYXJhbXNFcnJvciA9IE1pc3NpbmdQYXRoUGFyYW1zRXJyb3I7XHJcblxyXG5cclxuZnVuY3Rpb24gQ29udGVudFR5cGVOb3RTdXBwb3J0ZWRFcnJvcihjb250ZW50VHlwZSwgb3BlcmF0aW9uKXtcclxuICB2YXIgYXBpRGVjbGFyYXRpb24gPSBvcGVyYXRpb24uYXBpT2JqZWN0LmFwaURlY2xhcmF0aW9uO1xyXG4gIHZhciBjb25zdW1lcyA9IG9wZXJhdGlvbi5jb25zdW1lcyB8fCBhcGlEZWNsYXJhdGlvbi5jb25zdW1lcyB8fCBbXTtcclxuXHJcbiAgdGhpcy5uYW1lID0gJ0NvbnRlbnRUeXBlTm90U3VwcG9ydGVkRXJyb3InO1xyXG4gIHRoaXMubWVzc2FnZSA9ICdPcGVyYXRpb24gWycgKyBvcGVyYXRpb24ubmlja25hbWUgKyAnXSBkb2VzIG5vdCBhY2NlcHQgJyArIGNvbnRlbnRUeXBlICsgJy4gSXQgc3VwcG9ydHM6ICcgKyBcclxuICAgIGNvbnN1bWVzLmpvaW4oJywgJyk7XHJcbn1cclxuQ29udGVudFR5cGVOb3RTdXBwb3J0ZWRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEludmFsaWRSZXF1ZXN0RXJyb3IucHJvdG90eXBlKTtcclxuQ29udGVudFR5cGVOb3RTdXBwb3J0ZWRFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb250ZW50VHlwZU5vdFN1cHBvcnRlZEVycm9yO1xyXG5cclxuZXhwb3J0cy5Db250ZW50VHlwZU5vdFN1cHBvcnRlZEVycm9yID0gQ29udGVudFR5cGVOb3RTdXBwb3J0ZWRFcnJvcjtcclxuXHJcblxyXG5mdW5jdGlvbiBBY2NlcHRzTm90U3VwcG9ydGVkRXJyb3IoYWNjZXB0cywgb3BlcmF0aW9uKXtcclxuICB2YXIgYXBpRGVjbGFyYXRpb24gPSBvcGVyYXRpb24uYXBpT2JqZWN0LmFwaURlY2xhcmF0aW9uO1xyXG4gIHZhciBwcm9kdWNlcyA9IG9wZXJhdGlvbi5wcm9kdWNlcyB8fCBhcGlEZWNsYXJhdGlvbi5wcm9kdWNlcyB8fCBbXTtcclxuXHJcbiAgdGhpcy5uYW1lID0gJ0FjY2VwdHNOb3RTdXBwb3J0ZWRFcnJvcic7XHJcbiAgdGhpcy5tZXNzYWdlID0gJ09wZXJhdGlvbiBbJyArIG9wZXJhdGlvbi5uaWNrbmFtZSArICddIGRvZXMgbm90IHByb2R1Y2UgJyArIGFjY2VwdHMgKyAnLiBJdCBzdXBwb3J0czogJyArIFxyXG4gICAgcHJvZHVjZXMuam9pbignLCAnKTtcclxufVxyXG5BY2NlcHRzTm90U3VwcG9ydGVkRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJbnZhbGlkUmVxdWVzdEVycm9yLnByb3RvdHlwZSk7XHJcbkFjY2VwdHNOb3RTdXBwb3J0ZWRFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBBY2NlcHRzTm90U3VwcG9ydGVkRXJyb3I7XHJcblxyXG5leHBvcnRzLkFjY2VwdHNOb3RTdXBwb3J0ZWRFcnJvciA9IEFjY2VwdHNOb3RTdXBwb3J0ZWRFcnJvcjtcclxuXHJcblxyXG5mdW5jdGlvbiBPcGVyYXRpb25WYWxpZGF0aW9uRXJyb3Iob3BlcmF0aW9uLCBlcnJvcnMpe1xyXG4gIHRoaXMubmFtZSA9ICdPcGVyYXRpb25WYWxpZGF0aW9uRXJyb3InO1xyXG4gIHRoaXMubWVzc2FnZSA9IG9wZXJhdGlvbi5uaWNrbmFtZSArICcgZmFpbGVkIHZhbGlkYXRpb246IFxcblxcdCcgKyBlcnJvcnMuam9pbignXFxuXFx0Jyk7XHJcbn1cclxuT3BlcmF0aW9uVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSW52YWxpZFJlcXVlc3RFcnJvci5wcm90b3R5cGUpO1xyXG5PcGVyYXRpb25WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gT3BlcmF0aW9uVmFsaWRhdGlvbkVycm9yO1xyXG5cclxuZXhwb3J0cy5PcGVyYXRpb25WYWxpZGF0aW9uRXJyb3IgPSBPcGVyYXRpb25WYWxpZGF0aW9uRXJyb3I7XHJcblxyXG5cclxuZnVuY3Rpb24gUGFyYW1ldGVyVmFsaWRhdGlvbkVycm9yKHBhcmFtZXRlciwgZXJyb3JzKXtcclxuICB0aGlzLm5hbWUgPSAnUGFyYW1ldGVyVmFsaWRhdGlvbkVycm9yJztcclxuICB0aGlzLm1lc3NhZ2UgPSBwYXJhbWV0ZXIubmFtZSArICcgZmFpbGVkIHZhbGlkYXRpb246IFxcblxcdCcgKyBlcnJvcnMuam9pbignXFxuXFx0Jyk7XHJcbn1cclxuUGFyYW1ldGVyVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSW52YWxpZFJlcXVlc3RFcnJvci5wcm90b3R5cGUpO1xyXG5QYXJhbWV0ZXJWYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGFyYW1ldGVyVmFsaWRhdGlvbkVycm9yO1xyXG5cclxuZXhwb3J0cy5QYXJhbWV0ZXJWYWxpZGF0aW9uRXJyb3IgPSBQYXJhbWV0ZXJWYWxpZGF0aW9uRXJyb3I7XHJcblxyXG5cclxuZnVuY3Rpb24gRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IobWVzc2FnZSl7XHJcbiAgdGhpcy5uYW1lID0gJ0RhdGFUeXBlVmFsaWRhdGlvbkVycm9yJztcclxuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlIHx8ICdJbnZhbGlkIGRhdGEgdHlwZSc7XHJcbn1cclxuRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xyXG5EYXRhVHlwZVZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEYXRhVHlwZVZhbGlkYXRpb25FcnJvcjtcclxuXHJcbmV4cG9ydHMuRGF0YVR5cGVWYWxpZGF0aW9uRXJyb3IgPSBEYXRhVHlwZVZhbGlkYXRpb25FcnJvcjsiLCIndXNlIHN0cmljdCc7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldFJlcXVlc3RCb2R5KG9wZXJhdGlvbiwgZGF0YSwgaGVhZGVycyl7XHJcbiAgdmFyIGJvZHkgPSBvcGVyYXRpb24ucGFyYW1ldGVycy5maWx0ZXIoZnVuY3Rpb24ocGFyYW0pe1xyXG4gICAgcmV0dXJuIHBhcmFtLnBhcmFtVHlwZSA9PT0gJ2JvZHknICYmIGRhdGFbcGFyYW0ubmFtZV0gIT0gbnVsbDtcclxuICB9KS5tYXAoZnVuY3Rpb24ocGFyYW0pe1xyXG4gICAgcmV0dXJuIGRhdGFbcGFyYW0ubmFtZV07XHJcbiAgfSlbMF07XHJcblxyXG4gIGlmKCEoaGVhZGVycyAmJiAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10pKSByZXR1cm4gYm9keTtcclxuXHJcbiAgdmFyIGNvbnRlbnRUeXBlID0gaGVhZGVyc1snQ29udGVudC1UeXBlJ107XHJcbiAgdmFyIHByZXNlbnRGb3JtUGFyYW1zID0gb3BlcmF0aW9uLnBhcmFtZXRlcnMuZmlsdGVyKGZ1bmN0aW9uKHBhcmFtKXtcclxuICAgIHJldHVybiBwYXJhbS5wYXJhbVR5cGUgPT09ICdmb3JtJyAmJiBkYXRhW3BhcmFtLm5hbWVdICE9IG51bGw7XHJcbiAgfSk7XHJcblxyXG4gIGlmKGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpICE9PSAtMSl7XHJcbiAgICBib2R5ID0gcHJlc2VudEZvcm1QYXJhbXMubWFwKGZ1bmN0aW9uKHBhcmFtKXtcclxuICAgICAgdmFyIGtleSA9IHBhcmFtLm5hbWUsXHJcbiAgICAgICAgdmFsdWUgPSBkYXRhW2tleV07XHJcbiAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XHJcbiAgICB9KS5qb2luKCcmJyk7XHJcbiAgfSBlbHNlIGlmKGNvbnRlbnRUeXBlLmluZGV4T2YoJ211bHRpcGFydC9mb3JtLWRhdGEnKSAhPT0gLTEpe1xyXG4gICAgdmFyIHJhbmRvbW5lc3MgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zdWJzdHIoMik7XHJcbiAgICB2YXIgYm91bmRhcnkgPSAnU3dhZ2dlckJvdW5kYXJ5JyArIHJhbmRvbW5lc3M7XHJcbiAgICBcclxuICAgIGJvZHkgPSBwcmVzZW50Rm9ybVBhcmFtcy5tYXAoZnVuY3Rpb24ocGFyYW0pe1xyXG4gICAgICB2YXIga2V5ID0gcGFyYW0ubmFtZSxcclxuICAgICAgICB2YWx1ZSA9IGRhdGFba2V5XSxcclxuICAgICAgICByZXN1bHQgPSAnLS0nICsgYm91bmRhcnk7XHJcblxyXG4gICAgICByZXN1bHQgKz0gJ1xcbkNvbnRlbnQtRGlzcG9zaXRpb246IGZvcm0tZGF0YTsgbmFtZT1cIicgKyBrZXkgKyAnXCInO1xyXG4gICAgICBcclxuICAgICAgaWYodmFsdWUuY29udGVudFR5cGUpe1xyXG4gICAgICAgIGlmKHZhbHVlLm5hbWUpe1xyXG4gICAgICAgICAgcmVzdWx0ICs9ICc7IGZpbGVuYW1lPVwiJyArIHZhbHVlLm5hbWUgKyAnXCInO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzdWx0ICs9ICdcXG5Db250ZW50LVR5cGU6ICcgKyB2YWx1ZS5jb250ZW50VHlwZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYodmFsdWUuY29udGVudFRyYW5zZmVyRW5jb2Rpbmcpe1xyXG4gICAgICAgIHJlc3VsdCArPSAnXFxuQ29udGVudC1UcmFuc2Zlci1FbmNvZGluZzogJyArIHZhbHVlLmNvbnRlbnRUcmFuc2ZlckVuY29kaW5nO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZih2YWx1ZS5ib2R5KXtcclxuICAgICAgICByZXN1bHQgKz0gJ1xcblxcbicgKyB2YWx1ZS5ib2R5O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdCArPSAnXFxuXFxuJyArIHZhbHVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSkuam9pbignXFxuJyk7XHJcblxyXG4gICAgYm9keSArPSAnXFxuLS0nICsgYm91bmRhcnkgKyAnLS1cXG4nO1xyXG4gICAgXHJcbiAgICBoZWFkZXJzWydDb250ZW50LVR5cGUnXSA9IGNvbnRlbnRUeXBlLnJlcGxhY2UoXHJcbiAgICAgICdtdWx0aXBhcnQvZm9ybS1kYXRhJywgXHJcbiAgICAgICdtdWx0aXBhcnQvZm9ybS1kYXRhOyBib3VuZGFyeT0nICsgYm91bmRhcnlcclxuICAgICk7XHJcbiAgfSBlbHNlIGlmKGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSAhPT0gLTEpe1xyXG4gICAgaWYodHlwZW9mIGJvZHkgIT09ICdzdHJpbmcnKXtcclxuICAgICAgYm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGJvZHk7XHJcbn07IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGVycm9yVHlwZXMgPSByZXF1aXJlKCcuL2Vycm9yVHlwZXMnKSxcclxuICBDb250ZW50VHlwZU5vdFN1cHBvcnRlZEVycm9yID0gZXJyb3JUeXBlcy5Db250ZW50VHlwZU5vdFN1cHBvcnRlZEVycm9yLFxyXG4gIEFjY2VwdHNOb3RTdXBwb3J0ZWRFcnJvciA9IGVycm9yVHlwZXMuQWNjZXB0c05vdFN1cHBvcnRlZEVycm9yO1xyXG5cclxudmFyIERFRkFVTFRfQUNDRVBUID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGdldFJlcXVlc3RIZWFkZXJzKG9wZXJhdGlvbiwgZGF0YSwgb3B0aW9ucyl7XHJcbiAgZGF0YSA9IGRhdGEgfHwge307XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcblxyXG4gIHZhciBoZWFkZXJzID0ge307XHJcblxyXG4gIG9wZXJhdGlvbi5wYXJhbWV0ZXJzLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pe1xyXG4gICAgaWYocGFyYW0ucGFyYW1UeXBlID09PSAnaGVhZGVyJyAmJiBkYXRhW3BhcmFtLm5hbWVdICE9IG51bGwpe1xyXG4gICAgICBoZWFkZXJzW3BhcmFtLm5hbWVdID0gZGF0YVtwYXJhbS5uYW1lXTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgLy8gUGFzc2VkIGhlYWRlcnNcclxuICBpZihvcHRpb25zLmhlYWRlcnMpe1xyXG4gICAgT2JqZWN0LmtleXMob3B0aW9ucy5oZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgIGhlYWRlcnNba2V5XSA9IG9wdGlvbnMuaGVhZGVyc1trZXldO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBDb250ZW50LVR5cGVcclxuICB2YXIgY29udGVudFR5cGUgPSBvcHRpb25zLmNvbnRlbnRUeXBlIHx8IGdldENvbnRlbnRUeXBlKG9wZXJhdGlvbiwgZGF0YSwgb3B0aW9ucyk7XHJcbiAgaWYoY29udGVudFR5cGUpIHtcclxuICAgIGlmKGhhc0FjY2VwdChvcGVyYXRpb24sIGNvbnRlbnRUeXBlKSl7XHJcbiAgICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gY29udGVudFR5cGU7ICBcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRocm93IG5ldyBDb250ZW50VHlwZU5vdFN1cHBvcnRlZEVycm9yKGNvbnRlbnRUeXBlLCBvcGVyYXRpb24pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gQWNjZXB0XHJcbiAgdmFyIGFjY2VwdCA9IG9wdGlvbnMuYWNjZXB0IHx8IERFRkFVTFRfQUNDRVBUO1xyXG4gIGlmKGFjY2VwdCl7XHJcbiAgICBpZihoYXNDb250ZW50VHlwZShvcGVyYXRpb24sIGFjY2VwdCkpe1xyXG4gICAgICBoZWFkZXJzLkFjY2VwdCA9IGFjY2VwdDsgIFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhyb3cgbmV3IEFjY2VwdHNOb3RTdXBwb3J0ZWRFcnJvcihhY2NlcHQsIG9wZXJhdGlvbik7XHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBoZWFkZXJzO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2V0Q29udGVudFR5cGUob3BlcmF0aW9uLCBkYXRhKXtcclxuICB2YXIgaGFzQm9keSA9IG9wZXJhdGlvbi5wYXJhbWV0ZXJzLnNvbWUoZnVuY3Rpb24ocGFyYW0pe1xyXG4gICAgcmV0dXJuIHBhcmFtLnBhcmFtVHlwZSA9PT0gJ2JvZHknICYmIChwYXJhbS5uYW1lIGluIGRhdGEpO1xyXG4gIH0pO1xyXG5cclxuICBpZiAoaGFzQm9keSl7XHJcbiAgICByZXR1cm4gJ2FwcGxpY2F0aW9uL2pzb24nO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgaGFzRm9ybVBhcmFtcyA9IG9wZXJhdGlvbi5wYXJhbWV0ZXJzLnNvbWUoZnVuY3Rpb24ocGFyYW0pe1xyXG4gICAgICByZXR1cm4gcGFyYW0ucGFyYW1UeXBlID09PSAnZm9ybScgJiYgKHBhcmFtLm5hbWUgaW4gZGF0YSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB2YXIgaGFzRmlsZVBhcmFtID0gaGFzRm9ybVBhcmFtcyAmJiBcclxuICAgICAgb3BlcmF0aW9uLnBhcmFtZXRlcnMuc29tZShmdW5jdGlvbihwYXJhbSl7XHJcbiAgICAgICAgcmV0dXJuIHBhcmFtLnR5cGUgPT09ICdGaWxlJyAmJiAocGFyYW0ubmFtZSBpbiBkYXRhKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgaWYoaGFzRmlsZVBhcmFtKSByZXR1cm4gJ211bHRpcGFydC9mb3JtLWRhdGEnO1xyXG4gICAgZWxzZSBpZihoYXNGb3JtUGFyYW1zKSByZXR1cm4gJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBBY2NlcHRzIGlzIGFuIG9wdGlvbmFsIGZpZWxkIGluIHRoZSBzcGVjLCBidXQgbXVzdCBiZSBlbmZvcmNlZCB3aGVuIHByZXNlbnRcclxuZnVuY3Rpb24gaGFzQWNjZXB0KG9wZXJhdGlvbiwgY29udGVudFR5cGUpe1xyXG4gIHZhciBhcGlEZWNsYXJhdGlvbiA9IG9wZXJhdGlvbi5hcGlPYmplY3QuYXBpRGVjbGFyYXRpb247XHJcbiAgdmFyIGFjY2VwdHMgPSBvcGVyYXRpb24uY29uc3VtZXMgfHwgYXBpRGVjbGFyYXRpb24uY29uc3VtZXM7XHJcblxyXG4gIGlmKGFjY2VwdHMgJiYgYWNjZXB0cy5sZW5ndGgpe1xyXG4gICAgcmV0dXJuIGFjY2VwdHMuaW5kZXhPZihjb250ZW50VHlwZSkgIT09IC0xO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbn1cclxuZXhwb3J0cy5oYXNBY2NlcHQgPSBoYXNBY2NlcHQ7XHJcblxyXG4vLyBDb250ZW50LVR5cGUgKHByb2R1Y2VzKSBpcyBhbiBvcHRpb25hbCBmaWVsZCBpbiB0aGUgc3BlYywgYnV0IG11c3QgYmUgZW5mb3JjZWQgd2hlbiBwcmVzZW50XHJcbmZ1bmN0aW9uIGhhc0NvbnRlbnRUeXBlKG9wZXJhdGlvbiwgY29udGVudFR5cGUpe1xyXG4gIHZhciBhcGlEZWNsYXJhdGlvbiA9IG9wZXJhdGlvbi5hcGlPYmplY3QuYXBpRGVjbGFyYXRpb24sXHJcbiAgICBjb250ZW50VHlwZXMgPSBvcGVyYXRpb24ucHJvZHVjZXMgfHwgYXBpRGVjbGFyYXRpb24ucHJvZHVjZXM7XHJcblxyXG4gIGlmKGNvbnRlbnRUeXBlcyAmJiBjb250ZW50VHlwZXMubGVuZ3RoKXtcclxuICAgIHJldHVybiBjb250ZW50VHlwZXMuaW5kZXhPZihjb250ZW50VHlwZSkgIT09IC0xO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbn1cclxuZXhwb3J0cy5oYXNDb250ZW50VHlwZSA9IGhhc0NvbnRlbnRUeXBlOyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBlcnJvclR5cGVzID0gcmVxdWlyZSgnLi9lcnJvclR5cGVzJyksXHJcbiAgTWlzc2luZ1BhdGhQYXJhbXNFcnJvciA9IGVycm9yVHlwZXMuTWlzc2luZ1BhdGhQYXJhbXNFcnJvcjtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2V0UmVxdWVzdFVybChvcGVyYXRpb24sIGRhdGEpe1xyXG4gIHZhciB1cmwgPSBnZXRVcmxUZW1wbGF0ZShvcGVyYXRpb24pO1xyXG5cclxuICB1cmwgPSBhcHBseVBhdGhQYXJhbXModXJsLCBvcGVyYXRpb24sIGRhdGEpO1xyXG5cclxuICBpZighZGF0YSkgcmV0dXJuIHVybDtcclxuXHJcbiAgdmFyIHF1ZXJ5UGFyYW1zID0gb3BlcmF0aW9uLnBhcmFtZXRlcnMuZmlsdGVyKGZ1bmN0aW9uKHBhcmFtKXtcclxuICAgIHJldHVybiBwYXJhbS5wYXJhbVR5cGUgPT09ICdxdWVyeScgJiYgZGF0YVtwYXJhbS5uYW1lXSAhPT0gdW5kZWZpbmVkO1xyXG4gIH0pLm1hcChmdW5jdGlvbihwYXJhbSl7XHJcbiAgICB2YXIga2V5ID0gcGFyYW0ubmFtZTtcclxuICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChkYXRhW2tleV0pO1xyXG4gIH0pLmpvaW4oJyYnKTtcclxuXHJcbiAgaWYocXVlcnlQYXJhbXMpIHVybCArPSAnPycgKyBxdWVyeVBhcmFtcztcclxuXHJcbiAgcmV0dXJuIHVybDtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGFwcGx5UGF0aFBhcmFtcyh1cmwsIG9wZXJhdGlvbiwgZGF0YSl7XHJcbiAgdmFyIHBhdGhQYXJhbXMgPSBvcGVyYXRpb24ucGFyYW1ldGVycy5maWx0ZXIoZnVuY3Rpb24ocGFyYW0pe1xyXG4gICAgcmV0dXJuIHBhcmFtLnBhcmFtVHlwZSA9PT0gJ3BhdGgnO1xyXG4gIH0pO1xyXG5cclxuICB2YXIgbWlzc2luZ1BhcmFtcyA9IHBhdGhQYXJhbXMuZmlsdGVyKGZ1bmN0aW9uKHBhcmFtKXtcclxuICAgIHJldHVybiBkYXRhW3BhcmFtLm5hbWVdID09PSB1bmRlZmluZWQ7XHJcbiAgfSk7XHJcblxyXG4gIGlmKG1pc3NpbmdQYXJhbXMubGVuZ3RoKXtcclxuICAgIHRocm93IG5ldyBNaXNzaW5nUGF0aFBhcmFtc0Vycm9yKG1pc3NpbmdQYXJhbXMubWFwKGZ1bmN0aW9uKHBhcmFtKXtcclxuICAgICAgcmV0dXJuIHBhcmFtLm5hbWU7XHJcbiAgICB9KSk7XHJcbiAgfVxyXG5cclxuICBwYXRoUGFyYW1zLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pe1xyXG4gICAgdmFyIGtleSA9IHBhcmFtLm5hbWU7XHJcbiAgICBcclxuICAgIHZhciBleHAgPSBuZXcgUmVnRXhwKCd7JyArIGtleSArICdbXn1dKn0nLCAnZ2knKTtcclxuXHJcbiAgICB2YXIgdmFsdWUgPSBkYXRhW2tleV0udG9TdHJpbmcoKTtcclxuICAgIGRlbGV0ZSBkYXRhW2tleV07XHJcbiAgICB2YWx1ZSA9IHZhbHVlLnNwbGl0KCcvJykubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbignLycpO1xyXG5cclxuICAgIHVybCA9IHVybC5yZXBsYWNlKGV4cCwgdmFsdWUpO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gdXJsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRVcmxUZW1wbGF0ZShvcGVyYXRpb24pe1xyXG4gIHZhciBhcGlPYmplY3QgPSBvcGVyYXRpb24uYXBpT2JqZWN0OyBcclxuXHJcbiAgdmFyIGJhc2VQYXRoID0gYXBpT2JqZWN0LmFwaURlY2xhcmF0aW9uLmJhc2VQYXRoO1xyXG4gIHZhciBwYXRoID0gYXBpT2JqZWN0LnBhdGgucmVwbGFjZSgne2Zvcm1hdH0nLCAnanNvbicpO1xyXG4gIFxyXG4gIHJldHVybiBiYXNlUGF0aCArIHBhdGg7XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLy8gUHJvbWlzZSBwb2x5ZmlsbFxyXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcclxudmFyIGNsaWVudEdlbmVyYXRvciA9IHJlcXVpcmUoJ3N3YWdnZXItY2xpZW50LWdlbmVyYXRvcicpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzY2hlbWEpe1xyXG4gIHJldHVybiBjbGllbnRHZW5lcmF0b3Ioc2NoZW1hLCByZXF1ZXN0SGFuZGxlcik7XHJcbn07XHJcblxyXG4vLyBGb3IgbW9ja2luZyBkdXJpbmcgdW5pdCB0ZXN0aW5nXHJcbmlmKHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAhPT0gJ3VuZGVmaW5lZCcpe1xyXG4gIG1vZHVsZS5leHBvcnRzLlhNTEh0dHBSZXF1ZXN0ID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXF1ZXN0SGFuZGxlcihlcnJvciwgcmVxdWVzdCl7XHJcbiAgdmFyIFhNTEh0dHBSZXF1ZXN0ID0gbW9kdWxlLmV4cG9ydHMuWE1MSHR0cFJlcXVlc3Q7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICBpZihlcnJvcikgcmV0dXJuIHJlamVjdChlcnJvcik7XHJcblxyXG4gICAgdmFyIG1ldGhvZCA9IHJlcXVlc3QubWV0aG9kO1xyXG4gICAgdmFyIHVybCA9IHJlcXVlc3QudXJsO1xyXG4gICAgdmFyIGJvZHkgPSByZXF1ZXN0LmJvZHk7XHJcbiAgICB2YXIgaGVhZGVycyA9IHJlcXVlc3QuaGVhZGVycztcclxuXHJcbiAgICB2YXIgb3B0aW9ucyA9IHJlcXVlc3Qub3B0aW9ucztcclxuICAgIHZhciBhc3luYyA9ICgnYXN5bmMnIGluIG9wdGlvbnMpPyBvcHRpb25zLmFzeW5jIDogdHJ1ZTtcclxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHJcbiAgICB4aHIub3BlbihtZXRob2QsIHVybCwgYXN5bmMpO1xyXG5cclxuICAgIGlmKGhlYWRlcnMpe1xyXG4gICAgICBPYmplY3Qua2V5cyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcil7XHJcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyLCBoZWFkZXJzW2hlYWRlcl0pO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYob3B0aW9ucy53aXRoQ3JlZGVudGlhbHMpIHhoci53aXRoQ3JlZGVudGlhbHMgPSBvcHRpb25zLndpdGhDcmVkZW50aWFscztcclxuICAgIGlmKG9wdGlvbnMudGltZW91dCkgeGhyLnRpbWVvdXQgPSBvcHRpb25zLnRpbWVvdXQ7XHJcbiAgICBpZihvcHRpb25zLm9uYWJvcnQpIHhoci5vbmFib3J0ID0gb3B0aW9ucy5vbmFib3J0O1xyXG4gICAgaWYob3B0aW9ucy5vbmVycm9yKSB4aHIub25lcnJvciA9IG9wdGlvbnMub25lcnJvcjtcclxuICAgIGlmKG9wdGlvbnMub25sb2FkKSB4aHIub25sb2FkID0gb3B0aW9ucy5vbmxvYWQ7XHJcbiAgICBpZihvcHRpb25zLm9udGltZW91dCkgeGhyLm9udGltZW91dCA9IG9wdGlvbnMub250aW1lb3V0O1xyXG4gICAgaWYob3B0aW9ucy5vbnByb2dyZXNzKSB4aHIub25wcm9ncmVzcyA9IG9wdGlvbnMub25wcm9ncmVzcztcclxuXHJcbiAgICB4aHIub25sb2FkZW5kID0gZnVuY3Rpb24oKXtcclxuICAgICAgdmFyIGRhdGEgPSB0aGlzLnJlc3BvbnNlO1xyXG4gICAgICB2YXIgY29udGVudFR5cGUgPSB0aGlzLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LVR5cGUnKTtcclxuXHJcbiAgICAgIGlmKGNvbnRlbnRUeXBlICYmIGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSAhPT0gLTEpe1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICB9IGNhdGNoKGVycm9yKXtcclxuICAgICAgICAgIHJlamVjdCh7IFxyXG4gICAgICAgICAgICBlcnJvcjogZXJyb3IsXHJcbiAgICAgICAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXHJcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYodGhpcy5zdGF0dXMgPCAyMDAgfHwgdGhpcy5zdGF0dXMgPj0gMzAwKXtcclxuICAgICAgICByZWplY3Qoe1xyXG4gICAgICAgICAgZXJyb3I6IGVycm9yLFxyXG4gICAgICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcclxuICAgICAgICAgIGRhdGE6IGRhdGFcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXNvbHZlKGRhdGEpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZihvcHRpb25zLm9ubG9hZGVuZCkgb3B0aW9ucy5vbmxvYWRlbmQuY2FsbCh0aGlzKTtcclxuICAgIH07XHJcblxyXG4gICAgeGhyLnNlbmQoYm9keSk7XHJcbiAgfSk7XHJcbn1cclxuIl19
(26)
});
