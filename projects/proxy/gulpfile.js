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
gulp.task('serve', ['serve:mock'], function () {
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
  gulp.watch(['src/**/{*.css,*.html,*.js}'], reload);
  gulp.watch(['styles/**/{*.css,*.html}'], reload);
});
