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
      css: {
        files: ['src/css/*.css'],
        tasks: ['concat:css']
      },
      main: {
        files: [
          'src/js/app.js',
          'src/js/controllers/*.js',
          'src/js/directives/*.js',
          'src/js/filters/*.js',
          'src/js/models/*.js',
          'src/js/services/*.js'
        ],
        tasks: ['concat:js']
      }
    },
    sass: {
      dist: {
        options: {
          style: 'compact',
          sourcemap: 'none'
        },
        files: [{
          expand: true,
          src: ['src/sass/*.scss'],
          dest: './',
          ext: '.css'
        }]
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
          'src/js/controllers/**/*.js',
          'src/js/directives/*.js',
          'src/js/filters/*.js',
          'src/js/models/*.js',
          'src/js/services/*.js'
        ],
        dest: 'public/js/paymentcs.js'
      },
      css: {
        src: ['src/css/*.css', 'src/sass/*.css'],
        dest: 'public/css/paymentcs.css'
      },
      paymentcs_lib_js: {
        src: [
          'bower_components/roundSlide/dist/roundslider.min.js'
        ],
        dest: 'public/js/paymentcs.lib.js'
      },
      paymentcs_lib_css: {
        src: [
          'bower_components/roundSlide/dist/roundslider.min.css'
        ],
        dest: 'public/css/paymentcs.lib.css'
      },
       copay_plugin_client_bundle_js: {
        src: [
          'bower_components/ng-lodash/build/ng-lodash.js',
          'bower_components/ionic/release/js/ionic.bundle.min.js',
          // 'bower_components/copay-plugin-client/dist/copay-plugin-client.js',
          '../../../plugin-client/dist/copay-plugin-client.js'
        ],
        dest: '../js/copay-plugin-client.bundle.js'
      },
      copay_plugin_client_bundle_css: {
        src: [
          'bower_components/ionic/release/css/ionic.min.css',
          // 'bower_components/copay-plugin-client/dist/copay-plugin-client.css',
          '../../../plugin-client/dist/copay-plugin-client.css'
        ],
        dest: '../css/copay-plugin-client.bundle.css'
      },
    },
    uglify: {
      options: {
        mangle: false
      },
      prod: {
        files: {
          'public/js/paymentcs.js': ['public/js/paymentcs.js']
        }
      }
    },
    nggettext_extract: {
      pot: {
        files: {
          'i18n/po/template.pot': [
            'public/views/*.html',
            'public/views/**/*.html',
            'src/js/services/*.js',
            'src/js/controllers/*.js'
          ]
        }
      },
    },
    nggettext_compile: {
      all: {
        options: {
          module: 'paymentcsApp'
        },
        files: {
          'src/js/translations.js': ['i18n/po/*.po']
        }
      },
    },
    copy: {
      release: {
        files: [{
          expand: true,
          cwd: '',
          src: [
            'config.json',
            'public/index.html',
            'public/css/**',
            'public/js/**',
            'public/img/**',
            'public/views/**',
            'skins/**'
          ],
          dest: 'dist/'
        }]
      },
      publish_local: {
        files: [{
          expand: true,
          cwd: 'dist',
          src: ['config.json', 'public/**', 'skins/**'],
          dest: '../../../plugins/applets/paymentcs/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-angular-gettext');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-remove');
  grunt.loadNpmTasks('grunt-replace');

  grunt.registerTask('default', ['concat', 'copy:release']);
  grunt.registerTask('local', ['default', 'copy:publish_local']);
  grunt.registerTask('prod', ['default', 'uglify', 'copy:release']);
  grunt.registerTask('translate', ['nggettext_extract']);
};
