const { response } = require("express");
const admin = require("firebase-admin");
const hqCrud = require("../headquarters/crud");
const recipManager = require("../payment/recips");
const SNS = require("aws-sdk/clients/sns");
const moment = require("moment-timezone");

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
    },
  },
  function (error) {
    if (error) {
      console.log(error);
    }
  }
);

module.exports.createMensuality = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      // if (!parameter.type) { reject({ response: -1, message: `Missing data: type` }); return }
      // if (!parameter.capacity) { reject({ response: -1, message: `Missing data: capacity` }); return }
      // if (!parameter.userPhone) { reject({ response: -1, message: `Missing data: userPhone` }); return }
      // if (!parameter.plates) { reject({ response: -1, message: `Missing data: plates` }); return }
      // if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }) }
      if (parameter.generateRecip && parameter.pending) {
        reject({
          response: -1,
          message: `You can't generate a recip for a pending mensuality. Operation cancelled`,
        });
      }
      if (parameter.generateRecip) {
        if (!parameter.cash && Number(parameter.cash) !== Number(0)) {
          reject({ response: -1, message: `Missing data: cash` });
          return;
        }
        if (!parameter.change && Number(parameter.change) !== Number(0)) {
          reject({ response: -1, message: `Missing data: change` });
          return;
        }
      }
      let validity = "";
      console.log(parameter);
      if (!parameter.validity) {
        validity = moment()
          .tz("America/Bogota")
          .add(1, "month")
          .set({
            date: 5,
            hours: 23,
            minutes: 59,
            seconds: 59,
            milliseconds: 59,
          })
          .toDate();
        parameter.validity = admin.firestore.Timestamp.fromDate(validity);
      } else validity = parameter.validity;
      hqCrud
        .readHq({ id: parameter.hqId })
        .then((hqRes) => {
          try {
            let newPlates = [];
            let existing = [];
            let promises = [];
            parameter.plates.forEach((plate) => {
              promises.push(
                this.findMensualityPlate({ plate })
                  .then((result) => {
                    let hqMensuality = result.data.filter((men) => {
                      return men.hqId === parameter.hqId;
                    });
                    if (hqMensuality.length && hqMensuality.length > 0)
                      existing.push(plate);
                    else newPlates.push(plate);
                  })
                  .catch(async (err) => {
                    if (err.response === -1) newPlates.push(plate);
                    else reject(err);
                  })
              );
            });
            let results = Promise.all(promises);
            results
              .then(async (data) => {
                try {
                  if (newPlates.length === 0) {
                    reject({
                      response: -2,
                      message: `There are non-registered plates. Mensuality was not created`,
                    });
                    return;
                  }
                  let response = {};
                  if (parameter.mensualityType === "corporative")
                    parameter.code = Number(String(Math.floor(Math.random() * new Date().getTime())).substr(0,5));
                  parameter.plates = [...newPlates];
                  const db = admin.firestore();
                  parameter.status = "active";
                  parameter.total =
                    parameter.vehicleType === "car"
                      ? hqRes.data.monthlyCarPrice
                      : hqRes.data.monthlyBikePrice;
                  parameter.validity = admin.firestore.Timestamp.fromDate(
                    validity
                  );
                  if (parameter.generateRecip) {
                    console.log("Generate recip");
                    delete parameter.generateRecip;
                    delete parameter.pending;
                    let currentReserve = {
                      hqId: parameter.hqId,
                      plate: parameter.plates,
                      phone: parameter.userPhone,
                      total: parameter.total,
                      officialEmail: parameter.officialEmail,
                      dateStart: moment().tz("America/Bogota").toDate(),
                      mensuality: true,
                      dateFinished: parameter.validity,
                      hours: "1 month",
                      type: parameter.vehicleType,
                      cash: parameter.cash,
                      change: parameter.change,
                    };
                    recipManager
                      .createRecip(currentReserve)
                      .then(async (resRecip) => {
                        delete parameter.cash;
                        delete parameter.change;
                        parameter.recipId = resRecip.id;
                        parameter.parkedPlatesList = []
                        var request = await db
                          .collection("mensualities")
                          .add(parameter);
                        if (existing.length > 0) {
                          response.response = 2;
                          response.message = `Mensuality created succesfully, but there are some plates that already existed in other mensuality for this HQ`;
                          response.existinPlates = existing;
                        } else {
                          response.response = 1;
                          response.message = `Mensuality created succesfully`;
                        }
                        await db
                          .collection("users")
                          .doc(parameter.userId)
                          .update({ mensuality: request.id });
                        let dateStart = moment().tz("America/Bogota");
                        const params = {
                          Message: `¡Hola! Esperamos tengas una excelente experiencia en Zona P. ${"\n"} Pagaste una mensualidad para nuestro parqueadero ${
                            hqRes.data.name
                          } a las ${
                            dateStart.hours() - 12 > 0
                              ? dateStart.hours() - 12
                              : dateStart.hours()
                          }:${
                            dateStart.minutes() < 10
                              ? "0" + dateStart.minutes()
                              : dateStart.minutes()
                          } ${
                            dateStart.hours() - 12 > 0 ? "PM" : "AM"
                          }. ${"\n"} Aquí está tu recibo: http://zonap-recip.s3-website-us-east-1.amazonaws.com/?rid=${
                            resRecip.id
                          } ${"\n"} Tus datos serán tratados conforme a nuestra política de privacidad, la encuentras en https://bit.ly/3rQeKDM`,
                          PhoneNumber: parameter.userPhone,
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
                          response.id = request.id;
                          resolve(response);
                        });
                      })
                      .catch((err) => {
                        console.log(err);
                        reject(err);
                      });
                  } else {
                    console.log("Without recip");
                    delete parameter.cash;
                    delete parameter.change;
                    delete parameter.generateRecip;
                    console.log(parameter);
                    if (parameter.pending) {
                      console.log("pending");
                      parameter.status = "pending";
                    }
                    delete parameter.pending;
                    parameter.parkedPlatesList = []
                    let request = await db
                      .collection("mensualities")
                      .add(parameter);
                    await db
                      .collection("users")
                      .doc(parameter.userId)
                      .update({ mensuality: request.id });
                    response.response = 1;
                    response.message = `Mensuality created succesfully`;
                    resolve(response);
                  }
                } catch (err) {
                  console.log(err);
                  reject(err);
                }
              })
              .catch((err) => {
                console.log(err);
                reject(err);
              });
          } catch (err) {
            console.log(err);
            reject(err);
          }
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });

      return;
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

module.exports.readMensuality = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.id) {
        reject({ response: -1, message: `Missing data: id` });
        return;
      }
      const db = admin.firestore();
      console.log(typeof parameter.id, parameter.id);
      if (typeof parameter.id === "object") {
        console.log("case object");
        let promises = [];
        let mensualities = [];
        parameter.id.forEach((id) => {
          promises.push(
            db
              .collection("mensualities")
              .doc(id)
              .get()
              .then((doc) => {
                if (!doc.exists) {
                  console.log("Mensuality not found");
                  reject({ response: -1, err: "Mensuality not found!" });
                  return;
                }
                let data = doc.data();
                data.id = doc.id;
                data.validity =
                  Number(data.validity.nanoseconds) === Number(0) ||
                  data.validity.nanoseconds
                    ? data.validity.toDate()
                    : data.validity;
                mensualities.push(data);
              })
              .catch((err) => {
                console.log(err);
                reject(err);
              })
          );
        });
        let results = Promise.all(promises);
        results.then((res) => {
          resolve({
            response: 1,
            message: `Mensuality found succesfully`,
            data: mensualities,
          });
        });
      } else {
        console.log("case string");
        db.collection("mensualities")
          .doc(parameter.id)
          .get()
          .then((doc) => {
            if (!doc.exists) {
              console.log("Mensuality not found");
              reject({ response: -1, err: "Mensuality not found!" });
              return;
            }
            let data = doc.data();
            data.id = doc.id;
            data.validity =
              Number(data.validity.nanoseconds) === Number(0) ||
              data.validity.nanoseconds
                ? data.validity.toDate()
                : data.validity;
            resolve({
              response: 1,
              message: `Mensuality found succesfully`,
              data: data,
            });
            return;
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
  });
};

module.exports.editMensuality = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.id) {
        reject({ response: -1, message: `Missing data: id` });
        return;
      }
      let data = {};
      if (parameter.plates) data.plates = parameter.plates;
      if (parameter.email) data.email = parameter.email;
      if (parameter.phone) data.userPhone = parameter.phone;
      if (Object.values(data).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      const db = admin.firestore();
      await db.collection("mensualities").doc(parameter.id).update(data);
      resolve({ response: 1, message: `Mensuality edited succesfully` });
    } catch (err) {
      console.log(err);
      reject({ response: 0, message: `Error editing mensuality` });
    }
  });
};

module.exports.findMensualityPlate = (parameter) => {
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
    let mensualityRef = db.collection("mensualities");
    let query = mensualityRef
      .where("plates", "array-contains", parameter.plate)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          reject({ response: -1, message: `Mensuality not found` });
          return;
        }
        let fullData = [];
        let promises = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          data.validity =
            Number(data.validity.nanoseconds) === Number(0) ||
            data.validity.nanoseconds
              ? data.validity.toDate()
              : data.validity;
          promises.push(
            db
              .collection("users")
              .doc(data.userId)
              .get()
              .then((doc) => {
                if (doc.exists) {
                  data.userName = doc.data().name + " " + doc.data().lastName;
                  fullData.push(data);
                } else fullData.push(data);
              })
          );
        });
        let results = Promise.all(promises);
        results.then((res) => {
          resolve({
            response: 1,
            message: `Mensuality found succesfully`,
            data: fullData,
          });
        });
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

module.exports.renewMensuality = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.plate) {
        reject({ response: -1, message: `Missing data: plate` });
        return;
      }
      if (!parameter.hqId) {
        reject({ response: -1, message: `Missing data: hqId` });
        return;
      }
      if (!parameter.officialEmail) {
        reject({ response: -1, message: `Missing data: officialEmail` });
        return;
      }
      console.log("[renewMensuality]:");
      console.log(parameter);
      console.log("[renewMensuality]:");
      console.log(parameter.plate);
      let hqData = await hqCrud.readHq({id: parameter.hqId});
      this.findMensualityPlate(parameter)
        .then(async (res) => {
          try {
            const db = admin.firestore();
            console.log(res);
            let validity = moment()
              .tz("America/Bogota")
              .add(1, "month")
              .set({
                date: 5,
                hours: 23,
                minutes: 59,
                seconds: 59,
                milliseconds: 59,
              })
              .toDate();
            let data = await res.data.find(
              (mensuality) =>
                mensuality.hqId === parameter.hqId &&
                mensuality.type === "personal"
            );
            if (!data) {
              reject({
                response: -2,
                message: `This plate doesn't have a mensulity in this HQ`,
              });
              return;
            }
            if (
              data.status === "active" &&
              moment().tz("America/Bogota").date() > 5
            ) {
              resolve({ response: 2, message: `Mensuality is already active` });
              return;
            }
            console.log(validity);
            console.log(data);
            await db
              .collection("mensualities")
              .doc(data.id)
              .update({ validity, status: "active" });
            let currentReserve = {
              hqId: data.hqId,
              plate: data.plates,
              phone: data.userPhone,
              total:
                data.vehicleType === "car"
                  ? hqData.data.monthlyCarPrice
                  : hqData.data.monthlyBikePrice,
              officialEmail: parameter.officialEmail,
              dateStart: moment().tz("America/Bogota").toDate(),
              mensuality: true,
              dateFinished: validity,
              hours: "1 month",
              type: data.vehicleType,
              cash: parameter.cash,
              change: parameter.change,
            };
            recipManager.createRecip(currentReserve).then(async (resRecip) => {
              let dateStart = moment().tz("America/Bogota");
              const params = {
                Message: `¡Hola! Esperamos tengas una excelente experiencia en Zona P. ${"\n"} Renovaste tu mensualidad para nuestro parqueadero a las ${
                  dateStart.hours() - 12 > 0
                    ? dateStart.hours() - 12
                    : dateStart.hours()
                }:${
                  dateStart.minutes() < 10
                    ? "0" + dateStart.minutes()
                    : dateStart.minutes()
                } ${
                  dateStart.hours() - 12 > 0 ? "PM" : "AM"
                }. ${"\n"} Aquí está tu recibo: http://zonap-recip.s3-website-us-east-1.amazonaws.com/?rid=${
                  resRecip.id
                } ${"\n"} Tus datos serán tratados conforme a nuestra política de privacidad, la encuentras en https://bit.ly/3rQeKDM`,
                PhoneNumber: data.userPhone,
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
                resolve({ response: 1, message: "renewed" });
              });
            });
          } catch (err) {
            console.log("[renewMensuality - ERR]:");
            console.log(err);
            reject(err);
          }
        })
        .catch((err) => {
          console.log("[renewMensuality - ERR]:");
          reject(err);
        });
    } catch (err) {
      console.log("[renewMensuality - ERR]:");
      reject(err);
    }
  });
};

