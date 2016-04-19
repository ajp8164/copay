VERSION=%APP-VERSION%

sign:
	gpg -u 1112CFA1 --output browser-extensions/chrome/%APP-EXE-NAME%-chrome-extension.zip.sig --detach-sig browser-extensions/chrome/%APP-EXE-NAME%-chrome-extension.zip
verify: 
	gpg --verify browser-extensions/chrome/%APP-EXE-NAME%-chrome-extension.zip.sig browser-extensions/chrome/%APP-EXE-NAME%-chrome-extension.zip

sign-osx:
	codesign -s 3rd webkitbuilds/%APP-EXE-NAME%-osx.dmg 

verify-osx:
	codesign -dv webkitbuilds/%APP-EXE-NAME%-osx.dmg 

sign-desktop:
	gpg -u 1112CFA1 --output webkitbuilds/%APP-EXE-NAME%-linux.zip.sig --detach-sig webkitbuilds/%APP-EXE-NAME%-linux.zip
	gpg -u 1112CFA1 --output webkitbuilds/%APP-EXE-NAME%-win.exe.sig --detach-sig webkitbuilds/%APP-EXE-NAME%-win.exe

verify-desktop:
	gpg --verify webkitbuilds/%APP-EXE-NAME%-linux.zip.sig webkitbuilds/%APP-EXE-NAME%-linux.zip
	gpg --verify webkitbuilds/%APP-EXE-NAME%-win.exe.sig webkitbuilds/%APP-EXE-NAME%-win.exe

chrome:
	browser-extensions/chrome/build.sh

cordova-base:
	grunt --target=%APP-EXE-NAME% dist-mobile

# ios:  cordova-base
# 	make -C cordova ios
# 	open cordova/project/platforms/ios/%APP-SHORT-CAMEL-NAME%
#
# android: cordova-base
# 	make -C cordova run-android
#
# release-android: cordova-base
# 	make -C cordova release-android
#
wp8-prod:
	cordova/build.sh WP8 %APP-EXE-NAME% --clear
	cordova/wp/fix-svg.sh
	echo -e "\a"

wp8-debug:
	cordova/build.sh WP8 %APP-EXE-NAME% --dbgjs
	cordova/wp/fix-svg.sh
	echo -e "\a"

ios-prod:
	cordova/build.sh IOS %APP-EXE-NAME% --clear
	cd cordova/project && cordova build ios
	open "cordova/project/platforms/ios/%APP-SHORT-NAME%.xcodeproj"

ios-debug:
	cordova/build.sh IOS %APP-EXE-NAME% --dbgjs
	cd cordova/project && cordova build ios
	open "cordova/project/platforms/ios/%APP-SHORT-NAME%.xcodeproj"

android-prod:
	cordova/build.sh ANDROID %APP-EXE-NAME% --clear
	cd cordova/project && cordova build android --release
	jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ../copay.keystore -signedjar cordova/project/platforms/android/build/outputs/apk/android-release-signed.apk  cordova/project/platforms/android/build/outputs/apk/android-release-unsigned.apk copay_play 
	zipalign -v 4 cordova/project/platforms/android/build/outputs/apk/android-release-signed.apk cordova/project/platforms/android/build/outputs/apk/android-release-signed-aligned.apk 

android-debug:
	cordova/build.sh ANDROID %APP-EXE-NAME% --dbgjs --clear
	cd cordova/project && cordova run android

android-debug-fast:
	cordova/build.sh ANDROID %APP-EXE-NAME% --dbgjs
	cd cordova/project && cordova run android	
