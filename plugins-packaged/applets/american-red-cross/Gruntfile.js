module.exports = function(grunt) {

  // Project Configuration
  grunt.initConfig({
    exec: {
      clear: {
        command: 'rm -Rf bower_components node_modules'
      },
    },
    copy: {
      release: {
        files: [{
          expand: true,
          cwd: '',
          src: [
            'config.json',
            'skins/**'
          ],
          dest: 'dist/'
        }]
      },
      publish_local: {
        files: [{
          expand: true,
          cwd: 'dist',
          src: ['config.json', 'skins/**'],
          dest: '../../../plugins/applets/american-red-cross/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('default', ['copy:release']);
  grunt.registerTask('local', ['default', 'copy:publish_local']);
  grunt.registerTask('prod', ['default', 'copy:release']);
};
