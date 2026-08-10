if (-Not (Get-Command pnpm -errorAction SilentlyContinue)) {
    Write-Output "First-time setup: installing pnpm..."
    # no pnpm installed globally, let's go fetch it and install it!
    Invoke-WebRequest https://get.pnpm.io/install.ps1 -useb | Invoke-Expression
    # update path to include pnpm
    $env:PNPM_HOME = $env:LOCALAPPDATA + "\pnpm"
    $env:Path += ";" + $env:PNPM_HOME
}

# ensure pnpm itself is up to date
pnpm i -g pnpm

# ensure node is installed, and is v20
pnpm env use --global 20

# make sure deps are up to date
pnpm i

# ensure rustup is installed
if (-Not (Get-Command rustup -errorAction SilentlyContinue)) {
    Write-Output "First-time setup: installing rustup..."
    # no rustup installed globally, let's go fetch it and install it!
    $client = new-object System.Net.WebClient
    $client.DownloadFile('https://win.rustup.rs', "$pwd\rustup-init.exe")
    .\rustup-init.exe
}
# ensure rustup is up-to-date
rustup update

# ensure rust is installed
if (-Not (Get-Command rustc -errorAction SilentlyContinue)) {
    Write-Output "First-time setup: installing rust..."
    # no rust installed globally, let's grab it!
    rustup install 1.82.0
    rustup default 1.82.0
}

# ensure rust is up-to-date
rustup update 1.82.0

# finally, we can actually run the app!!! prayge
$env:SKIP_LINT = 'true'
 
pnpm dev
echo "OpenSky sheets exited."
pause