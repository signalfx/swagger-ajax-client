'use strict';

var ajaxClient = require('./client');

describe('ajax client', function(){
  var schema,
    mockXHR,
    promise,
    requestHandler;

  beforeEach(function(){
    mockXHR = jasmine.createSpyObj('XMLHttpRequest', [
      'open', 
      'send', 
      'setRequestHeader',
      'getResponseHeader'
    ]);

    ajaxClient.XMLHttpRequest = function(){
      return mockXHR;
    };

    promise = {
      then: jasmine.createSpy('promise.then')
    };

    requestHandler = jasmine.createSpy('requestHandler').and.returnValue(promise);

    schema = {
      apis: [{
        apiDeclaration: {
          resourcePath: '/resource',
          basePath: 'http://example.com/api',
          apis: [{
            path: '/resource/all-of-it',
            operations: [{
              method: 'GET',
              nickname: 'doIt',
              parameters: [
                {
                  paramType: 'query',
                  type: 'string',
                  name: 'queryParam'
                },
                {
                  paramType: 'body',
                  type: 'string',
                  name: 'theBody'
                },
                {
                  paramType: 'header',
                  type: 'string',
                  name: 'headerParam'
                }
              ]
            }]            
          }]
        }
      }]
    };
  });

  it('has resources as the first-level keys', function(){
    var client = ajaxClient(schema);
    expect(client.resource).toBeDefined();
  });

  it('has operations as the second-level keys', function(){
    var client = ajaxClient(schema);
    expect(client.resource.doIt).toBeDefined();
  });

  it('calls xhr open with the correct method, url, and async options', function(){
    var client = ajaxClient(schema);

    client.resource.doIt({queryParam: '1'});
    expect(mockXHR.open)
      .toHaveBeenCalledWith('GET', 'http://example.com/api/resource/all-of-it?queryParam=1', true);
  });

  it('calls xhr send with body', function(){
    var client = ajaxClient(schema);

    client.resource.doIt({theBody: '1'});

    expect(mockXHR.send)
      .toHaveBeenCalledWith('1');
  });

  it('adds header param to xhr', function(){
    var client = ajaxClient(schema);

    client.resource.doIt({headerParam: '1'});

    expect(mockXHR.setRequestHeader)
      .toHaveBeenCalledWith('headerParam', '1');
  });

  it('returns the response from the server', function(done){
    var client = ajaxClient(schema);

    var promise = client.resource.doIt({theBody: '1'});
    mockXHR.response = 'response';
    mockXHR.onloadend();

    promise.then(function(response){
      expect(response).toBe('response');
      done();
    });
  });

  it('auto parses json response from the server', function(done){
    var client = ajaxClient(schema);

    var promise = client.resource.doIt({theBody: '1'});
    mockXHR.response = '{"response": 1}';
    mockXHR.getResponseHeader.and.returnValue('application/json');
    mockXHR.onloadend();

    promise.then(function(response){
      expect(response).toEqual({response: 1});
      done();
    });
  });

  it('reject the promise when unable to parse reported json', function(done){
    var client = ajaxClient(schema);

    var promise = client.resource.doIt({theBody: '1'});
    mockXHR.response = '{"response"';
    mockXHR.getResponseHeader.and.returnValue('application/json');
    mockXHR.onloadend();

    promise.catch(function(){
      done();
    });
  });

});