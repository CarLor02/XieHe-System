const brand = require('./src/shared/theme/brand.json');

// 构建配置与应用共用纯品牌数据，不能从含 StyleSheet 的主题入口加载原生模块。
module.exports = ({ config }) => ({
  ...config,
  plugins: config.plugins.map(plugin =>
    Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      ? [plugin[0], { ...plugin[1], backgroundColor: brand.primary }]
      : plugin
  ),
});
