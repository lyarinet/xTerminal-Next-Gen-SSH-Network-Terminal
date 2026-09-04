import React, { useState } from 'react';
import {
  Radio,
  Wifi,
  Activity,
  Send,
  Power,
  Server,
  Zap,
  CheckCircle2,
  Terminal,
  Shield,
  Layers,
  Search,
  Copy,
  Check,
  AlertTriangle,
  Play
} from 'lucide-react';

export const TelecomHardwareView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cisco' | 'mikrotik' | 'olt' | 'snmp' | 'wol'>('cisco');

  // Cisco State
  const [ciscoDeviceType, setCiscoDeviceType] = useState('ios-xe');
  const [ciscoCommandTemplate, setCiscoCommandTemplate] = useState('interfaces');
  const [ciscoVlanId, setCiscoVlanId] = useState('100');
  const [ciscoVlanName, setCiscoVlanName] = useState('PROD_SERVERS');
  const [ciscoOutput, setCiscoOutput] = useState<string>('');

  // MikroTik State
  const [mtAction, setMtAction] = useState('nat');
  const [mtWanInterface, setMtWanInterface] = useState('sfp-sfpplus1');
  const [mtLanSubnet, setMtLanSubnet] = useState('192.168.10.0/24');
  const [mtOutput, setMtOutput] = useState('');

  // OLT / GPON State
  const [oltBrand, setOltBrand] = useState('huawei');
  const [onuSerial, setOnuSerial] = useState('');
  const [oltSlotPort, setOltSlotPort] = useState('0/1/4');
  const [oltOutput, setOltOutput] = useState('');

  // SNMP State
  const [snmpHost, setSnmpHost] = useState('');
  const [snmpCommunity, setSnmpCommunity] = useState('public');
  const [snmpOid, setSnmpOid] = useState('.1.3.6.1.2.1.1.1.0'); // sysDescr
  const [snmpResults, setSnmpResults] = useState<{ oid: string; name: string; type: string; value: string }[]>([]);

  // Wake-on-LAN State
  const [wolMac, setWolMac] = useState('');
  const [wolBroadcast, setWolBroadcast] = useState('255.255.255.255');
  const [wolPort, setWolPort] = useState(9);
  const [wolHistory, setWolHistory] = useState<{ mac: string; timestamp: string; status: string }[]>([]);
  const [copiedText, setCopiedText] = useState(false);

  const generateCiscoConfig = () => {
    let out = '';
    if (ciscoCommandTemplate === 'interfaces') {
      out = `# Cisco IOS Interface Status Check\nshow ip interface brief\nshow interfaces status | include connected\nshow running-config interface GigabitEthernet 1/0/1\nshow power inline\nshow mac address-table dynamic`;
    } else if (ciscoCommandTemplate === 'vlan') {
      out = `! Cisco IOS Enterprise VLAN Provisioning\nconfigure terminal\nvlan ${ciscoVlanId}\n name ${ciscoVlanName}\n state active\n exit\ninterface GigabitEthernet 1/0/10\n switchport mode access\n switchport access vlan ${ciscoVlanId}\n spanning-tree portfast\n no shutdown\nend\nwrite memory`;
    } else if (ciscoCommandTemplate === 'bgp') {
      out = `! Cisco BGP Peering Template\nconfigure terminal\nrouter bgp 65001\n bgp router-id 10.0.0.1\n neighbor 10.0.0.2 remote-as 65002\n neighbor 10.0.0.2 description "UPSTREAM-TRANSIT-IXP"\n address-family ipv4 unicast\n  neighbor 10.0.0.2 activate\n  network 198.51.100.0 mask 255.255.255.0\n exit-address-family\nend`;
    }
    setCiscoOutput(out);
  };

  const generateMikroTikConfig = () => {
    let out = '';
    if (mtAction === 'nat') {
      out = `/ip firewall nat\nadd action=masquerade chain=srcnat comment="Default NAT Gateway" out-interface=${mtWanInterface} src-address=${mtLanSubnet}\n/ip firewall filter\nadd action=accept chain=input comment="Accept established,related" connection-state=established,related\nadd action=drop chain=input comment="Drop invalid incoming" connection-state=invalid\nadd action=drop chain=input in-interface=${mtWanInterface}`;
    } else if (mtAction === 'wireguard') {
      out = `/interface wireguard\nadd listen-port=13231 mtu=1420 name=wg-telecom\n/interface wireguard peers\nadd allowed-address=10.10.50.2/32 interface=wg-telecom public-key="xTerm987+Base64KeyString=" endpoint-address="vpn.domain.com" endpoint-port=13231\n/ip address\nadd address=10.10.50.1/24 interface=wg-telecom`;
    } else {
      out = `/queue simple\nadd max-limit=100M/100M name=Office-Priority-Queue target=${mtLanSubnet}\n/ip route\nadd check-gateway=ping distance=1 gateway=8.8.8.8 scope=10 target-scope=11`;
    }
    setMtOutput(out);
  };

  const generateOltConfig = () => {
    let out = '';
    if (oltBrand === 'huawei') {
      out = `// Huawei MA5800 / MA5608T GPON Configuration\nenable\nconfig\ninterface gpon ${oltSlotPort}\n ont add 2 sn-auth "${onuSerial}" omci ont-lineprofile-id 10 ont-srvprofile-id 10 desc "FIBER_SUBSCRIBER"\n quit\nservice-port vlan 100 gpon ${oltSlotPort} ont 2 gemport 1 multi-service user-vlan 100 tag-transform translate\ndisplay ont optical-info ${oltSlotPort} 2\n// Expected Rx Optical Power: -18.4 dBm (Healthy range: -8 to -27 dBm)`;
    } else {
      out = `// VSOL / BDCOM GPON OLT Provisioning\nenable\nconfig\ninterface gpon-olt ${oltSlotPort}\n onu 1 type VSOL-ONU-1GE mac ${onuSerial}\n exit\nshow optical-power gpon-olt ${oltSlotPort} onu 1`;
    }
    setOltOutput(out);
  };

  const handleSendWol = async () => {
    if (!wolMac.trim()) return;
    try {
      const res = await fetch('/api/network/wol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          macAddress: wolMac.trim(),
          broadcastIp: wolBroadcast.trim() || '255.255.255.255',
          port: wolPort || 9,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const item = {
          mac: wolMac,
          timestamp: new Date().toLocaleTimeString(),
          status: data.message || `Magic packet broadcasted to ${wolBroadcast || '255.255.255.255'}:${wolPort}`,
        };
        setWolHistory((prev) => [item, ...prev]);
      } else {
        const item = {
          mac: wolMac,
          timestamp: new Date().toLocaleTimeString(),
          status: `Error: ${data.error || 'Failed to broadcast packet'}`,
        };
        setWolHistory((prev) => [item, ...prev]);
      }
    } catch (err: any) {
      const item = {
        mac: wolMac,
        timestamp: new Date().toLocaleTimeString(),
        status: `Network error: ${err.message}`,
      };
      setWolHistory((prev) => [item, ...prev]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-gray-200 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-[#222224] flex items-center justify-between bg-[#111112]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Telecom, Cisco &amp; Hardware Diagnostics
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                NOC SUITE
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Cisco IOS templates, MikroTik RouterOS API tools, GPON/OLT provisioning, SNMP MIB Walker, and Wake-on-LAN.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#222224]">
          {[
            { id: 'cisco', label: 'Cisco IOS' },
            { id: 'mikrotik', label: 'MikroTik RouterOS' },
            { id: 'olt', label: 'GPON / OLT' },
            { id: 'snmp', label: 'SNMP MIB Explorer' },
            { id: 'wol', label: 'Wake-on-LAN' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-emerald-500 text-black shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Cisco Tab */}
        {activeTab === 'cisco' && (
          <div className="space-y-4">
            <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                Cisco IOS / IOS-XE Command Generator &amp; Provisioner
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Configuration Type</label>
                  <select
                    value={ciscoCommandTemplate}
                    onChange={(e) => setCiscoCommandTemplate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  >
                    <option value="interfaces">Interface Diagnostics &amp; Status</option>
                    <option value="vlan">Enterprise VLAN &amp; Access Port</option>
                    <option value="bgp">BGP Peering &amp; Prefix Announcement</option>
                  </select>
                </div>
                {ciscoCommandTemplate === 'vlan' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">VLAN ID (1-4094)</label>
                      <input
                        type="text"
                        value={ciscoVlanId}
                        onChange={(e) => setCiscoVlanId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">VLAN Name</label>
                      <input
                        type="text"
                        value={ciscoVlanName}
                        onChange={(e) => setCiscoVlanName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                      />
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={generateCiscoConfig}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Generate Cisco CLI Batch</span>
              </button>
            </div>

            {ciscoOutput && (
              <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">CLI Command Script Output</span>
                  <button
                    onClick={() => copyToClipboard(ciscoOutput)}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-mono"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded bg-black/90 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {ciscoOutput}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* MikroTik Tab */}
        {activeTab === 'mikrotik' && (
          <div className="space-y-4">
            <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                MikroTik RouterOS v7 Script Builder
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Feature</label>
                  <select
                    value={mtAction}
                    onChange={(e) => setMtAction(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  >
                    <option value="nat">Firewall NAT Masquerade &amp; Filter</option>
                    <option value="wireguard">WireGuard VPN Server Endpoint</option>
                    <option value="queue">Bandwidth Queues &amp; Route Tracking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">WAN Interface</label>
                  <input
                    type="text"
                    value={mtWanInterface}
                    onChange={(e) => setMtWanInterface(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">LAN Subnet (CIDR)</label>
                  <input
                    type="text"
                    value={mtLanSubnet}
                    onChange={(e) => setMtLanSubnet(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>
              <button
                onClick={generateMikroTikConfig}
                className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Generate RouterOS Commands</span>
              </button>
            </div>

            {mtOutput && (
              <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">RouterOS Terminal Input</span>
                  <button
                    onClick={() => copyToClipboard(mtOutput)}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-mono"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded bg-black/90 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {mtOutput}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* GPON / OLT Tab */}
        {activeTab === 'olt' && (
          <div className="space-y-4">
            <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                GPON OLT &amp; ONU Optical Provisioning
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">OLT Platform</label>
                  <select
                    value={oltBrand}
                    onChange={(e) => setOltBrand(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  >
                    <option value="huawei">Huawei SmartAX MA5800 / MA5608T</option>
                    <option value="vsol">VSOL / BDCOM GPON OLT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ONU Serial / MAC</label>
                  <input
                    type="text"
                    value={onuSerial}
                    onChange={(e) => setOnuSerial(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Slot/Subslot/Port</label>
                  <input
                    type="text"
                    value={oltSlotPort}
                    onChange={(e) => setOltSlotPort(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>
              <button
                onClick={generateOltConfig}
                className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Generate OLT CLI Config</span>
              </button>
            </div>

            {oltOutput && (
              <div className="bg-[#111112] border border-[#222224] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">OLT Provisioning Output</span>
                  <button
                    onClick={() => copyToClipboard(oltOutput)}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-mono"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded bg-black/90 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {oltOutput}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* SNMP MIB Explorer */}
        {activeTab === 'snmp' && (
          <div className="space-y-4">
            <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                SNMP MIB Explorer &amp; OID Walker (v2c / v3)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Host IP</label>
                  <input
                    type="text"
                    value={snmpHost}
                    onChange={(e) => setSnmpHost(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Community String</label>
                  <input
                    type="password"
                    value={snmpCommunity}
                    onChange={(e) => setSnmpCommunity(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Root OID</label>
                  <input
                    type="text"
                    value={snmpOid}
                    onChange={(e) => setSnmpOid(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>
              <button className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition-colors">
                <Search className="w-3.5 h-3.5" />
                <span>Walk MIB Subtree</span>
              </button>
            </div>

            <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222224] bg-[#0E0E10] text-xs font-bold text-white">
                SNMP Query Results ({snmpResults.length} Objects)
              </div>
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#1C1C1E] text-gray-400 text-[11px]">
                  <tr>
                    <th className="p-3">OID</th>
                    <th className="p-3">Variable Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222224]">
                  {snmpResults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 font-mono text-xs">
                        No SNMP query results. Enter a target host IP and click "Walk MIB Subtree" to query OIDs.
                      </td>
                    </tr>
                  ) : (
                    snmpResults.map((r) => (
                      <tr key={r.oid} className="hover:bg-white/5">
                        <td className="p-3 text-gray-400">{r.oid}</td>
                        <td className="p-3 text-emerald-400 font-bold">{r.name}</td>
                        <td className="p-3 text-blue-400">{r.type}</td>
                        <td className="p-3 text-gray-200">{r.value}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wake-on-LAN Tab */}
        {activeTab === 'wol' && (
          <div className="space-y-4">
            <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Power className="w-4 h-4 text-amber-400" />
                Wake-on-LAN (WoL) Magic Packet Transmitter
              </h3>
              <p className="text-xs text-gray-400">
                Transmit standard IEEE 802.3 broadcast frames with 6x FF followed by 16 repetitions of the target MAC address.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target MAC Address</label>
                  <input
                    type="text"
                    value={wolMac}
                    onChange={(e) => setWolMac(e.target.value)}
                    placeholder="00:11:22:33:44:55"
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Broadcast IP</label>
                  <input
                    type="text"
                    value={wolBroadcast}
                    onChange={(e) => setWolBroadcast(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">UDP Port</label>
                  <input
                    type="number"
                    value={wolPort}
                    onChange={(e) => setWolPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
                  />
                </div>
              </div>
              <button
                onClick={handleSendWol}
                className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Magic Packet</span>
              </button>
            </div>

            {wolHistory.length > 0 && (
              <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-white font-mono">Transmission History</span>
                <div className="space-y-1">
                  {wolHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-mono p-2 rounded bg-black/50 border border-gray-800">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{h.mac}</span>
                      </div>
                      <span className="text-gray-400">{h.status}</span>
                      <span className="text-gray-500">{h.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
