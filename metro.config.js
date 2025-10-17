const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Add bundle splitting and optimization
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Optimize bundle by excluding unused modules
config.resolver.blacklistRE = /(.*\/__tests__\/.*|.*\/test\/.*|.*\.test\.(js|jsx|ts|tsx)$|.*\.spec\.(js|jsx|ts|tsx)$)/;

// Reduce bundle size by enabling tree shaking
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
  output: {
    ascii_only: true,
    quote_style: 3,
    wrap_iife: true,
  },
  sourceMap: false,
  toplevel: false,
  warnings: false,
  parse: {
    html5_comments: false,
    shebang: false,
  },
  compress: {
    drop_console: true, // Remove console.log in production
    drop_debugger: true,
    pure_getters: true,
    unsafe: true,
    unsafe_comps: true,
    warnings: false,
  },
};

// Enable inlineRequires for smaller bundles (fixed version)
config.serializer = {
  ...config.serializer,
  // Remove the invalid inlineRequires option
};

// Enable Hermes for better performance and smaller bundles
config.transformer.hermesParser = true;

module.exports = config;