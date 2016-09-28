/*
 Copyright (c) 2015 livedeveloper.net Authors
 Released under the MIT license
 http://opensource.org/licenses/mit-license.php
 */

(function (document) {
  'use strict';

  Polymer({
    is: 'app-view',

    properties: {
      route: {
        type: String
      },
      // ユーザー情報ビュー(<user-info-view>)
      // (ユーザー一覧ビューでユーザーが選択された後、このビューにユーザー情報を設定するためにrouting.htmlで使用される)
      userInfoView: {
        type: Object
      }
    },

    ready: function () {
      this.userInfoView = Polymer.dom(this.root).querySelector('user-info-view');
    },

    // メインエリアのスクロール位置をトップへ移動し、ヘッダー領域を広げる
    scrollPageToTop: function () {
      // メインエリアのエレメントを取得
      var main = Polymer.dom(this.root).querySelector('paper-scroll-header-panel[main]');
      main.scroll(0);
    },

    // 画面全体の幅が狭い(narrow)時に、左メニューエリアのアイテムをクリックしたらこのエリアを自動で閉じる
    _onDataRouteClick: function () {
      if (this.$.paperDrawerPanel.narrow) {
        this.$.paperDrawerPanel.closeDrawer();
      }
    },

    // アプリケーションのメインタイトルとサブタイトルのトランスフォームを行う。
    // ・コンテンツ下部へスクロールされると、メインタイトルは縮小され、
    //   またサブタイトルも縮小されて最終的に見えなくなる。
    // ・コンテンツ上部へスクロールされると、メインタイトルは拡大され、
    //   またサブタイトルも拡大される。
    _transformHeader: function (e) {
      var appName = Polymer.dom(this.$.mainToolbar).querySelector('#mainToolbar .app-name');
      var middleContainer = Polymer.dom(this.$.mainToolbar).querySelector('.middle-container');
      var bottomContainer = Polymer.dom(this.$.mainToolbar).querySelector('.bottom-container');
      var detail = e.detail;
      var heightDiff = detail.height - detail.condensedHeight;
      var yRatio = Math.min(1, detail.y / heightDiff);
      var maxMiddleScale = 0.50;  // メインタイトルのラベル最小時の割合
      var scaleMiddle = Math.max(maxMiddleScale, (heightDiff - detail.y) / (heightDiff / (1 - maxMiddleScale)) + maxMiddleScale);
      var scaleBottom = 1 - yRatio;

      // メインタイトルのコンテナの拡大縮小
      Polymer.Base.transform('translate3d(0,' + yRatio * 100 + '%,0)', middleContainer);

      // サブタイトルのコンテナの拡大縮小
      Polymer.Base.transform('scale(' + scaleBottom + ') translateZ(0)', bottomContainer);

      // メインタイトルのラベルの拡大縮小
      Polymer.Base.transform('scale(' + scaleMiddle + ') translateZ(0)', appName);
    },

    // 左メニューエリアのアイテムが選択された際のハンドラ
    _menuOnIronSelect: function (e) {
      e.detail.item.select(true);
    },

    // 左メニューエリアのアイテムの選択が解除された際のハンドラ
    _menuOnIronDeselect: function (e) {
      e.detail.item.select(false);
    },

    // 送信ボタンがタップされた際のハンドラ
    _sendButtonOnTap: function (e) {
      // hello APIをリクエスト
      this.$.helloAjax.generateRequest();
    },

    // hello APIのレスポンスハンドラ
    _helloAjaxOnResponse: function (e) {
      // hello APIのレスポンスをメッセージ表示
      var responseData = this.$.helloAjax.lastResponse;
      alert(responseData['message']);
    }
  });
})(document);

