# Privacy Policy for xTerminal

**Last Updated:** September 7, 2026  
**Effective Date:** September 7, 2026

**xTerminal** ("we", "our", or "the Application") is an open-source, multi-protocol SSH, Telnet, Serial, and DevOps terminal workstation developed by **Lyarinet** ("Developer", "we", "us"). We value your privacy and are committed to safeguarding your personal information and sensitive data.

This Privacy Policy explains how our software handles your data when you use the xTerminal desktop application, mobile application (Android / Capacitor), or related software packages.

---

## 1. Summary — Privacy by Design

* **Zero Personal Data Collection:** We do not collect, sell, rent, or harvest your personal information, browsing habits, or server usage.
* **No Telemetry Tracking:** We do not include third-party tracking scripts, advertising SDKs, or background telemetry trackers.
* **Local Data Sovereignty:** All server hostnames, credentials, private SSH keys, command history, and configurations are stored strictly on your local device.

---

## 2. Information We Handle & Where It Stays

### A. Server Credentials & Connection Data
* **What it is:** IP addresses, hostnames, ports, SSH private keys, passphrases, and usernames.
* **How it is handled:** Stored securely and encrypted on your local device using industry-standard cryptography. We have no access to your credentials, keys, or passwords.

### B. Terminal Sessions & Command Output
* **What it is:** The commands you type and the text output streamed back by remote servers.
* **How it is handled:** Transmitted directly and end-to-end between your device and your designated remote server via encrypted SSH or user-chosen protocols. We do not inspect, log, or store your terminal buffers on our servers.

### C. Team Multiplayer Collaboration (When Enabled)
* When you explicitly choose to share an active terminal session with a colleague via a multiplayer link, the terminal output is relayed in real-time between participants. No session data is retained after the session is terminated.

---

## 3. Device Permissions & Why They Are Needed

xTerminal requests only the minimum operating system permissions required to function as an enterprise network terminal:

| Permission | Purpose |
| :--- | :--- |
| **Internet (`INTERNET`)** | Essential to establish outbound SSH, Telnet, SFTP, and WebSerial network connections to your servers. |
| **Network State (`ACCESS_NETWORK_STATE`)** | To monitor network connectivity status (e.g. WiFi vs Mobile data) and provide automatic keep-alive reconnection. |
| **Local Storage / Filesystem** | To save SSH key pairs, export/import connection bookmarks, and download files via SFTP to your device. |
| **USB / Serial Port Access** | Required only when connecting to local hardware (routers, switches, microcontrollers) via USB-to-Serial console cables or Android ADB. |

---

## 4. Third-Party Services & Analytics

xTerminal does **not** integrate third-party advertising networks, analytics engines (such as Google Analytics, Firebase Analytics, or Facebook Pixel), or data brokers.

---

## 5. Security of Your Data

We implement robust security practices:
* All sensitive credentials stored locally are encrypted.
* Remote communication strictly utilizes secure communication standards (SSHv2, SFTP, TLS/WSS).
* We recommend protecting your device with a secure lock screen (PIN, password, or biometrics) to safeguard your local keystore.

---

## 6. Children's Privacy

xTerminal is an enterprise developer and network administration tool. We do not knowingly collect or solicit personal information from children under the age of 13.

---

## 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect updates in features or regulatory requirements. Any modifications will be posted here with an updated "Last Updated" date.

---

## 8. Open Source Transparency

xTerminal is committed to transparency. Users and security researchers may inspect our open-source codebase on GitHub to independently verify our security and privacy practices:
[https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal](https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal)

---

## 9. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or your data privacy, please reach out to us:

* **Developer:** Lyarinet
* **Email:** [support@lyarinet.com](mailto:support@lyarinet.com)
* **Website:** [https://github.com/lyarinet](https://github.com/lyarinet)
