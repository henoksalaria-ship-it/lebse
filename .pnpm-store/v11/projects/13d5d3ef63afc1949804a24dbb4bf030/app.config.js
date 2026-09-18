const appUrl=process.env.EXPO_PUBLIC_MARKETPLACE_URL;
if(process.env.EAS_BUILD&&(!appUrl||!/^https:\/\//.test(appUrl)))throw new Error('Set EXPO_PUBLIC_MARKETPLACE_URL to the reviewed HTTPS marketplace origin before creating a phone build. Localhost is for Expo Go / USB development only.');
export default {
 expo:{name:'Lebse',slug:'lebse-mobile',scheme:'lebse',version:'0.2.0',orientation:'portrait',userInterfaceStyle:'light',backgroundColor:'#f8f5ee',
  ios:{supportsTablet:true,bundleIdentifier:'com.lebse.marketplace',infoPlist:{NSCameraUsageDescription:'Add photos of your own pieces and order evidence.',NSPhotoLibraryUsageDescription:'Choose listing and order evidence photos.',ITSAppUsesNonExemptEncryption:false}},
  android:{package:'com.lebse.marketplace',permissions:['android.permission.INTERNET'],blockedPermissions:['android.permission.RECORD_AUDIO','android.permission.ACCESS_FINE_LOCATION','android.permission.ACCESS_COARSE_LOCATION']},
  plugins:['expo-router'],experiments:{typedRoutes:true},extra:{marketplaceOrigin:appUrl||null}
 }
};
