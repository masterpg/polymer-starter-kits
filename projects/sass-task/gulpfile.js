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
var debug = require('gulp-debug');
var path = require('path');
var notify = require('gulp-notify');
var sass = require('gulp-ruby-sass');
var sourcemaps = require('gulp-sourcemaps');
var pleeease = require('gulp-pleeease');

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
gulp.task('serve', ['serve:mock', 'sass'], function () {
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
  gulp.watch(['{styles,src}/**/*.scss'], ['sass', reload]);
});

/**
 * scssファイルのコンパイルを行います(ベンダープレフィックスも付加する)。
 */
gulp.task('sass', function (cb) {
  return sassTask('{styles,src}', '**/*.scss');
});

/**
 * Sassのコンパイルを行います。
 * ・scssファイルをcssファイルへコンパイル
 * ・ファイル内で定義されたスタイルにベンダープレフィックスを付加
 * @param sassPath トップフォルダを指定(パスの先頭・末尾に「/」は指定しないこと)
 * @param src トップフォルダ配下のファイルを指定(ファイル名またはグロブを指定)
 */
var sassTask = function (sassPath, src) {
  // Sassコンパイルの設定
  return sass(path.join(sassPath, src), {
    sourcemap: true,  // ソースマップ出力の有無
    style: 'expanded',  // コンパイルされたcssの出力スタイル
    emitCompileError: true,  // コンパイルエラー時にerrorイベントを発生させるかの有無
    compass: true // Compass使用の有無
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
    .pipe(gulp.dest('.tmp'));
};
