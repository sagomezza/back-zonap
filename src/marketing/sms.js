const SNS = require("aws-sdk/clients/sns");

const sns = new SNS({
  apiVersion: "2010-03-31",
  accessKeyId: process.env.AWSACCESSKEY,
  secretAccessKey: process.env.AWSSECRETACCESSKEY,
  region: "us-east-1",
});

sns.setSMSAttributes(
  {
    attributes: {
      DefaultSMSType: "Transactional",
      TargetArn:
        "arn:aws:sns:us-east-1:827728759512:ElasticBeanstalkNotifications-Environment-zonap",
    },
  },
  function (error) {
    if (error) {
      console.log(error);
    }
  }
);

module.exports.sendSMS = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (!('phone' in parameter)) {
        reject("phone is required");
        return;
      }
      if (!('message' in parameter)) {
        reject("message is required");
        return;
      }
      if (parameter.message.length === 0) {
        reject("message is required");
        return;
      }
      const params = {
        Message: parameter.message,
        PhoneNumber: parameter.phone,
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
        console.log("publish[data] ", data);
        return resolve({
          response: 1,
          message: `SMS sent successfuly to ${parameter.phone}`,
        });
      });
    } catch (err) {
      console.log(err);
      resolve({ response: 0, err });
    }
  });
};

module.exports.massiveSMS = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("called");
      if (!("phones" in parameter)) {
        reject({ response: -1, message: "phones is required" });
        return;
      }
      console.log("1");
      if (!("message" in parameter)) {
        reject({ response: -1, message: "message is required" });
        return;
      }
      console.log("22");
      if (parameter.phones.length == 0) {
        console.log("inside");
        reject({ response: -1, message: "phones is required" });
        return;
      }
      console.log("3");
      if (parameter.message.length === 0) {
        reject({ response: -1, message: "message is required" });
        return;
      }
      console.log("4");
      let promises = [];
      console.log("before promises");
      parameter.phones.forEach((phone) => {
        console.log(phone);
        promises.push(this.sendSMS({ phone, message: parameter.message }));
        let results = Promise.all(promises);
        results
          .then((data) => {
            console.log(data);
            resolve({
              response: 1,
              message: `Massive emails sent successfuly`,
            });
          })
          .catch((err) => {
            console.log(err);
            resolve(err);
          });
      });
    } catch (err) {
      console.log(err);
      resolve({ response: 0, err });
    }
  });
};
