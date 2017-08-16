var awx_env,
    path = require('path'),
    webpack = require('webpack'),
    options = require('minimist')(JSON.parse(process.env.npm_config_argv).remain),
    merge = require('lodash').merge;

awx_env = {
    'proxy': {
        'django_host': process.env.npm_package_config_django_host,
        'django_port': process.env.npm_package_config_django_port
    }
};
merge(awx_env, options);

var vendorPkgs = [
    'angular',
    'angular-breadcrumb',
    'angular-codemirror',
    'angular-cookies',
    'angular-drag-and-drop-lists',
    'angular-duration-format',
    'angular-gettext',
    'angular-md5',
    'angular-moment',
    'angular-sanitize',
    'angular-scheduler',
    'angular-tz-extensions',
    'angular-ui-router',
    'bootstrap',
    'bootstrap-datepicker',
    'codemirror',
    'd3',
    //'javascript-detect-element-resize', // jquery-flavored dist is alias'd below
    'jquery',
    'jquery-ui',
    'js-yaml',
    'lodash',
    'lr-infinite-scroll',
    'moment',
    'ng-toast',
    'nvd3',
    'select2',
    'sprintf-js',
    'reconnectingwebsocket'
];

var baseConfig = function() {
    return {
        entry: {
            app: './client/src/app.js',
            vendor: vendorPkgs
        },
        output: {
            path: './static/',
            filename: 'app.js'
        },
        plugins: [
            // vendor shims:
            // [{expected_local_var : dependency}, ...]
            new webpack.ProvidePlugin({
                '$': 'jquery',
                'jQuery': 'jquery',
                'window.jQuery': 'jquery',
                '_': 'lodash',
                'CodeMirror': 'codemirror',
                'jsyaml': 'js-yaml',
                'jsonlint': 'codemirror.jsonlint'
            }),
            new webpack.optimize.CommonsChunkPlugin('vendor', 'app.vendor.js')
        ],
        module: {
            loaders: [
                {
                    // disable AMD loading (broken in this lib) and default to CommonJS (not broken)
                    test: /\.angular-tz-extensions.js$/,
                    loader: 'imports?define=>false'
                },
                {
                    // es6 -> es5
                    test: /\.js$/,
                    loader: 'babel-loader',
                    exclude: /(node_modules)/,
                    query: {
                        presets: ['es2015']
                    }
                },
                {
                    test: /\.json$/,
                    loader: 'json-loader',
                    exclude: /(node_modules)/
                }
            ]
        },
        resolve: {
            alias: {
                'codemirror.jsonlint': path.resolve() + '/node_modules/codemirror/addon/lint/json-lint.js',
                'jquery.resize': path.resolve() + '/node_modules/javascript-detect-element-resize/jquery.resize.js',
                'select2': path.resolve() + '/node_modules/select2/dist/js/select2.full.js'
            }
        }
    };
};

var dev = baseConfig();

dev.devtool = 'inline-source-map';
dev.watch = true;
dev.plugins.push(new webpack.DefinePlugin({ $ENV: JSON.stringify(awx_env) }));
dev.module.preLoaders = [
    {
        test: /\.js?$/,
        loader: 'jshint-loader',
        exclude: ['/(node_modules)/'],
        include: [path.resolve() + '/client/src/'],
        jshint: {
            emitErrors: true
        }
    }
];

var release = baseConfig();

release.plugins.push(new webpack.DefinePlugin({ $ENV: {} }));
release.plugins.push(new webpack.optimize.UglifyJsPlugin({ mangle: false }));

module.exports = { dev: dev, release: release };
