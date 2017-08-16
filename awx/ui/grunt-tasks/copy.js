var staticFiles = ['angular-tz-extensions/tz/data/*',
    'angular-scheduler/lib/angular-scheduler-detail.html',
    'angular-scheduler/lib/angular-scheduler.html',
    'nvd3/build/nv.d3.css',
    'ng-toast/dist/ngToast.min.css',
    'codemirror/addon/lint/lint.css',
    'codemirror/theme/elegant.css',
    'codemirror/lib/codemirror.css',
    'select2/dist/css/select2.css',
    'components-font-awesome/css/font-awesome.min.css',
    'components-font-awesome/fonts/fontawesome-webfont.ttf',
    'components-font-awesome/fonts/fontawesome-webfont.woff',
    'components-font-awesome/fonts/fontawesome-webfont.woff2'
];

module.exports = {
    fonts: {
        files: [{
            cwd: 'client/',
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'assets/fontcustom/**/*',
            dest: 'static/fonts/'
        }]
    },
    icons: {
        files: [{
            cwd: 'node_modules/',
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'components-font-awesome/fonts/*',
            dest: 'static/fonts/'
        }]
    },
    images: {
        files: [{
            cwd: 'client/',
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'assets/custom-theme/images.new/*',
            dest: 'static/images/'
        }]
    },
    assets: {
        files: [{
            cwd: 'client/',
            expand: true,
            src: 'assets/**/*',
            dest: 'static/'
        }]
    },
    vendor: {
        files: [{
            expand: true,
            cwd: 'node_modules/',
            src: staticFiles,
            dest: 'static/lib/'
        }]
    },
    views: {
        files: [{
            cwd: 'client/features',
            expand: true,
            src: ['**/*.view.html'],
            dest: 'static/views/'
        }]
    },
    partials: {
        files: [{
            cwd: 'client/src',
            expand: true,
            src: ['**/*.partial.html'],
            dest: 'static/partials'
        }, {
            cwd: 'client/src/partials',
            expand: true,
            src: ['*.html'],
            dest: 'static/partials/'
        }, {
            cwd: 'client/lib/components',
            expand: true,
            src: ['**/*.partial.html'],
            dest: 'static/partials/components/'
        }]
    },
    languages: {
        files: [{
            cwd: 'client/',
            expand: true,
            src: 'languages/*.json',
            dest: 'static/'
        }]
    },
    config: {
        files: { 'static/config.js': ['client/src/config.js'] }
    }
};
