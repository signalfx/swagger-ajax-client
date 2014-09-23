# Swagger Ajax Client

Create XHR clients for [Swagger API Specifications](https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md).

Given a schema object, this tool returns an api object which can be used to interact with the API server
described by the schema. The schema can easily be generated using  [fetch-swagger-schema](https://github.com/signalfuse/fetch-swagger-schema)).

# Usage
To use, include one of these files in your application: 
* *[swagger-ajax-client.js](https://raw.githubusercontent.com/signalfuse/swagger-ajax-client/master/dist/swagger-ajax-client.js)*
* *[swagger-ajax-client.js.min](https://raw.githubusercontent.com/signalfuse/swagger-ajax-client/master/dist/swagger-ajax-client.min.js)*, a minified version ([source map](https://raw.githubusercontent.com/signalfuse/swagger-ajax-client/master/dist/swagger-ajax-client.min.js.map))

You may also `bower install swagger-ajax-client` to install using bower. Once you've included the script, you can use the swaggerAjaxClient function to generate the api using a given schema object.

Schemas can be generated using [fetch-swagger-schema](https://github.com/signalfuse/fetch-swagger-schema).


## Examples

First, a simple example. Let's say you saved a schema json file, then loaded it
into your app as the `schema` variable. Now you can call operations on the API
by using swaggerAjaxClient:
```javascript
// Assuming the variable schema exists
var api = swaggerAjaxClient(schema);

// for apiKey authorization use: api.auth('my-token')
// for basicAuth use: api.auth('username', 'password')

api.pet.getPetById(id).then(function(pet){
  console.log(pet);
});
```


Here's a more advanced case in which we're leveraging promises to implement a
'getOrCreate' method, which doesn't actually exist within the api:
```javascript

var api = swaggerAjaxClient(schema);

function getOrCreate(id, name){
    return api.pet.getPetById(id).catch(function(response){
        // If pet doesn't exist, create a new one.
        if(response.status === 404){
            var pet = {id: id, name: name};
            return api.pet.addPet(pet).then(function(){
                return pet;
            });
        }

        // Unknown error
        console.error(response.error.toString());
    });
}

getOrCreate(23, 'bob').then(function(pet){
    console.log('Got pet:', pet);
}, function(error){
    console.error(error.toString());
});
```

## API

#### `api = swaggerAjaxClient(schema)`
* *schemaObject* - A json object describing the schema (generated by [fetch-swagger-schema](https://github.com/signalfuse/fetch-swagger-schema)).
* *api* - An object which can be used as the api for the given schema. The first-level objects are the resources within the schema and the second-level functions are the operations which can be performed on those resources.

#### `api.<resource>`
A map of all the resources as defined in the schema to their operation handler (e.g. `api.pet`).

#### `responsePromise = api.<resource>.<operationHandler>(data, options)`
This is the actual operation function to initiate a request to the API endpoint (e.g., `api.pet.getPetById`).

The operation handler takes two parameters:
* *data* - A map of the operation data parameters. If the operation only has one parameter, the value may be used directly (i.e. `api.pet.getPetById(1, callback)` is the same as `api.pet.getPetById({petId: 1}, callback)`).
* *options* - A map of the options to use when calling the operation (see below for full list).

The response promise is an ES6 promise. A HTTP response in the 200s range will result
in a resolved promise and anything else will result in a rejected promises. A resolved
promise value is whatever the server responded with (JSON is automatically parsed).  A
rejected promise value is a map with a `status`, `data`, and `error` properties, where
the status is the HTTP status, data is the response body from the server, and error
is a JavaScript error (if any occurred).

Here's an example:
```javascript
// use of .then(successHandler, failHandler)
responsePromise.then(function(response){
    console.log('successful response:', response);
}, function(response){
    console.log('request failed due to error:', response.error);
});
```

## Developing
After installing [nodejs](http://nodejs.org) execute the following:

```shell
git clone https://github.com/signalfuse/swagger-ajax-client.git
cd swagger-ajax-client
npm install
npm run dev
```
The build engine will test and build everything, start a server hosting the `example` folder on [localhost:3000](http://localhost:3000), and watch for any changes and rebuild when nescessary.

To generate minified files in `dist`:
```shell
npm run dist
```
