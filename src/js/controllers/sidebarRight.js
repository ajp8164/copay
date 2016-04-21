'use strict';

angular.module('copayApp.controllers').controller('sidebarRightController', function($scope, $rootScope, $log, lodash, appletService, appletCatalogService, FocusedWallet, isMobile, isCordova) {

  var self = this;
  this.applets = [];

  var useViewManagedStatusBar = isMobile.iOS() && isCordova; // TODO: use global value
  var physicalScreenWidth = ((window.innerWidth > 0) ? window.innerWidth : screen.width); // TODO: use global value
  var physicalScreenHeight = ((window.innerHeight > 0) ? window.innerHeight : screen.height); // TODO: use global value

  // Usable screen height considers the device status bar height and the wallet bar height.
  var usableScreenHeight = (useViewManagedStatusBar ? physicalScreenHeight - 40 : physicalScreenHeight - 20);
  var itemHeight = 90;
  var maxCols = (physicalScreenWidth < 768 ? 4 : 5);
  var maxRows = Math.floor(physicalScreenHeight / itemHeight);
  var rowHeight = Math.floor(usableScreenHeight / maxRows);

  this.gridsterOpts = {
      columns: maxCols, // the width of the grid, in columns
      pushing: true, // whether to push other items out of the way on move or resize
      floating: false, // whether to automatically float items up so they stack (you can temporarily disable if you are adding unsorted items with ng-repeat)
      swapping: true, // whether or not to have items of the same size switch places instead of pushing down if they are the same size
      width: 'auto', // can be an integer or 'auto'. 'auto' scales gridster to be the full width of its containing element
      colWidth: 'auto', // can be an integer or 'auto'.  'auto' uses the pixel width of the element divided by 'columns'
      rowHeight: rowHeight, // can be an integer or 'match'.  Match uses the colWidth, giving you square widgets.
      margins: [0, 0], // the pixel distance between each widget
      outerMargin: true, // whether margins apply to outer edges of the grid
      isMobile: false, // stacks the grid items if true
      mobileBreakPoint: 600, // if the screen is not wider that this, remove the grid layout and stack the items
      mobileModeEnabled: false, // whether or not to toggle mobile mode when screen width is less than mobileBreakPoint
      minColumns: 4, // the minimum columns the grid must have
      minRows: 2, // the minimum height of the grid, in rows
      maxRows: maxRows,
      defaultSizeX: 1, // the default width of a gridster item, if not specifed
      defaultSizeY: 1, // the default height of a gridster item, if not specified
      minSizeX: 1, // minimum column width of an item
      maxSizeX: null, // maximum column width of an item
      minSizeY: 1, // minumum row height of an item
      maxSizeY: null, // maximum row height of an item
      resizable: {
         enabled: false,
         handles: ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'],
         start: function(event, $element, widget) {}, // optional callback fired when resize is started,
         resize: function(event, $element, widget) {}, // optional callback fired when item is resized,
         stop: function(event, $element, widget) {} // optional callback fired when item is finished resizing
      },
      draggable: {
         enabled: true, // whether dragging items is supported
         handle: '', // optional selector for resize handle
         start: function(event, $element, widget) {}, // optional callback fired when drag is started,
         drag: function(event, $element, widget) {}, // optional callback fired when item is moved,
         stop: function(event, $element, widget) { // optional callback fired when item is finished dragging
          saveAppletLayout(self.applets);
         }
      }
  };

  $scope.appletLayoutMap = {
    row: 'applet.layout.position[0]',
    col: 'applet.layout.position[1]'
  };

  function saveAppletLayout(applets) {
    // Don't do anything if there is no layout.
    if (lodash.isEmpty(applets)) return;
    if (lodash.isUndefined(applets[applets.length-1].layout)) return;
    if (lodash.isEmpty(applets[applets.length-1].layout)) return;

    // Create the layout objects from each applet (store minimal data).
    var layout = lodash.map(applets, function(applet) {
      return {
        appletId: applet.header.appletId,
        layout: applet.layout
      }
    });

    var cat = {
      appletState: []
    };

    cat.appletState = layout;

    appletCatalogService.set(cat, function(err) {
      if (err) {
        $rootScope.$emit('Local/DeviceError', err);
        return;
      }
    });
  };

  // TODO: Not currently used - need to improve layout assignment when a new applet is dynamically created (e.g., create a new wallet).
/*
  function findAppletPosition(appletsLayout) {
    // Walk through each row and column looking for a place it will fit.
    for (var rowIndex = 0; rowIndex < self.gridsterOpts.maxRows; ++rowIndex) {
      for (var colIndex = 0; colIndex < self.gridsterOpts.columns; ++colIndex) {
        // Only insert if position is not already taken.
        var appletLayout = lodash.find(appletsLayout, function(appletLayout) {
          return appletLayout.layout.position[0] == rowIndex && appletLayout.layout.position[1] == colIndex;
        });
        if (lodash.isUndefined(appletLayout)) {
          // No layout found, return this space.
          return {position: {"0": rowIndex, "1": colIndex }};
        }
      }
    }
    throw new Error('Unable to place applet!');
  };
*/
  function setAppletsBackground() {
    var catalog = appletCatalogService.getSync();
    if (catalog.preferences.wallpaperImageUrl.length > 0) {
      $rootScope.theme.view.sidebarRBackground = 'url(' + catalog.preferences.wallpaperImageUrl + ') top / cover no-repeat #000000';
    }
  };

  $rootScope.$on('Local/ThemeUpdated', function(event) {
    setAppletsBackground();
  });

  this.isAppletBuiltin = function(applet) {
    return appletService.isAppletBuiltin(applet);
  };

  this.isAppletPlugin = function(applet) {
    return appletService.isAppletPlugin(applet);
  };

  this.isAppletWallet = function(applet) {
    return appletService.isAppletWallet(applet);
  };

  this.currentWallet = function() {
    // Map only the information we need for the ui.
    var info = FocusedWallet.getInfo();
    return {
      name: info.client.alias || info.client.credentials.walletName || '---',
      network: info.client.credentials.network || '',
      m: info.client.credentials.m || '',
      n: info.client.credentials.n || '',
      balance: FocusedWallet.getBalanceAsString('totalAmount', false) || '--- ' + info.config.settings.unitName,
      altBalance: FocusedWallet.getBalanceAsString('totalAmount', true) || '--- ' + info.config.settings.alternativeIsoCode
    }
  };

  $rootScope.$on('$Local/GlideraUpdated', function() {
    var glideraApplet = lodash.find(self.applets, function(applet) {
      if (applet.header.appletId.include('glidera')) {
        return applet;
      }
    });
    glideraApplet.model.visible = configService.getSync().glidera.visible;
  });

  $rootScope.$on('$Local/CoinbaseUpdated', function() {
    var coinbaseApplet = lodash.find(self.applets, function(applet) {
      if (applet.header.appletId.include('coinbase')) {
        return applet;
      }
    });
    coinbaseApplet.model.visible = configService.getSync().coinbase.visible;
  });

  // Applets change when the theme is changed.
  $rootScope.$on('Local/ThemeUpdated', function(event) {
    $log.debug('applet refresh - Local/ThemeUpdated');
    self.applets = appletService.getAppletsWithState();
  });

  // Applets change when the theme is changed.
  $rootScope.$on('Local/AppletPreferencesUpdated', function(event) {
    self.applets = appletService.getAppletsWithState();
  });

  // Listen for changes to wallet skins and update wallet applets.
  // TODO: manage only the change rather than refreshing the whole collection.
  $rootScope.$on('Local/SkinUpdated', function(event, skin, walletId) {
    $log.debug('applet refresh - Local/SkinUpdated ' + skin.header.name + ' for ' + walletId);
    self.applets = appletService.getAppletsWithState();
  });

  // Listen for new or deleted wallets.
  // TODO: manage only the change rather than refreshing the whole collection.
  $rootScope.$on('Local/NewFocusedWallet', function(event, fc) {
    $log.debug('applet refresh - Local/NewFocusedWallet');
    self.applets = appletService.getAppletsWithState();
  });

  // Listen for wallet name changes.
  // TODO: manage only the change rather than refreshing the whole collection.
  $rootScope.$on('Local/AliasUpdated', function(event) {
    self.applets = appletService.getAppletsWithState();
  });

  $rootScope.$on('Local/AppletEnter', function(event, applet, walletId) {
    $log.debug('applet enter ' + applet.header.name + ' for ' + walletId);
  });

  $rootScope.$on('Local/AppletLeave', function(event, applet, walletId) {
    $log.debug('applet leave ' + applet.header.name + ' for ' + walletId);
  });

  $rootScope.$on('Local/AppletShown', function(event, applet, walletId) {
    $log.debug('applet shown ' + applet.header.name + ' for ' + walletId);
  });

  $rootScope.$on('Local/AppletHidden', function(event, applet, walletId) {
    $log.debug('applet hidden ' + applet.header.name + ' for ' + walletId);
  });

});
