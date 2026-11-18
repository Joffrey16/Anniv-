// Permet de publier la version web dans un sous-dossier (ex. GitHub Pages : /anniv).
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments || {}), baseUrl: process.env.EXPO_BASE_URL || '' },
});
