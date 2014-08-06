'use strict';

var clientGenerator = require('../bower_components/swagger-client-generator/dist/swagger-client-generator');

module.exports = clientGenerator;

module.exports = function(schema){
  return clientGenerator(schema, requestHandler);
};

var events = [
  'abort',
  'error',
  'load',
  'loadend',
  'loadstart',
  'progress',
  'readystatechange',
  'timeout'
];

function requestHandler(error, requestData){
  return new Promise(function(resolve, reject){
    if(error) return reject(error);
    
    var method = requestData.method;
    var url = requestData.url;
    var body = requestData.body;
    var headers = requestData.headers;

    var options = requestData.options;
    var async = ('async' in options)? options.async : true;
    var withCredentials = ('withCredentials' in options)? options.withCredentials : false;
    var xhr = new XMLHttpRequest();
    
    xhr.open(method, url, async)
    xhr.withCredentials = withCredentials;
    xhr.timeout = 1;
    if(headers){
      Object.keys(headers).forEach(function(header){
        xhr.setRequestHeader(header, headers[header]);
      });
    }

    xhr.onabort = function(){
      console.error('aborted', error, arguments);
    };
    xhr.onerror = function(){
      console.error('error', error, arguments);
    };
    xhr.load = function(){};

    xhr.timeout = function(){
      console.error('timeout', error, arguments);
    };

    xhr.onloadend = function(){
      var contentType = this.getResponseHeader('Content-Type');

      var data = this.response;
      if(contentType.indexOf('application/json') !== -1){
        try {
          data = JSON.parse(data);
          resolve(data);
        } catch(e){
          reject(e, this.response);
        }
      } else {
        resolve(this.response);
      }
    };

    xhr.send(body);
  });
}
