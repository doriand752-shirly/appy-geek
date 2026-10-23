/**
 * Xcode 27+ rejects pods with IPHONEOS_DEPLOYMENT_TARGET < 15.0.
 * Force all CocoaPods targets up to the app minimum.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# with-ios-deployment-target';
const MIN_IOS = '15.1';

const POST_INSTALL_SNIPPET = `
  ${MARKER}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if current.nil? || current.to_f < ${MIN_IOS}.to_f
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS}'
      end
    end
  end
`;

function withIosDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) {
        return cfg;
      }

      // Inject into the existing post_install block (Expo always generates one).
      if (/post_install\s+do\s+\|installer\|/.test(contents)) {
        contents = contents.replace(
          /post_install\s+do\s+\|installer\|/,
          (match) => `${match}\n${POST_INSTALL_SNIPPET}`
        );
      } else {
        contents += `\npost_install do |installer|\n${POST_INSTALL_SNIPPET}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

module.exports = withIosDeploymentTarget;
