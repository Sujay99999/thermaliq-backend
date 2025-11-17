#!/usr/bin/env node

/**
 * Helper script to get your local IP address
 * Run: node get-local-ip.js
 */

const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          address: iface.address
        });
      }
    }
  }

  return addresses;
}

console.log('\n🌐 Your Local IP Addresses:\n');
const ips = getLocalIP();

if (ips.length === 0) {
  console.log('❌ No local IP addresses found. Make sure you\'re connected to WiFi/Ethernet.\n');
} else {
  ips.forEach((ip, index) => {
    console.log(`${index + 1}. ${ip.address} (${ip.interface})`);
  });
  
  // Usually the first one is what you want
  const primaryIP = ips[0].address;
  console.log(`\n✅ Primary IP: ${primaryIP}`);
  console.log(`\n📝 Update this in thermaliq-app-native/src/services/api.js:`);
  console.log(`   const LOCAL_IP = '${primaryIP}';`);
  console.log(`\n🔗 Backend URL for this IP: http://${primaryIP}:3000/api\n`);
}

