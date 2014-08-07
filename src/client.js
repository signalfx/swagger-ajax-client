'use strict';

// Promise polyfill
require('../bower_components/es6-promise/promise');

var clientGenerator = require('../bower_components/swagger-client-generator/dist/swagger-client-generator');

module.exports = function(schema){
  return clientGenerator(schema, requestHandler);
};

// For mocking during unit testing
module.exports.XMLHttpRequest = XMLHttpRequest;

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
      var contentType = this.getResponseHeader('Content-Type');

      var data = this.response;
      if(contentType && contentType.indexOf('application/json') !== -1){
        try {
          data = JSON.parse(data);
          resolve(data);
        } catch(e){
          reject(e, this.response);
        }
      } else {
        resolve(this.response);
      }
      
      if(options.onloadend) options.onloadend.call(this);
    };

    xhr.send(body);
  });
}
