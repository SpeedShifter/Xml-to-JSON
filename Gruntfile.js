/**
 * @description Xml-to-JSON
 * @author Sam Tsvilik
 * @author Stas Yermakov <speeedshifter@gmail.com>
 */

module.exports = function(grunt) {
  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Configurable paths for the application
  var appConfig = {
    app: require('./bower.json').appPath || '',
    dist: ''
  };

  // Project configuration.
  grunt.initConfig({
    yeoman: appConfig,

    uglify: {
      options: {
        mangle: false
      },
      dist: {
        expand: true,
        cwd: '<%= yeoman.app %>',
        src: ['*.js', '!Gruntfile.js', '!*.min.js'],
        dest: '<%= yeoman.dist %>',
        extDot: 'last',
        ext: '.min.js'
      }
    }
  });

  grunt.registerTask('build', [
    'uglify:dist'
  ]);

  grunt.registerTask('default', [
    'build'
  ]);
};