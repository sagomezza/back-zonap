const admin = require('firebase-admin');
const Expo = require ('expo-server-sdk').Expo;
const SNS = require("aws-sdk/clients/sns");
const moment = require("moment-timezone");

const sns = new SNS({
  apiVersion: "2010-03-31",
  accessKeyId: process.env.AWSACCESSKEY,
  secretAccessKey: process.env.AWSSECRETACCESSKEY,
  region: "us-east-1",
});

if(process.env.ENVIRONMENT !== 'test') {
  sns.setSMSAttributes(
    {
      attributes: {
        DefaultSMSType: "Transactional",
        //  TargetArn:
        //    "arn:aws:sns:us-east-1:827728759512:ElasticBeanstalkNotifications-Environment-zonap",
      },
    },
    function (error) {
      if (error) {
        console.log(error);
      }
    }
  );
}

module.exports.sendMassiveSMS = () => {
  return new Promise ((resolve, reject) => {

    console.log("------ SEND MASSIVE SMS ------")
    const db = admin.firestore();
    let mensualities = []
    let dateStart = admin.firestore.Timestamp.fromDate(
      moment().tz("America/Bogota").toDate()
    );
    let dateEnd = admin.firestore.Timestamp.fromDate(
      moment().add(10, 'days').tz("America/Bogota").toDate()
      );
    db
      .collection("mensualities")
      .get()
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          let data = doc.data()
          if(data.type === 'personal' && data.validity >= dateStart && data.validity <= dateEnd){
            mensualities.push(data.userPhone)
          }
        })

        try {
          mensualities.forEach( mensualityPhone => {
            const params = {
              Message: `Apreciado usuario, le recordamos que la renovación de su mensualidad en el PK Zona P Lleras vence el 05/10/2021, el pronto pago garantiza la continuación de su servicio.`,
              PhoneNumber: mensualityPhone,
              MessageAttributes: {
                "AWS.SNS.SMS.SMSType": {
                  DataType: "String",
                  StringValue: "Transactional",
                },
              },
            };
            sns.publish(params, (err, data) => {
              if (err) {
                console.log("publish[ERR] ", err, err.stack);
                return reject(err);
              }
              // console.log("publish[data] ", data);
              // console.log('Message was sent')
            });
          })
          resolve({
            response: 1,
            message: `All the messages were sent`,
            data: mensualities
          })
          return;
        } catch (err) {
          reject({
            response: -1,
            message: err
          })
        }
      })
  })
}

// module.exports.sendPush = (somePushTokens) => {
//   let pushToken = somePushTokens.pushToken;
//   let messagePush = somePushTokens.message;
//   let dataPush = somePushTokens.data;
//   // Create the messages that you want to send to clents
//   let messages = [];
//   // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

//   // Check that all your push tokens appear to be valid Expo push tokens
//   if (!Expo.isExpoPushToken(pushToken)) {
//     console.error(`Push token ${pushToken} is not a valid Expo push token`);
//     return;
//   } else {
//     // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications.html)
//     messages.push({
//       to: pushToken,
//       sound: 'default',
//       title: somePushTokens.app === 'bluer' ? 'Bluspot para parquear' : 'Bluspot para arrendar',
//       badge: 1,
//       body: messagePush,
//       data: dataPush
//     })
//     // }
  
//       // The Expo push notification service accepts batches of notifications so
//       // that you don't need to send 1000 requests to send 1000 notifications. We
//       // recommend you batch your notifications to reduce the number of requests
//       // and to compress them (notifications with similar content will get
//       // compressed).
    
//       let chunks = expo.chunkPushNotifications(messages);

//       (async () => {
//         // Send the chunks to the Expo push notification service. There are
//         // different strategies you could use. A simple one is to send one chunk at a
//         // time, which nicely spreads the load out over time:
//         for (let chunk of chunks) {
//           try {
//             let receipts = await expo.sendPushNotificationsAsync(chunk);
//           } catch (error) {
//             console.error(error);
//           }
//         }
//       })();
   

//   }
// }