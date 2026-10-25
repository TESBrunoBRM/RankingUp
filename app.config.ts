import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'RankingUp',
  slug: config.slug ?? 'rankingup',
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-google-mobile-ads',
      {
        androidAppId:
          process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
        iosAppId:
          process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
        delayAppMeasurementInit: true,
      },
    ],
  ],
});
