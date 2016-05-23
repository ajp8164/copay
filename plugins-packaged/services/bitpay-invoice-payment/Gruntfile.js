module.exports = function(grunt) {

  // Project Configuration
  grunt.initConfig({
    exec: {
      clear: {
        command: 'rm -Rf bower_components node_modules'
      },
    },
    watch: {
      options: {
        dateFormat: function(time) {
          grunt.log.writeln('The watch finished in ' + time + 'ms at ' + (new Date()).toString());
          grunt.log.writeln('Waiting for more changes...');
        },
      },
      main: {
        files: [
          'src/js/**/*.js',
        ],
        tasks: ['concat:js']
      }
    },
    concat: {
      options: {
        sourceMap: false,
        sourceMapStyle: 'link' // embed, link, inline
      },
      js: {
        src: [
          'src/js/app.js',
          'src/js/**/*.js'
        ],
        dest: 'build/js/bitpayInvoicePaymentService.js'
      },
      bitpay_invoice_payment_service_lib_js: {
        src: [
        ],
        dest: 'build/js/bitpayInvoicePaymentService.lib.js'
      },
       copay_plugin_client_bundle_js: {
        src: [
          'bower_components/ng-lodash/build/ng-lodash.js',
          // 'bower_components/copay-plugin-client/dist/copay-plugin-client.js',
          '../../../plugin-client/dist/copay-plugin-client.js'
        ],
        dest: '../js/copay-plugin-client.bundle.js'
      },
    },
    uglify: {
      options: {
        mangle: false
      },
      prod: {
        files: {
          'build/js/bitpayInvoicePaymentService.js': ['build/js/bitpayInvoicePaymentService.js']
        }
      }
    },
    copy: {
      release: {
        files: [{
          expand: true,
          cwd: '',
          src: [
            'config.json',
            'build/js/**',
          ],
          dest: 'dist/',
          rename: function(dest, src) {
            return dest + src.replace(/build\//g, '');
          }
        }]
      },
      publish_local: {
        files: [{
          expand: true,
          cwd: 'dist',
          src: ['config.json', 'js/**'],
          dest: '../../../plugins/services/bitpay-invoice-payment/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-remove');
  grunt.loadNpmTasks('grunt-replace');

  grunt.registerTask('default', ['concat', 'copy:release']);
  grunt.registerTask('local', ['default', 'copy:publish_local']);
  grunt.registerTask('prod', ['default', 'uglify', 'copy:release']);
};
