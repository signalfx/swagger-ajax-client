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
  if(error) throw error;
  
  var method = requestData.method;
  var url = requestData.url;
  var body = requestData.body;
  var headers = requestData.headers;

  var options = requestData.options;
  var async = ('async' in options)? options.async : true;

  var xhr = new XMLHttpRequest();
  
  xhr.open(method, url, async)
  xhr.withCredentials = true;

  if(headers){
    Object.keys(headers).forEach(function(header){
      xhr.setRequestHeader(header, headers[header]);
    });
  }

  xhr.onloadend = function(){
    if(this.status === 200){
      resolve;
    } else {
      reject;
    }
  };

  xhr.send(body);
}
