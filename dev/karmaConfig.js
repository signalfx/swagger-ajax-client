module.exports = {
  files: [
    'bower_components/swagger-client-generator/dist/swagger-client-generator.js',
    'src/**/*.js'
  ],

  preprocessors: {
    '**/{src,bower_components}/**/*.js': ['commonjs']
  },

  browsers: ['PhantomJS']
};