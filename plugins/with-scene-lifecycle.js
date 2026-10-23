/**
 * SDK 54 + Xcode 27 / iOS 27 SDK: adopt UIKit scene lifecycle so the app launches.
 * Based on the Expo community fix for UIScene (enableSceneSupport lands in SDK 57+).
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const MARKER = '// scene lifecycle (with-scene-lifecycle.js)';

const WINDOW_BLOCK = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
      _ = appDelegate.application(UIApplication.shared, open: url, options: [:])
    } else if let activity = connectionOptions.userActivities.first(where: {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }), let url = activity.webpageURL {
      launchOptions[.url] = url
      _ = appDelegate.application(
        UIApplication.shared,
        continue: activity,
        restorationHandler: { _ in })
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions.isEmpty ? nil : launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in })
  }
}
`;

function patchAppDelegate(contents) {
  if (contents.includes(MARKER)) return contents;
  if (!contents.includes(WINDOW_BLOCK)) {
    throw new Error(
      'with-scene-lifecycle: window block not found in AppDelegate.swift. ' +
        'Remove this plugin if Expo already adopted UIScene, or update the matcher.',
    );
  }
  return (
    contents.replace(WINDOW_BLOCK, '    // The window is made by SceneDelegate, below.\n') +
    SCENE_DELEGATE
  );
}

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return mod;
  });

  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle expects a Swift AppDelegate.');
    }
    mod.modResults.contents = patchAppDelegate(mod.modResults.contents);
    return mod;
  });
};

module.exports.patchAppDelegate = patchAppDelegate;
