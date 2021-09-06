const admin = require("firebase-admin");
const moment = require("moment-timezone");
const hqCrud = require("./crud");
const recipManager = require("../payment/recips");
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
      TargetArn: "arn:aws:sns:us-east-1:827728759512:ElasticBeanstalkNotifications-Environment-zonap",
    },
  },
  function (error) {
    if (error) {
      console.log(error);
    }
  }
);

module.exports.createBlackList = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.hqId) {
      reject({ response: -1, message: `Missing data: hqId` });
      return;
    }
    if (!parameter.plate) {
      reject({ response: -1, message: `Missing data: plate` });
      return;
    }
    // if (!parameter.recipId) {
    //   reject({ response: -1, message: `Missing data: recipId` });
    //   return;
    // }
    if (!parameter.userPhone) {
      reject({ response: -1, message: `Missing data: userPhone` });
      return;
    }
    if (!parameter.value) {
      reject({ response: -1, message: `Missing data: value` });
      return;
    }

    hqCrud
      .readHq({ id: parameter.hqId })
      .then((resultHq) => {
        if (resultHq.response === 1) {
          const db = admin.firestore();
          this.readBlackList({ hqId: parameter.hqId, plate: parameter.plate })
            .then(async (blResult) => {
              try {
                let data = {
                  value: admin.firestore.FieldValue.increment(parameter.value),
                  recipIds: [],
                  status: "active",
                  date: moment().tz("America-Bogota"),
                };
                if (
                  !blResult.data.userPhones.includes(parameter.userPhone) &&
                  parameter.userPhone.startsWith("+57")
                )
                  data.userPhones = admin.firestore.FieldValue.arrayUnion(
                    parameter.userPhone
                  );
                await db
                  .collection("blacklist")
                  .doc(blResult.data.id)
                  .update(data);
                resolve({ response: 1, message: `Blacklist registered` });
              } catch (err) {
                console.log(err);
                reject(err);
              }
            })
            .catch(async (err) => {
              try {
                console.log(err);
                if (err.response && err.response === -2) {
                  parameter.recipIds = [parameter.recipId];
                  if (parameter.userPhone.startsWith("+57"))
                    parameter.userPhones = [parameter.userPhone];
                  delete parameter.userPhone;
                  parameter.status = "active";
                  parameter.date = moment().tz("America-Bogota");
                  let blRef = await db.collection("blacklist").add(parameter);
                  resolve({
                    response: 1,
                    message: `Blacklist registered`,
                    id: blRef.id,
                  });
                } else reject(err);
              } catch (err) {
                console.log(err);
                reject(err);
              }
            });
        } else reject(resultHq);
      })
      .catch((err) => reject(err));
  });
};

module.exports.readBlackList = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.hqId) {
      reject({ response: -1, message: `Missing data: hqId` });
      return;
    }
    if (!parameter.plate) {
      reject({ response: -1, message: `Missing data: hqId` });
      return;
    }
    const db = admin.firestore();
    let blRef = db
      .collection("blacklist")
      .where("hqId", "==", parameter.hqId)
      .where("plate", "==", parameter.plate)
      .where("status", "==", "active");
    blRef
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          reject({ response: -2, message: `Bl not found` });
          return;
        }
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          if (data.date)
            data.date =
              Number(data.date.nanoseconds) === Number(0) ||
              data.date.nanoseconds
                ? data.date.toDate()
                : data.date;
          resolve({ response: 1, message: `BL found`, data });
        });
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

module.exports.payDebts = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.hqId) {
        reject({ response: -1, message: `Missing data: hqId` });
        return;
      }
      if (!parameter.plate) {
        reject({ response: -1, message: `Missing data: plate` });
        return;
      }
      if (!parameter.value) {
        reject({ response: -1, message: `Missing data: value` });
        return;
      }
      if(parameter.generateRecip) {
        if (
          (!parameter.change && Number(parameter.change) !== Number(0)) ||
          parameter.change === null
        ) {
          reject({ response: -1, message: `Missing data: change` });
          return;
        }
        if (
          (!parameter.cash && Number(parameter.cash) !== Number(0)) ||
          parameter.cash === null
        ) {
          reject({ response: -1, message: `Missing data: cash` });
          return;
        }
      }
      this.readBlackList(parameter)
        .then(async (res) => {
          try {
            if (res.data.status === "payed") {
              reject({ response: -2, message: "This debt is already paid" });
              return;
            }
            const dateFactured = moment().tz("America/Bogota");
            const db = admin.firestore();
            let data = {};
            if (res.data.value === parameter.value) {
              data.value = 0;
              data.status = "payed";
            } else {
              data.value = res.data.value - parameter.value;
            }
            await db.collection("blacklist").doc(res.data.id).update(data);
            if (parameter.generateRecip) {
              let vehicleType =
                /[a-zA-Z]/.test(res.data.plate[5]) ||
                res.data.plate.length === 5
                  ? "bike"
                  : "car";
              let reciData = {
                hqId: res.data.hqId,
                plate: res.data.plate,
                phone: res.data.userPhones[0],
                total: data.value > 0 ? data.value : parameter.value,
                officialEmail: parameter.officialEmail,
                dateFactured: dateFactured.toDate(),
                blackList: true,
                type: vehicleType,
                cash: parameter.cash,
                change: parameter.change,
              };
              recipManager
                .createRecip(reciData)
                .then(async (resRecip) => {
                  await db
                    .collection("blacklist")
                    .doc(res.data.id)
                    .update({
                      recipIds: admin.firestore.FieldValue.arrayUnion(
                        resRecip.id
                      ),
                    });
                  const params = {
                    Message: `Deuda pagada a las ${
                      dateFactured.hours() - 12 > 0
                        ? dateFactured.hours() - 12
                        : dateFactured.hours()
                    }:${
                      dateFactured.minutes() < 10
                        ? "0" + dateFactured.minutes()
                        : dateFactured.minutes()
                    } ${
                      dateFactured.hours() - 12 > 0 ? "PM" : "AM"
                    }. ${"\n"} Recibo: https://tinyurl.com/bur82ydc?rid=${
                      resRecip.id
                    }`,
                    PhoneNumber: res.data.userPhones[0],
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
                    resolve({ response: 1, message: `BL payed` });
                  });
                })
                .catch((err) => {
                  console.log(err);
                  reject(err);
                });
            }
          } catch (err) {
            console.log(err);
            reject(err);
          }
        })
        .catch((err) => reject(err));
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

module.exports.listHQDebts = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.hqId) {
      reject({ response: -1, message: `Missing data: hqId` });
      return;
    }
    const db = admin.firestore();
    let blRef = db
      .collection("blacklist")
      .where("hqId", "==", parameter.hqId)
      .where("status", "==", "active");
    blRef
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          reject({ response: -2, message: `Bl not found` });
          return;
        }
        let bl = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          data.date =
            Number(data.date.nanoseconds) === Number(0) || data.date.nanoseconds
              ? data.date.toDate()
              : data.date;
          bl.push(data);
        });
        resolve({ response: 1, message: `BL found`, data: bl });
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

module.exports.blackListForPlate = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.plate) {
      reject({ response: -1, message: `Missing data: plate` });
      return;
    }
    const db = admin.firestore();
    let blRef = db
      .collection("blacklist")
      .where("plate", "==", parameter.plate)
      .where("status", "==", "active");
    blRef
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          reject({ response: -2, message: `Bl not found` });
          return;
        }
        let bl = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.date = data.date.nanoseconds ? data.date.toDate() : data.date;
          data.id = doc.id;
          bl.push(data);
        });
        resolve({ response: 1, message: `BL found`, data: bl });
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};
