const { getDefaultConfig } = require('expo/metro-config');
const { withDevkit } = require('miaoda-expo-devkit/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Résolution de l'alias @/ → src/ (nécessaire pour le build web expo export)
const srcDir = path.resolve(__dirname, 'src');
const upstream = config.resolver?.resolveRequest ?? null;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const resolved = path.join(srcDir, moduleName.slice(2));
    return context.resolveRequest(context, resolved, platform);
  }
  if (upstream) return upstream(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withDevkit(config);
