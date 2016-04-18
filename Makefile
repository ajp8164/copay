VERSION=1.9.0

sign:
	gpg -u 1112CFA1 --output browser-extensions/chrome/copay-chrome-extension.zip.sig --detach-sig browser-extensions/chrome/copay-chrome-extension.zip
verify: 
	gpg --verify browser-extensions/chrome/copay-chrome-extension.zip.sig browser-extensions/chrome/copay-chrome-extension.zip

sign-osx:
	codesign -s 3rd webkitbuilds/Copay-osx.dmg 

verify-osx:
	codesign -dv webkitbuilds/Copay-osx.dmg 

sign-desktop:
	gpg -u 1112CFA1 --output webkitbuilds/Copay-linux.zip.sig --detach-sig webkitbuilds/Copay-linux.zip
	gpg -u 1112CFA1 --output webkitbuilds/Copay-win.exe.sig --detach-sig webkitbuilds/Copay-win.exe

verify-desktop:
	gpg --verify webkitbuilds/Copay-linux.zip.sig webkitbuilds/Copay-linux.zip
	gpg --verify webkitbuilds/Copay-win.exe.sig webkitbuilds/Copay-win.exe

chrome:
	browser-extensions/chrome/build.sh

cordova-base:
	grunt --target=copay dist-mobile

# ios:  cordova-base
# 	make -C cordova ios
# 	open cordova/project/platforms/ios/Copay
#
# android: cordova-base
# 	make -C cordova run-android
#
# release-android: cordova-base
# 	make -C cordova release-android
#
wp8-prod:
	cordova/build.sh WP8 copay --clear
	cordova/wp/fix-svg.sh
	echo -e "\a"

wp8-debug:
	cordova/build.sh WP8 copay --dbgjs
	cordova/wp/fix-svg.sh
	echo -e "\a"

ios-prod:
	cordova/build.sh IOS copay --clear
	cd cordova/project && cordova build ios
	open "cordova/project/platforms/ios/Copay.xcodeproj"

ios-debug:
	cordova/build.sh IOS copay --dbgjs
	cd cordova/project && cordova build ios
	open "cordova/project/platforms/ios/Copay.xcodeproj"

android-prod:
	cordova/build.sh ANDROID copay --clear
	cd cordova/project && cordova build android --release
	jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ../copay.keystore -signedjar cordova/project/platforms/android/build/outputs/apk/android-release-signed.apk  cordova/project/platforms/android/build/outputs/apk/android-release-unsigned.apk copay_play 
	zipalign -v 4 cordova/project/platforms/android/build/outputs/apk/android-release-signed.apk cordova/project/platforms/android/build/outputs/apk/android-release-signed-aligned.apk 

android-debug:
	cordova/build.sh ANDROID copay --dbgjs --clear
	cd cordova/project && cordova run android

android-debug-fast:
	cordova/build.sh ANDROID copay --dbgjs
	cd cordova/project && cordova run android	
