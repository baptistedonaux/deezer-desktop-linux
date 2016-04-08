#!/usr/bin/env bash

available () {
  command -v $1 >/dev/null 2>&1
}

# Make sure we have wget or curl
if available wget; then
  SILENT_DL="wget -qO-"
  LOUD_DL="wget"
elif available curl; then
  SILENT_DL="curl -s"
  LOUD_DL="curl -O"
else
  echo "Install wget or curl" >&2
  exit 1
fi

# Check which Chrome stream the user selected to fetch from
CHROME_STREAM=stable
while [ 0 ]; do
  if [ "$1" = "-u" -o "$1" = "--unstable" ]; then
    CHROME_STREAM=unstable
    shift 1
  elif [ "$1" = "-b" -o "$1" = "--beta" ]; then
    CHROME_STREAM=beta
    shift 1
  else
    break
  fi
done

# Set Output dir
PPAPI_FLASH_INSTALL_DIR=${PPAPI_FLASH_INSTALL_DIR:-/opt/google/chrome/PepperFlash}

# Set temp dir
TMP=${TMP:-/tmp}

# Set staging dir
STAGINGDIR=$TMP/pepper-flash-staging

# Setup Arch
ARCH=$(uname -m | sed 's/i.86/i386/')

# Work out the latest stable Google Chrome if VERSION is unset
VERSION=$($SILENT_DL https://dl.google.com/linux/direct/google-chrome-${CHROME_STREAM}_current_$ARCH.rpm | head -c96 | strings | rev | awk -F"[:-]" '/emorhc/ { print $2 }' | rev)

# Error out if $VERISON is unset, e.g. because previous command failed
if [ -z $VERSION ]; then
  echo "Could not work out the latest version; exiting" >&2
  exit 1
fi

# Don't start repackaging if the same version is already installed
if [ -e "$PPAPI_FLASH_INSTALL_DIR/chrome-version-$VERSION" ] ; then
  echo "The latest Flash is already installed"
  exit 0
fi

# If the staging directory is already present from the past, clear it down
# and re-create it.
if [ -d "$STAGINGDIR" ]; then
  rm -fr "$STAGINGDIR"
fi

set -e
mkdir -p "$STAGINGDIR"
cd "$STAGINGDIR"

# Now get the rpm
$LOUD_DL https://dl.google.com/linux/direct/google-chrome-${CHROME_STREAM}_current_${ARCH}.rpm

DOWNLOADVERSION=$(head -c96 "google-chrome-${CHROME_STREAM}_current_${ARCH}.rpm" | strings | rev | awk -F"[:-]" '/emorhc/ { print $2 }' | rev)

if [ ! "$VERSION" = "$DOWNLOADVERSION" ]; then
  echo "The version downloaded ($DOWNLOADVERSION) is different from the version expected ($VERSION)" >&2
  exit 1
fi

# Extract the contents of the Google Chrome binary package
RPMHDRLGTH=$(LANG=C grep -abom1 7zXZ google-chrome-${CHROME_STREAM}_current_${ARCH}.rpm)

echo "Extracting Flash from the Chrome RPM ..."
tail -c+${RPMHDRLGTH%:*} google-chrome-${CHROME_STREAM}_current_${ARCH}.rpm | xz -d | cpio --quiet -id "./opt/google/chrome*/PepperFlash/*"

cd opt/google/chrome*/PepperFlash

# Add version number file
touch "chrome-version-$VERSION"

# Escalate privileges if needed and copy files into place
if [ "$UID" = 0 ]; then
  mkdir -p "$PPAPI_FLASH_INSTALL_DIR"
  cp * "$PPAPI_FLASH_INSTALL_DIR"
elif [ -r /etc/os-release ] && grep -qx 'ID=\(ubuntu\|linuxmint\)' /etc/os-release; then
  echo "Calling sudo ... If prompted, please enter your password so Flash can be copied into place"
  sudo mkdir -p "$PPAPI_FLASH_INSTALL_DIR"
  sudo cp * "$PPAPI_FLASH_INSTALL_DIR"
else
  echo "Please enter your root password so Pepper Flash can be copied into place"
  su -c "sh -c \"mkdir -p $PPAPI_FLASH_INSTALL_DIR && cp * $PPAPI_FLASH_INSTALL_DIR\""
fi

# Tell the user we are done
echo "Flash installed into $PPAPI_FLASH_INSTALL_DIR"