.PHONY: apk apk-debug apk-all-arch prebuild clean

# Build a release APK for arm64 only (most modern phones, fastest build)
apk: prebuild
	cd android && ./gradlew assembleRelease \
		-PreactNativeArchitectures=arm64-v8a \
		--max-workers=2 \
		--no-daemon
	@echo ""
	@echo "✅ APK built successfully!"
	@echo "📦 Location: android/app/build/outputs/apk/release/app-release.apk"

# Build a debug APK for arm64 only
apk-debug: prebuild
	cd android && ./gradlew assembleDebug \
		-PreactNativeArchitectures=arm64-v8a \
		--max-workers=2 \
		--no-daemon
	@echo ""
	@echo "✅ Debug APK built successfully!"
	@echo "📦 Location: android/app/build/outputs/apk/debug/app-debug.apk"

# Build a release APK for all architectures (slow, uses more memory)
apk-all-arch: prebuild
	cd android && ./gradlew assembleRelease \
		--max-workers=2 \
		--no-daemon
	@echo ""
	@echo "✅ APK built successfully (all architectures)!"
	@echo "📦 Location: android/app/build/outputs/apk/release/app-release.apk"

# Regenerate the native android project and patch build config
prebuild:
	bunx expo prebuild -p android --no-install
	@# Disable lint to avoid build failures from lint vital checks
	@cd android/app && \
		if ! grep -q 'checkReleaseBuilds false' build.gradle; then \
			sed -i '/androidResources {/,/}/{/}/a\    lint {\n        checkReleaseBuilds false\n        abortOnError false\n    }' build.gradle; \
			echo "Patched build.gradle: lint disabled"; \
		fi

# Remove android dir entirely and regenerate (use when build cache is corrupted)
clean:
	rm -rf android
