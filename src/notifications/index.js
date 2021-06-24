const admin = require('firebase-admin');
const Expo = require ('expo-server-sdk').Expo;

module.exports.sendPush = (somePushTokens) => {
  let pushToken = somePushTokens.pushToken;
  let messagePush = somePushTokens.message;
  let dataPush = somePushTokens.data;
  // Create the messages that you want to send to clents
  let messages = [];
  // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

  // Check that all your push tokens appear to be valid Expo push tokens
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  } else {
    // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications.html)
    messages.push({
      to: pushToken,
      sound: 'default',
      title: somePushTokens.app === 'bluer' ? 'Bluspot para parquear' : 'Bluspot para arrendar',
      badge: 1,
      body: messagePush,
      data: dataPush
    })
    // }
  
      // The Expo push notification service accepts batches of notifications so
      // that you don't need to send 1000 requests to send 1000 notifications. We
      // recommend you batch your notifications to reduce the number of requests
      // and to compress them (notifications with similar content will get
      // compressed).
    
      let chunks = expo.chunkPushNotifications(messages);

      (async () => {
        // Send the chunks to the Expo push notification service. There are
        // different strategies you could use. A simple one is to send one chunk at a
        // time, which nicely spreads the load out over time:
        for (let chunk of chunks) {
          try {
            let receipts = await expo.sendPushNotificationsAsync(chunk);
          } catch (error) {
            console.error(error);
          }
        }
      })();
   

  }
}