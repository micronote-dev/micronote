const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,

    // ★ 必須
    appBundleId: 'com.asahisoftwareengineer.micronote',
    appCategoryType: 'public.app-category.productivity',

    // ★ これがないと今のエラーになる
    osxSign: {
      identity: 'Developer ID Application: AsahiFujisawa (8WDL2K6F4L)',
      hardenedRuntime: true,
      entitlements: 'entitlements.plist',
      entitlementsInherit: 'entitlements.plist',
    },

    // notarize は codesign 後に実行される
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    },
  },

  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'AsahiSoftWareEngineer',
          name: 'micro-note',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],

  makers: [
    { name: '@electron-forge/maker-squirrel', config: {} },
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb', config: {} },
    { name: '@electron-forge/maker-rpm', config: {} },
  ],

  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
