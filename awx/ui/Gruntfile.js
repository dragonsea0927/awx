module.exports = function(grunt) {
    // Load grunt tasks & configurations automatically from dir grunt/
    require('load-grunt-tasks')(grunt);
    // display task timings
    require('time-grunt')(grunt);

    var options = {
        config: {
            src: './grunt-tasks/*.js'
        },
        pkg: grunt.file.readJSON('package.json')
    };

    var configs = require('load-grunt-configs')(grunt, options);

    // Project configuration.
    grunt.initConfig(configs);
    grunt.loadNpmTasks('grunt-newer');
    grunt.loadNpmTasks('grunt-angular-gettext');

    // writes environment variables for development. current manages:
    // browser-sync + websocket proxy

    grunt.registerTask('sync', [
        'browserSync:http',
        'concurrent:watch'
    ]);

    grunt.registerTask('dev', [
        'clean:tmp',
        'clean:static',
        'concurrent:dev',
        'concat:css',
        'webpack:dev',
        'sync'
    ]);

    grunt.registerTask('devNoSync', [
        'clean:tmp',
        'clean:static',
        'concurrent:devNoSync',
        'concat:css'
    ]);

    grunt.registerTask('release', [
        'clean:tmp',
        'clean:static',
        'concurrent:prod',
        'webpack:prod',
        'concat:css',
        'cssmin:vendor',
        'cssmin:source'
    ]);
};
