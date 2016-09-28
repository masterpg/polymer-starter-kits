/*
 Copyright (c) 2015 livedeveloper.net Authors
 Released under the MIT license
 http://opensource.org/licenses/mit-license.php
 */

var App = {
  /**
   * アプリケーションビューです。
   */
  view: undefined,

  /**
   * 画面遷移のルーティングを設定します。
   */
  setupRouting: function () {
    // 基準パスを指定。指定する値は、基準パスの最後尾から「/」を削除したものを指定。
    // 例: "/apps/starter-kit"
    page.base('');

    // スクロール位置をトップへ移動させる
    function scrollToTop(ctx, next) {
      App.view.scrollPageToTop();
      next();
    }

    // 全てのルーティングの前に行われる処理を記述
    page('*', function parse(ctx, next) {
      // クエリストリングをJSONへパース
      ctx.query = qs.parse(ctx.querystring);
      next();
    });

    // ルートパスからホームビューへリダイレクト
    page.redirect('/', '/home');
    page.redirect('/index.html', '/home');

    // ホームビューへのルーティング
    page('/home', scrollToTop, function (ctx) {
      App.view.route = 'home';
    });

    // ユーザー一覧ビューへのルーティング
    page('/users', scrollToTop, function (ctx) {
      App.view.route = 'users';
    });

    // ユーザー情報ビューへのルーティング
    // パス例: "/users/0001?first=Bob&last=Smith"
    page('/users/:id', scrollToTop, function (ctx) {
      App.view.userInfoView.user = {
        id: ctx.params.id,
        first: ctx.query.first,
        last: ctx.query.last
      };
      App.view.route = 'user-info';
    });

    // コンタクトビューへのルーティング
    page('/contact', scrollToTop, function (ctx) {
      App.view.route = 'contact';
    });

    // URLクエリストリングによってhashbangの有効/無効を切り替える。
    // URLに切り替え用のクエリが指定されると、まずこの指定が優先され、
    // URLに指定がない場合は、前回ローカルに保存された指定が適用される。
    // 例: http://myserver.com/starter-kit/index.html?hashbang=true
    var queryString = qs.parse(window.location.search.substring(1));
    var hashbangString = queryString['hashbang'];
    if (!hashbangString) {
      hashbangString = window.localStorage['hashbang'];
    }
    var hashbang = hashbangString == 'false' ? false : true;
    window.localStorage['hashbang'] = hashbang;

    // page.jsを開始
    page.start({
      hashbang: hashbang
    });
  }
};

(function (document) {
  'use strict';

  // エレメントのインポートと登録が行われると呼びだされる
  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function () {
    // アプリケーションビューを保存
    App.view = document.querySelector('#app');
    // ルーティングの設定
    App.setupRouting();
  });

})(document);
