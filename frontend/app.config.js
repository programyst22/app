const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const android = { ...config.android };
  const googleServicesFile = process.env.GOOGLE_SERVICES_FILE || android.googleServicesFile;
  if (googleServicesFile && fs.existsSync(path.resolve(__dirname, googleServicesFile))) {
    android.googleServicesFile = googleServicesFile;
  } else {
    delete android.googleServicesFile;
  }
  return { ...config, android };
};
