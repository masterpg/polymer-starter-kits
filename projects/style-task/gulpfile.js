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
var changed = require('gulp-changed');
var merge = require('merge-stream');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var pleeease = require('gulp-pleeease');
var htmlAutoprefixer = require("gulp-html-autoprefixer");

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
gulp.task('serve', ['serve:mock', 'src', 'styles'], function () {
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
  gulp.watch(['src/**/{*.css,*.html,*.js}'], ['src', reload]);
  gulp.watch(['styles/**/{*.css,*.html}'], ['styles', reload]);
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
 * cssファイルのコンパイルを行います。
 * ファイル内で定義されたスタイルにベンダープレフィックスを付加します。
 * @param cssPath トップフォルダを指定(パスの先頭・末尾に「/」は指定しないこと)
 * @param srcs トップフォルダ配下のファイルを指定(ファイル名、グロブを配列で指定)
 */
var cssTask = function (cssPath, srcs) {
  // gulp.src()の引数には、対象のファイルを指定している
  return gulp.src(srcs.map(function (src) {
    return path.join(cssPath, src);
  }))
    // ファイルの生成元と生成先を比較して変更があったかどうかを判断し、
    // 変更があった場合のみcssファイルのコンパイルを行うよう設定
    .pipe(changed(path.join('.tmp', cssPath), {extension: '.css'}))
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
    .pipe(gulp.dest(path.join('.tmp', cssPath)));
};

/**
 * htmlファイルのコンパイルを行います。
 * ファイル内で定義されたスタイルにベンダープレフィックスを付加します。
 * @param htmlPath トップフォルダを指定(パスの先頭・末尾に「/」は指定しないこと)
 * @param srcs トップフォルダ配下のファイルを指定(ファイル名、グロブを配列で指定)
 */
var htmlTask = function (htmlPath, srcs) {
  return gulp.src(srcs.map(function (src) {
    return path.join(htmlPath, src);
  }))
    .pipe(changed(path.join('.tmp', htmlPath), {extension: '.html'}))
    .pipe(plumber({
      errorHandler: notify.onError("Error: <%= error.message %>")
    }))
    // htmlファイルをコンパイルし、ベンダープレフィックスを付加
    .pipe(htmlAutoprefixer())
    .pipe(gulp.dest(path.join('.tmp', htmlPath)));
};
