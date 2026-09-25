#!/usr/bin/env bash
set -euo pipefail

# Use an available iPhone from the selected Xcode's simulator runtimes.
SIM_ID=$(xcrun simctl list devices available --json | python3 -c '
import json,sys
data=json.load(sys.stdin)
for runtime,devices in sorted(data["devices"].items(),reverse=True):
    if ".iOS-" not in runtime:
        continue
    for device in devices:
        if device.get("isAvailable") and device["name"].startswith("iPhone"):
            print(device["udid"])
            sys.exit(0)
sys.exit("No available iPhone simulator")
')

xcodebuild -project ios/GymPlanner.xcodeproj \
  -scheme GymPlanner -configuration Release -sdk iphonesimulator \
  -destination "id=$SIM_ID" -derivedDataPath ios/build-simulator \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build

SIM_APP=ios/build-simulator/Build/Products/Release-iphonesimulator/GymPlanner.app
swift scripts/validate-bundle.swift "$SIM_APP"

SIM_STATE=$(xcrun simctl list devices --json | python3 -c '
import json,sys
device_id=sys.argv[1]
print(next(d["state"] for ds in json.load(sys.stdin)["devices"].values() for d in ds if d["udid"]==device_id))
' "$SIM_ID")
if [ "$SIM_STATE" != "Booted" ]; then
  xcrun simctl boot "$SIM_ID"
fi
xcrun simctl bootstatus "$SIM_ID" -b

# Reproduce the original installer error, then install the corrected bundle.
# A raw plist parser misses this: Foundation reserves a root Resources folder.
mkdir -p artifacts
BAD_APP=ios/build-simulator/InvalidLayout.app
cp -R "$SIM_APP" "$BAD_APP"
mkdir "$BAD_APP/Resources"
mv "$BAD_APP/WebApp" "$BAD_APP/Resources/WebApp"
if xcrun simctl install "$SIM_ID" "$BAD_APP" > artifacts/invalid-layout.log 2>&1; then
  echo "The invalid Resources layout unexpectedly installed."
  exit 1
fi
python3 -c 'from pathlib import Path; log=Path("artifacts/invalid-layout.log").read_text(); assert "Missing bundle ID" in log, log; print("Reproduced original Missing bundle ID error for Resources layout.")'

xcrun simctl install "$SIM_ID" "$SIM_APP"
xcrun simctl launch --terminate-running-process "$SIM_ID" com.s.gymplanner.app
sleep 8
xcrun simctl io "$SIM_ID" screenshot artifacts/iPhone-smoke.png
echo "iPhone simulator installation and launch succeeded."
