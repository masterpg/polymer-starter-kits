/*
 Copyright (c) 2015 livedeveloper.net Authors
 Released under the MIT license
 http://opensource.org/licenses/mit-license.php
 */

'use strict';

var gulp = require('gulp');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var historyApiFallback = require('connect-history-api-fallback');
var path = require('path');
var del = require('del');
var changed = require('gulp-changed');
var cache = require('gulp-cache');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var symlink = require('gulp-symlink');
var pleeease = require('gulp-pleeease');
var htmlAutoprefixer = require("gulp-html-autoprefixer");
var sass = require('gulp-ruby-sass');
var sourcemaps = require('gulp-sourcemaps');
var imagemin = require('gulp-imagemin');
var polybuild = require('polybuild');

// 基準パスを設定してください。
// パスの最後は「/」を付けてください。
var BASE_PATH = '/dist/';

/**
 * Sass使用の有無です。
 * Sassを使用する場合はtrueを設定してください。
 */
var USE_OF_SASS = false;

/**
 * プロジェクトのビルドタスクが実行されているか否かのフラグです。
 */
var _isBuild = false;

/**
 * easymockを起動します。
 * Browsersyncのproxy機能を検証するためのWEBサーバーです。
 */
gulp.task('serve:mock', function () {
  var options = {
    // サーバーのポート番号
    port: 5050,
    // APIリクエストに対するレスポンス用の.jsonファイルを格納するフォルダ
    path: 'mock'
  };
  var MockServer = require('easymock').MockServer;
  var server = new MockServer(options);
  server.start();
});

/**
 * Browsersyncを起動します。
 */
gulp.task('serve', ['serve:mock', 'app', 'src', 'styles', 'sass', 'images'], function () {
  // Browsersyncの設定
  browserSync({
    logPrefix: 'PSK',
    notify: false,
    port: 5000,
    ui: {port: 5001},
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function (snippet) {
          return snippet;
        }
      }
    },

    // >>> proxyサーバーの設定
    proxy: {
      // 本来アクセスすべきWEBサーバーを指定する
      target: 'localhost:5050',
      // URL指定、リロードでサイトにアクセスがあった際、
      // デフォルトファイル(index.html)を返すためのプラグインを指定
      middleware: [historyApiFallback()]
    },
    // 追加フォルダの指定
    // 左に指定したものの方が優先度が高くなる
    serveStatic: ['.tmp', '.']
    // <<<

    // >>> 一般的なWEBサーバーの設定
    //server: {
    //  baseDir: ['.tmp', '.'],
    //  middleware: [historyApiFallback()]
    //}
    // <<<
  });

  // 変更を監視するファイルを指定
  gulp.watch(['index.html'], ['app', reload]);
  gulp.watch(['src/**/{*.css,*.html,*.js}'], ['src', reload]);
  gulp.watch(['styles/**/{*.css,*.html}'], ['styles', reload]);
  gulp.watch(['{styles,src}/**/*.scss'], ['sass', reload]);
});

/**
 * アプリケーションのタスクを実行します。
 * ・index.html内で定義されたスタイルにベンダープレフィックスを付加する。
 */
gulp.task('app', function (cb) {
  return htmlTask('.', ['index.html']);
});

/**
 * srcフォルダのファイルに対するタスクを実行します。
 * css, htmlファイル内で定義されたスタイルにベンダープレフィックスを付加します。
 */
gulp.task('src', function (cb) {
  var css = cssTask('src', ['**/*.css']);
  var html = htmlTask('src', ['**/*.html']);
  return merge(css, html);
});

/**
 * stylesフォルダのファイルに対するタスクを実行します。
 * css, htmlファイル内で定義されたスタイルにベンダープレフィックスを付加します。
 */
gulp.task('styles', function (cb) {
  var css = cssTask('styles', ['**/*.css']);
  var html = htmlTask('styles', ['**/*.html']);
  return merge(css, html);
});

/**
 * scssファイルのコンパイルを行います(ベンダープレフィックスも付加する)。
 */
gulp.task('sass', function (cb) {
  if (USE_OF_SASS) {
    return sassTask('{styles,src}', '**/*.scss');
  } else {
    cb();
  }
});

/**
 * 画像ファイルを圧縮します。
 */
gulp.task('images', function () {
  return imageOptimizeTask('images', ['**/{*.jpg,*.png}']);
});

/**
 * プロジェクトをクリーンします。
 */
gulp.task('clean', function (cb) {
  del.sync(['.tmp', 'dist', '.sass-cache']);
  return runSequence('clean:cache', cb);
});

/**
 * プロジェクトのビルドリソースをクリーンします。
 */
gulp.task('clean:build', function (cb) {
  del.sync(['dist', '.sass-cache']);
  return runSequence('clean:cache', cb);
});

/**
 * キャッシュをクリーンします。
 */
gulp.task('clean:cache', function (cb) {
  return cache.clearAll(cb);
});

/**
 * プロジェクトのビルドを行います。
 */
gulp.task('build', ['clean:build'], function (cb) {
  // ビルドフラグをONにする
  _isBuild = true;
  // ビルド実行
  runSequence(
    ['app', 'src', 'styles', 'sass', 'images'],
    'copy-to-dist', 'set-base-path', 'polybuild',
    'rename-index', 'clean-dist',
    cb);
});

/**
 * ビルドに必要なリソースをdistフォルダへコピーします。
 */
gulp.task('copy-to-dist', function () {
  // bower_componentsへのシンボリックリンクを作成
  var bower = gulp.src('bower_components')
    .pipe(symlink('dist/bower_components'));

  // libsへのシンボリックリンクを作成
  var libs = gulp.src('libs')
    .pipe(symlink('dist/libs'));

  // 自身のアプリケーションで作成したjsファイルをコピー
  var js = gulp.src('src/**/*.js')
    .pipe(gulp.dest('dist/src'));

  // ビルドに必要なリソースをコピー
  var resources = gulp.src([
    'favicon.ico',
    'manifest.json'
  ]).pipe(gulp.dest('dist'));

  return merge(bower, libs, js, resources);
});

/**
 * 基準パスの設定を行います。
 * BASE_PATHにパスを設定しておいてください。
 */
gulp.task('set-base-path', function () {
  // 左のようなタグが見つかると、右のように書き換えられる:
  // <base href="/work/" /> ⇒ <base href="/apps/starter-kit/" />
  var index = gulp.src(['dist/index.html'])
    .pipe(replace(new RegExp('<base[^>]href\s?=\s?([\"\'][^\"\']*[\"\'])[^>]*>'), function ($0, $1) {
      return $0.replace($1, '"' + BASE_PATH + '"');
    }))
    .pipe(gulp.dest('dist'));

  // 左のようなコーディングが見つかると、右のように書き換えられる:
  // page.base('/work') ⇒ page.base('/apps/starter-kit')
  var routing = gulp.src(['dist/src/app.js'])
    .pipe(replace(new RegExp('page.base\\(\\s*([\"\'][^\"\']*[\"\'])\\s*\\)'), function ($0, $1) {
      var basePath = BASE_PATH.substr(0, (BASE_PATH.length - 1));
      return $0.replace($1, '"' + basePath + '"');
    }))
    .pipe(gulp.dest('dist/src'));

  return merge(index, routing);
});

/**
 * Polymerプロジェクトのビルドを行います。
 */
gulp.task('polybuild', function () {
  return gulp.src('dist/index.html')
    .pipe(polybuild({maximumCrush: true}))
    .pipe(gulp.dest('dist'));
});

/**
 * ビルド成果物であるindex.build.htmlを、index.htmlへリネームします。
 */
gulp.task('rename-index', function () {
  return gulp.src('dist/index.build.html')
    .pipe(rename('index.html'))
    .pipe(gulp.dest('dist'));
});

/**
 * ビルド成果物として必要な物以外をクリーンします。
 */
gulp.task('clean-dist', function () {
  return del.sync([
    'dist/*',
    '!dist/index.html',
    '!dist/index.build.js',
    '!dist/favicon.ico',
    '!dist/manifest.json',
    '!dist/images'
  ]);
});

/**
 * cssファイルのコンパイルを行います。
 * ファイル内で定義されたスタイルにベンダープレフィックスを付加します。
 * @param cssPath トップフォルダを指定(パスの先頭・末尾に「/」は指定しないこと)
 * @param srcs トップフォルダ配下のファイルを指定(ファイル名、グロブを配列で指定)
 */
var cssTask = function (cssPath, srcs) {
  var destPath = _isBuild ?
    path.join('dist', cssPath) :
    path.join('.tmp', cssPath);

  // gulp.src()の引数には、対象のファイルを指定している
  return gulp.src(srcs.map(function (src) {
    return path.join(cssPath, src);
  }))
    // ファイルの生成元と生成先を比較して変更があったかどうかを判断し、
    // 変更があった場合のみcssファイルのコンパイルを行うよう設定
    .pipe(changed(destPath, {extension: '.css'}))
    // エラー発生時の通知設定
    .pipe(plumber({
      errorHandler: notify.onError("Error: <%= error.message %>")
    }))
    // cssファイルをコンパイルし、ベンダープレフィックスを付加
    .pipe(pleeease({
      // ベンダープレフィックス対象のブラウザ、バージョンを細かく指定できる
      autoprefixer: {"browsers": ["last 4 versions"]},
      // 圧縮の有無 true/false
      minifier: false
    }))
    // コンパイルされたファイルを指定フォルダへ出力
    .pipe(gulp.dest(destPath));
};

/**
 * htmlファイルのコンパイルを行います。
 * ファイル内で定義されたスタイルにベンダープレフィックスを付加します。
 * @param htmlPath トップフォルダを指定(パスの先頭・末尾に「/」は指定しないこと)
 * @param srcs トップフォルダ配下のファイルを指定(ファイル名、グロブを配列で指定)
 */
var htmlTask = function (htmlPath, srcs) {
  var destPath = _isBuild ?
    path.join('dist', htmlPath) :
    path.join('.tmp', htmlPath);

  return gulp.src(srcs.map(function (src) {
    return path.join(htmlPath, src);
  }))
    .pipe(changed(destPath, {extension: '.html'}))
    .pipe(plumber({
      errorHandler: notify.onError("Error: <%= error.message %>")
    }))
    // htmlファイルをコンパイルし、ベンダープレフィックスを付加
    .pipe(htmlAutoprefixer())
    .pipe(gulp.dest(destPath));
};

/**
 * Sassのコンパイルを行います。
 * ・scssファイルをcssファイルへコンパイル
 * ・ファイル内で定義されたスタイルにベンダープレフィックスを付加
 * @param sassPath トップフォルダを指定(パスの先頭・末尾に「/」は指定しないこと)
 * @param src トップフォルダ配下のファイルを指定(ファイル名またはグロブを指定)
 */
var sassTask = function (sassPath, src) {
  var destPath = _isBuild ? 'dist' : '.tmp';

  // Sassコンパイルの設定
  return sass(path.join(sassPath, src), {
    sourcemap: true,  // ソースマップ出力の有無
    style: 'expanded',  // コンパイルされたcssの出力スタイル
    emitCompileError: true,  // コンパイルエラー時にerrorイベントを発生させるかの有無
    compass: false // Compass使用の有無
  })
    // エラー発生時の通知設定
    .on('error', notify.onError(function (error) {
      return "Error: " + error.message;
    }))
    // ベンダープレフィックスを付加
    .pipe(pleeease({
      // ベンダープレフィックス対象のブラウザ、バージョンを細かく指定できる
      autoprefixer: {"browsers": ["last 4 versions"]},
      // 圧縮の有無
      minifier: false
    }))
    // ソースマップの設定
    // (「.」はcssファイルと同じディレクトリにソースマップを出力することを意味する)
    .pipe(sourcemaps.write('.', {
      // ソースマップにソースコードを含めるかの有無
      // (falseを設定した場合はsourceRootを指定する必要がある)
      includeContent: false,
      // sourceRootに「/」を設定し、ソースマップがURLのルートパスを起点に
      // scssファイルを参照するようにする。sourceRootを設定しないと、
      // ソースマップのカレントディレクトリを起点にscssファイルを参照しようとし、
      // 結果として、ソースマップがscssファイルが参照できない状態になる。
      sourceRoot: '/'
    }))
    // コンパイルされたファイルを指定フォルダへ出力
    .pipe(gulp.dest(destPath));
};

/**
 * 画像ファイルを圧縮します。
 * @param imagePath トップフォルダを指定(パスの先頭・末尾に「/」は指定しないこと)
 * @param srcs トップフォルダ配下のファイルを指定(ファイル名、グロブを配列で指定)
 */
var imageOptimizeTask = function (imagePath, srcs) {
  var destPath = _isBuild ?
    path.join('dist', imagePath) :
    path.join('.tmp', imagePath);

  return gulp.src(srcs.map(function (src) {
    return path.join(imagePath, src);
  }))
    // 画像ファイル圧縮の設定
    .pipe(cache(imagemin({
      progressive: true,
      interlaced: true
    })))
    // コンパイルされたファイルを指定フォルダへ出力
    .pipe(gulp.dest(destPath));
};

