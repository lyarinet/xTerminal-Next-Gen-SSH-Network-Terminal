Name:           xterminal
Version:        1.2.6
Release:        1%{?dist}
Summary:        Next-Gen Multi-Protocol SSH, Telnet, Serial & DevOps Terminal Workstation
License:        MIT
URL:            https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal
ExclusiveArch:  x86_64

# Downloads official release binary directly during Copr build
Source0:        https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal/releases/download/v1.2.6/xTerminal-1.2.6.AppImage

BuildRequires:  desktop-file-utils
AutoReqProv:    no

%description
xTerminal is an enterprise-grade multi-protocol terminal workstation for DevOps,
sysadmins, and network engineers. Features full-duplex SSH, Telnet, Serial console,
parallel multi-host command runner, real-time server telemetry, and built-in SFTP.

%prep
# No prep required

%build
# Pre-built binary package

%install
mkdir -p %{buildroot}/opt/xterminal
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/share/applications

# Copy binary to /opt/xterminal
cp %{SOURCE0} %{buildroot}/opt/xterminal/xterminal
chmod 0755 %{buildroot}/opt/xterminal/xterminal

# Link to /usr/bin
ln -sf /opt/xterminal/xterminal %{buildroot}/usr/bin/xterminal

# Desktop application launcher
cat << 'EOF' > %{buildroot}/usr/share/applications/xterminal.desktop
[Desktop Entry]
Name=xTerminal
Comment=Next-Gen SSH & DevOps Terminal Workstation
Exec=/usr/bin/xterminal --no-sandbox %U
Icon=utilities-terminal
Terminal=false
Type=Application
Categories=Development;System;TerminalEmulator;
StartupWMClass=xterminal
EOF

%files
/opt/xterminal/xterminal
/usr/bin/xterminal
/usr/share/applications/xterminal.desktop

%changelog
* Mon Sep 07 2026 Lyarinet <support@lyarinet.com> - 1.2.6-1
- Initial Fedora Copr release for xTerminal
