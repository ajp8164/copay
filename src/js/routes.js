'use strict';

var unsupported, isaosp;

if (window && window.navigator) {
  var rxaosp = window.navigator.userAgent.match(/Android.*AppleWebKit\/([\d.]+)/);
  isaosp = (rxaosp && rxaosp[1] < 537);
  if (!window.cordova && isaosp)
    unsupported = true;
  if (unsupported) {
    window.location = '#/unsupported';
  }
}


//Setting up route
angular
  .module('copayApp')
  .config(function(historicLogProvider, $provide, $logProvider, $stateProvider, $urlRouterProvider, $compileProvider) {
    $urlRouterProvider.otherwise('/');

    $logProvider.debugEnabled(true);
    $provide.decorator('$log', ['$delegate', 'isDevel',
      function($delegate, isDevel) {
        var historicLog = historicLogProvider.$get();

        ['debug', 'info', 'warn', 'error', 'log'].forEach(function(level) {
          if (isDevel && level == 'error') return;

          var orig = $delegate[level];
          $delegate[level] = function() {
            if (level == 'error')
              console.log(arguments);

            var args = [].slice.call(arguments);
            if (!Array.isArray(args)) args = [args];
            args = args.map(function(v) {
              try {
                if (typeof v == 'undefined') v = 'undefined';
                if (!v) v = 'null';
                if (typeof v == 'object') {
                  if (v.message)
                    v = v.message;
                  else
                    v = JSON.stringify(v);
                }
                // Trim output in mobile
                if (window.cordova) {
                  v = v.toString();
                  if (v.length > 300) {
                    v = v.substr(0, 297) + '...';
                  }
                }
              } catch (e) {
                console.log('Error at log decorator:', e);
                v = 'undefined';
              }
              return v;
            });
            try {
              if (window.cordova)
                console.log(args.join(' '));
              historicLog.add(level, args.join(' '));
              orig.apply(null, args);
            } catch (e) {
              console.log('ERROR (at log decorator):', e, args[0]);
            }
          };
        });
        return $delegate;
      }
    ]);

    // whitelist 'chrome-extension:' for chromeApp to work with image URLs processed by Angular
    // link: http://stackoverflow.com/questions/15606751/angular-changes-urls-to-unsafe-in-extension-page?lq=1
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob|chrome-extension):|data:image\/)/);

    $stateProvider
      .state('translators', {
        url: '/translators',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/translators.html'
          }
        }
      })
      .state('disclaimer', {
        url: '/disclaimer',
        needProfile: false,
        views: {
          'main': {
            templateUrl: 'views/disclaimer.html',
          }
        }
      })
      .state('walletHome', {
        url: '/',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/walletHome.html',
          },
        }
      })
      .state('unsupported', {
        url: '/unsupported',
        needProfile: false,
        views: {
          'main': {
            templateUrl: 'views/unsupported.html'
          }
        }
      })
      .state('payment', {
        url: '/uri-payment/:data',
        templateUrl: 'views/paymentUri.html',
        views: {
          'main': {
            templateUrl: 'views/paymentUri.html',
          },
        },
        needProfile: true
      })
      .state('selectWalletForPayment', {
        url: '/selectWalletForPayment',
        controller: 'walletForPaymentController',
        needProfile: true
      })
      .state('join', {
        url: '/join',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/join.html'
          },
        }
      })
      .state('import', {
        url: '/import',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/import.html'
          },
        }
      })
      .state('importLegacy', {
        url: '/importLegacy',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/importLegacy.html',
          },
        }
      })
      .state('create', {
        url: '/create',
        templateUrl: 'views/create.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/create.html'
          },
        }
      })
      .state('copayers', {
        url: '/copayers',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/copayers.html'
          },
        }
      })
      .state('preferences', {
        url: '/preferences',
        templateUrl: 'views/preferences.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferences.html',
          },
        }
      })
      .state('preferencesLanguage', {
        url: '/preferencesLanguage',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesLanguage.html'
          },
        }
      })
      .state('preferencesUnit', {
        url: '/preferencesUnit',
        templateUrl: 'views/preferencesUnit.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesUnit.html'
          },
        }
      })
      .state('preferencesFee', {
        url: '/preferencesFee',
        templateUrl: 'views/preferencesFee.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesFee.html'
          },
        }
      })
      .state('uriglidera', {
        url: '/uri-glidera?code',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/glideraUri.html'
          },
        }
      })
      .state('glidera', {
        url: '/glidera',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/glidera.html'
          },
        }
      })
      .state('buyGlidera', {
        url: '/buy',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/buyGlidera.html'
          },
        }
      })
      .state('sellGlidera', {
        url: '/sell',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/sellGlidera.html'
          },
        }
      })
      .state('preferencesGlidera', {
        url: '/preferencesGlidera',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesGlidera.html'
          },
        }
      })
      .state('coinbase', {
        url: '/coinbase',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/coinbase.html'
          },
        }
      })
      .state('preferencesCoinbase', {
        url: '/preferencesCoinbase',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesCoinbase.html'
          },
        }
      })
      .state('uricoinbase', {
        url: '/uri-coinbase?code',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/coinbaseUri.html'
          },
        }
      })
      .state('buyCoinbase', {
        url: '/buycoinbase',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/buyCoinbase.html'
          },
        }
      })
      .state('sellCoinbase', {
        url: '/sellcoinbase',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/sellCoinbase.html'
          },
        }
      })
      .state('buyandsell', {
        url: '/buyandsell',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/buyAndSell.html'
          },
        }
      })
      .state('preferencesAdvanced', {
        url: '/preferencesAdvanced',
        templateUrl: 'views/preferencesAdvanced.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesAdvanced.html'
          },
        }
      })
      .state('preferencesSkin', {
        url: '/preferencesSkin',
        templateUrl: 'views/preferencesSkin.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesSkin.html'
          },
        }
      })
      .state('preferencesSkinPreview', {
        url: '/preferencesSkinPreview',
        templateUrl: 'views/preferencesSkinPreview.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesSkinPreview.html'
          },
        }
      })
      .state('preferencesSkinDiscovery', {
        url: '/preferencesSkinDiscovery',
        templateUrl: 'views/preferencesSkinDiscovery.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesSkinDiscovery.html'
          },
        }
      })
      .state('preferencesSkinDiscoveryPreview', {
        url: '/preferencesSkinDiscoveryPreview',
        templateUrl: 'views/preferencesSkinDiscoveryPreview.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesSkinDiscoveryPreview.html'
          },
        }
      })
      .state('preferencesTheme', {
        url: '/preferencesTheme',
        templateUrl: 'views/preferencesTheme.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesTheme.html'
          },
        }
      })
      .state('preferencesThemePreview', {
        url: '/preferencesThemePreview',
        templateUrl: 'views/preferencesThemePreview.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesThemePreview.html'
          },
        }
      })
      .state('preferencesThemeDiscovery', {
        url: '/preferencesThemeDiscovery',
        templateUrl: 'views/preferencesThemeDiscovery.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesThemeDiscovery.html'
          },
        }
      })
      .state('preferencesThemeDiscoveryPreview', {
        url: '/preferencesThemeDiscoveryPreview',
        templateUrl: 'views/preferencesThemeDiscoveryPreview.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesThemeDiscoveryPreview.html'
          },
        }
      })
      .state('preferencesApplets', {
        url: '/preferencesApplets',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesApplets.html'
          },
        }
      })
      .state('preferencesAppletPresentation', {
        url: '/preferencesAppletPresentation',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesAppletPresentation.html'
          },
        }
      })
      .state('preferencesAppletsWallpaper', {
        url: '/preferencesAppletsWallpaper',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesAppletsWallpaper.html'
          },
        }
      })
      .state('preferencesAltCurrency', {
        url: '/preferencesAltCurrency',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesAltCurrency.html'
          },
        }
      })
      .state('preferencesAlias', {
        url: '/preferencesAlias',
        templateUrl: 'views/preferencesAlias.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesAlias.html'
          },

        }
      })
      .state('preferencesEmail', {
        url: '/preferencesEmail',
        templateUrl: 'views/preferencesEmail.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesEmail.html'
          },

        }
      })
      .state('preferencesBwsUrl', {
        url: '/preferencesBwsUrl',
        templateUrl: 'views/preferencesBwsUrl.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesBwsUrl.html'
          },

        }
      })
      .state('preferencesHistory', {
        url: '/preferencesHistory',
        templateUrl: 'views/preferencesHistory.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesHistory.html'
          },

        }
      })
      .state('deleteWords', {
        url: '/deleteWords',
        templateUrl: 'views/preferencesDeleteWords.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesDeleteWords.html'
          },
        }
      })
      .state('delete', {
        url: '/delete',
        templateUrl: 'views/preferencesDeleteWallet.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesDeleteWallet.html'
          },
        }
      })
      .state('information', {
        url: '/information',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesInformation.html'
          },
        }
      })
      .state('about', {
        url: '/about',
        templateUrl: 'views/preferencesAbout.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesAbout.html'
          },
        }
      })
      .state('logs', {
        url: '/logs',
        templateUrl: 'views/preferencesLogs.html',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesLogs.html'
          },
        }
      })
      .state('export', {
        url: '/export',
        templateUrl: 'views/export.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/export.html'
          },
        }
      })
      .state('paperWallet', {
        url: '/paperWallet',
        templateUrl: 'views/paperWallet.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/paperWallet.html'
          },
        }
      })
      .state('backup', {
        url: '/backup',
        templateUrl: 'views/backup.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/backup.html'
          },
        }
      })
      .state('preferencesGlobal', {
        url: '/preferencesGlobal',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesGlobal.html',
          },
        }
      })
      .state('termOfUse', {
        url: '/termOfUse',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/termOfUse.html',
          },
        }
      })
      .state('warning', {
        url: '/warning',
        controller: 'warningController',
        templateUrl: 'views/warning.html',
        needProfile: false
      })
      .state('add', {
        url: '/add',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/add.html'
          },
        }
      });
  })
  .run(function($rootScope, $state, $log, $ionicPlatform, uriHandler, isCordova, profileService, nodeWebkit, uxLanguage, animationService, themeService, appletService, go) {

    window.onbeforeunload = function(e) {
      // If this app is closing then attempt to finalize our state before shutdown.
      appletService.finalize();
    };

    if (isCordova) {
      if (screen.width < 768) {
        screen.lockOrientation('portrait');
      } else {

        window.addEventListener("orientationchange", function() {
          var leftMenuWidth = document.querySelector("ion-side-menu[side='left']").clientWidth;
          if (screen.orientation.includes('portrait')) {
            // Portrait
            document.querySelector("[ion-side-menu-content]").style.width = (screen.width - leftMenuWidth) + "px";
          } else {
            // Landscape
            document.querySelector("[ion-side-menu-content]").style.width = (screen.height - leftMenuWidth) + "px";
          }
        });
      }
    }

    $ionicPlatform.ready(function () {
      if (window.cordova !== undefined) {
        
        ionic.Platform.fullScreen(true, false);

        document.addEventListener("deviceReady", function () {

          document.addEventListener("pause", function () {
            // Nothing to do
          }, false);

          document.addEventListener("resume", function () {
            if (!window.ignoreMobilePause) {
              $rootScope.$emit('Local/Resume');
            }
            var loc = window.location;
            var ignoreMobilePause = loc.toString().match(/(buy|sell|buycoinbase|sellcoinbase)/) ? true : false;
            window.ignoreMobilePause = ignoreMobilePause;
          }, false);

          var secondBackButtonPress = 'false';
          var intval = setInterval(function() {
            secondBackButtonPress = 'false';
          }, 5000);

          document.addEventListener('backbutton', function() {
            var loc = window.location;
            var fromDisclaimer = loc.toString().match(/disclaimer/) ? 'true' : '';
            var fromHome = loc.toString().match(/index\.html#\/$/) ? 'true' : '';

            if (!window.ignoreMobilePause) {

              if (fromDisclaimer == 'true')
                navigator.app.exitApp();

              if (isCordova && fromHome == 'true') {
                if (secondBackButtonPress == 'true') {
                  navigator.app.exitApp();
                } else {
                  window.plugins.toast.showShortBottom(gettextCatalog.getString('Press again to exit'));
                }
              }

              if (secondBackButtonPress == 'true') {
                clearInterval(intval);
              } else {
                secondBackButtonPress = 'true';
              }
            }
            setTimeout(function() {
              window.ignoreMobilePause = false;
            }, 100);
          }, false);

          document.addEventListener('menubutton', function() {
            window.location = '#/preferences';
          }, false);

        }, false);
      }
    });

    uxLanguage.init();

    // Register URI handler, not for mobileApp
    if (!isCordova) {
      uriHandler.register();
    }

    if (nodeWebkit.isDefined()) {
      var gui = require('nw.gui');
      var win = gui.Window.get();
      var nativeMenuBar = new gui.Menu({
        type: "menubar"
      });
      try {
        nativeMenuBar.createMacBuiltin("Copay");
      } catch (e) {
        $log.debug('This is not OSX');
      }
      win.menu = nativeMenuBar;
    }

    // Presentation must be initialized prior to showing any views.
    var initializePresentation = function(callback) {
      themeService.init(function() {
        appletService.init(function() {
          $log.info('App presentation ready');
          $rootScope.$emit('Local/ThemeUpdated');
          callback();
        });
      });
    };

    var presentUI = function() {
      if (isCordova) {
        // Allow time for the view to render
        setTimeout(function() {
          navigator.splashscreen.hide();
        }, 300);
      }
    };

    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
      $log.debug('Route change from:', fromState.name || '-', ' to:', toState.name);

      if (!profileService.profile && toState.needProfile) {

        // Give us time to open / create the profile
        event.preventDefault();
        // Try to open local profile
        profileService.loadAndBindProfile(function(err) {
          if (err) {
            if (err.message && err.message.match('NOPROFILE')) {
              $log.debug('No profile... redirecting');

              profileService.create(false, function() {
                initializePresentation(function() {
                  go.disclaimer();
                });
              });

            } else if (err.message && err.message.match('NONAGREEDDISCLAIMER')) {
              $log.debug('Display disclaimer... redirecting');

              initializePresentation(function() {
                go.disclaimer();
              });
            } else {
              throw new Error(err); // TODO
            }
          } else {
            $log.debug('Profile loaded ... Starting UX.');

            initializePresentation(function() {
              $state.transitionTo(toState.name || toState, toParams);
            });
          }
        });
      } else {
        // State transition from go().
        presentUI();

        if (profileService.focusedClient && !profileService.focusedClient.isComplete() && toState.walletShouldBeComplete) {
          $state.transitionTo('copayers');
          event.preventDefault();
        }
      }

      if (!animationService.transitionAnimated(fromState, toState)) {
        event.preventDefault();
        // Time for the backpane to render
        setTimeout(function() {
          $state.transitionTo(toState);
        }, 50);
      }
    });
  });
