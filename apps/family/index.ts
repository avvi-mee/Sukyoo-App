import { registerRootComponent } from 'expo';

// Registers the background notification task at module scope, before
// anything else runs — required so the OS can find it even when the app is
// launched headless to handle a killed-state push. See backgroundTask.ts.
import './src/notifications/backgroundTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
