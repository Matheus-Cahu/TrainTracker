const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs SQLite compiled to WebAssembly.
config.resolver.assetExts.push('wasm');

module.exports = config;
