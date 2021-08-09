const admin = require("firebase-admin");
const SNS = require("aws-sdk/clients/sns");
const moment = require("moment-timezone");
// moment().tz("America/Bogota").format();

const hqCrud = require("./crud");
const recipManager = require("../payment/recips");
const pay = require("../payment/pay");
const mensualityCrud = require("../users/mensualityCrud");
const blCrud = require("./blackList");
const stripeController = require("../payment/stripeController");
const coupons = require("../promotions/coupons");

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
      TargetArn: "arn:aws:sns:us-east-1:827728759512:ElasticBeanstalkNotifications-Environment-zonap"
    },
  },
  function (error) {
    if (error) {
      console.log(error);
    }
  }
);

module.exports.startParking = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Startted parking process for plate: ", parameter.plate);
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.hqId) {
        reject({ response: -1, message: `Missing data: hqId` });
        return;
      }
      if (!parameter.phone) {
        reject({ response: -1, message: `Missing data: phone` });
        return;
      }
      if (!parameter.plate) {
        reject({ response: -1, message: `Missing data: plate` });
        return;
      }
      if (!parameter.type) {
        reject({ response: -1, message: `Missing data: type` });
        return;
      }
      if (!parameter.officialEmail) {
        reject({ response: -1, message: `Missing data: officialEmail` });
        return;
      }
      hqCrud
        .readHq({ id: parameter.hqId })
        .then(async (resultHq) => {
          try {
            if (parameter.type === "car" && resultHq.data.availableCars === 0) {
              reject({ response: -3, message: `No more available car parks` });
              return;
            }
            if (
              parameter.type === "bike" &&
              resultHq.data.availableBikes === 0
            ) {
              reject({ response: -4, message: `No more available bike parks` });
              return;
            }
            try {
              let mensuality = await checkMensuality(parameter);
              console.log("mensuality response:");
              console.log(mensuality);
              if (mensuality.response && mensuality.response === 1) {
                parameter.mensuality = true;
                parameter.mensualityId = mensuality.data.mensualityId;
              }
            } catch (err) {
              console.log("[startParking - readUser/checkMensuality ]", err);
            }
            const db = admin.firestore();
            let hqRef = db.collection("headquarters").doc(parameter.hqId);
            let reservation;
            let prepayFullDayFlag = false;
            if (resultHq.data.reservations.length > 0) {
              reservation = resultHq.data.reservations.find(
                (reserve) => reserve.plate === parameter.plate
              );
              if (reservation) {
                if (reservation.prepayFullDay) {
                  // if (reserve.availableExits > 0) {
                  if (parameter.phone !== reservation.phone) {
                    reservation.phone = parameter.phone;
                    let filtered = resultHq.data.reservations.filter(
                      (reserve) => {
                        return reserve.plate !== parameter.plate;
                      }
                    );
                    filtered.push(reservation);
                    await hqRef.update({ reservations: filtered });
                  }
                  resolve({
                    response: 2,
                    message: `The plate ${parameter.plate} started parking`,
                  });
                  return;
                } else {
                  if (parameter.prepayFullDay) {
                    prepayFullDayFlag = true;
                    reservation.prepayFullDay = true;
                    await this.prepayFullDay(parameter, reservation)
                      .then(async (result) => {
                        let filtered = resultHq.data.reservations.filter(
                          (reserve) => {
                            return reserve.plate !== parameter.plate;
                          }
                        );
                        filtered.push(reservation);
                        await hqRef.update({ reservations: filtered });
                        resolve(result);
                        return;
                      })
                      .catch((err) => {
                        console.log(err);
                        reject(err);
                        return;
                      });
                  } else {
                    reject({
                      response: -2,
                      message: `The plate ${parameter.plate} is already parked`,
                    });
                    return;
                  }
                }
              }
              if (parameter.isParanoic) {
                let reservationPhone = resultHq.data.reservations.find(
                  (reserve) => reserve.phone === parameter.phone
                );
                if (reservationPhone) {
                  reject({
                    response: -2,
                    message: `This QR is already assigned`,
                  });
                  return;
                }
              }
            }
            if (!prepayFullDayFlag) {
              let dateStart = moment().tz("America/Bogota");
              parameter.dateStart = admin.firestore.Timestamp.fromDate(
                dateStart.toDate()
              );
              if (
                resultHq.data.prepaySave &&
                resultHq.data.prepaySave.length &&
                resultHq.data.prepaySave.length > 0
              ) {
                let saved = resultHq.data.prepaySave.find(
                  (reserve) => reserve.plate === parameter.plate
                );
                if (saved) {
                  let filtered = resultHq.data.prepaySave.filter((reserve) => {
                    return reserve.plate !== parameter.plate;
                  });
                  saved.phone = parameter.phone;
                  saved.dateStart = new Date();
                  let update = {
                    prepaySave: filtered,
                    reservations: admin.firestore.FieldValue.arrayUnion(saved),
                  };
                  if (parameter.type === "car")
                    update.availableCars =
                      admin.firestore.FieldValue.increment(-1);
                  else
                    update.availableBikes =
                      admin.firestore.FieldValue.increment(-1);
                  await hqRef.update(update);
                  resolve({
                    response: 2,
                    message: `The plate ${parameter.plate} started parking again (prepaid day)`,
                  });
                  return;
                }
              }
              const code = Number(
                String(Math.floor(Math.random() * new Date().getTime())).substr(
                  0,
                  5
                )
              );
              parameter.verificationCode = code;
              if (parameter.prepayFullDay && !reservation) {
                await this.prepayFullDay(parameter)
                  .then((result) => {
                    resolve(result);
                    return;
                  })
                  .catch((err) => {
                    console.log(err);
                    reject(err);
                    return;
                  });
              } else {
                let data = {
                  reservations:
                    admin.firestore.FieldValue.arrayUnion(parameter),
                };
                if (parameter.type === "car")
                  data.availableCars = admin.firestore.FieldValue.increment(-1);
                else
                  data.availableBikes =
                    admin.firestore.FieldValue.increment(-1);
                await hqRef.update(data);
                if (!parameter.isParanoic) {
                  const params = {
                    Message: `Bienvenido a Zona P tu código es (${code}) hora: ${
                      dateStart.hours() - 12 > 0
                        ? dateStart.hours() - 12
                        : dateStart.hours()
                    }:${
                      dateStart.minutes() < 10
                        ? "0" + dateStart.minutes()
                        : dateStart.minutes()
                    } ${dateStart.hours() - 12 > 0 ? "PM" : "AM"} placa: ${
                      parameter.plate
                    }. Tus datos serán  tratados según esta política https://bit.ly/3rQeKDM`,
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
                    resolve({
                      response: 1,
                      message: `The user ${parameter.plate} started succesfully the parking time`,
                    });
                    return;
                  });
                } else {
                  const db = admin.firestore();
                  let paranoicRef = db
                    .collection("paranoics")
                    .doc(parameter.phone);
                  await paranoicRef.update({ plate: parameter.plate });
                  resolve({
                    response: 1,
                    message: `The user ${parameter.plate} started succesfully the parking time`,
                  });
                  return;
                }
              }
            }
          } catch (err) {
            console.log(err);
            reject({ response: 0, err: JSON.stringify(err, 2) });
          }
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    } catch (err) {
      console.log(err);
      reject({ response: 0, err: JSON.stringify(err, 2) });
    }
  });
};

const checkMensuality = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = admin.firestore();
      mensualityCrud
        .findMensualityPlate({ plate: parameter.plate })
        .then((searchMensuality) => {
          console.log("CHECKMENSUALITY FOR: ", parameter.plate);
          if (searchMensuality.response === 1) {
            console.log(searchMensuality);
            let mensualityHq = searchMensuality.data.find(
              (mensuality) =>
                mensuality.hqId === parameter.hqId &&
                mensuality.status === "active"
            );
            console.log(mensualityHq);
            if (Array.isArray(mensualityHq)) mensualityHq = mensualityHq[0];
            if (
              mensualityHq &&
              mensualityHq.parkedPlatesList &&
              mensualityHq.capacity > mensualityHq.parkedPlatesList.length
            ) {
              console.log("[checkMensuality]:");
              console.log(mensualityHq);
              if (!mensualityHq.parkedPlatesList.includes(parameter.plate)) {
                mensualityHq.parkedPlatesList.push(parameter.plate);
                db.collection("mensualities")
                  .doc(mensualityHq.id)
                  .update({
                    parkedPlatesList: mensualityHq.parkedPlatesList,
                  })
                  .then((result) => {
                    resolve({
                      response: 1,
                      message: `Mensuality found and add 1 from it's capacity`,
                      data: { mensuality: true, mensualityId: mensualityHq.id },
                    });
                    return;
                  })
                  .catch((err) => {
                    console.log(
                      "[checkMensuality]:-------------START------------"
                    );
                    console.log(err);
                    console.log(
                      "[checkMensuality]:-------------END------------"
                    );
                  });
              } else {
                reject({
                  response: -3,
                  message: `The plate ${parameter.plate} is already parked`,
                });
                return;
              }
            } else {
              resolve({
                response: 2,
                message: `User doesn't have mensulity or mensuality doesn't have more capacity`,
              });
              return;
            }
          } else {
            resolve({ response: 2, message: `User doesn't have mensulity` });
            return;
          }
        })
        .catch((err) => {
          console.log("[checkMensuality]:-------------START------------");
          console.log(err);
          console.log("[checkMensuality]:-------------END------------");
          if (err.response && err.response === -1)
            resolve({ response: 2, message: `User doesn't have mensulity` });
          else reject({ response: 0, err });
        });
    } catch (err) {
      console.log(err);
      if (err.response && err.response === -1)
        resolve({ response: 2, message: `User doesn't have mensulity` });
      else reject({ response: 0, err });
    }
  });
};

module.exports.checkParking = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("checkParking called");
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.hqId) {
        reject({ response: -1, message: `Missing data: hqId` });
        return;
      }
      if (!parameter.phone) {
        reject({ response: -1, message: `Missing data: phone` });
        return;
      }
      // if (!parameter.plate) { reject({ response: -1, message: `Missing data: plate` }); return }
      if (!parameter.officialEmail) {
        reject({ response: -1, message: `Missing data: officialEmail` });
        return;
      }
      const db = admin.firestore();
      let hqRef = db.collection("headquarters").doc(parameter.hqId);
      hqRef
        .get()
        .then(async (doc) => {
          try {
            if (!doc.exists) {
              console.log("Hq not found");
              reject({ response: -1, err: "Hq not found!" });
              return;
            }
            let reservations = doc.data().reservations;
            if (reservations.length === 0) {
              reject({
                response: -2,
                message: `The HQ doesn't have any user parked`,
              });
              return;
            }
            let currentReserve;
            if (parameter.plate)
              currentReserve = reservations.find(
                (reserve) => reserve.plate === parameter.plate
              );
            else if (parameter.verificationCode)
              currentReserve = reservations.find(
                (reserve) =>
                  reserve.verificationCode === parameter.verificationCode
              );
            if (currentReserve) {
              if (currentReserve.prepayFullDay) {
                currentReserve.total = 0;
                currentReserve.hours = 24;
                currentReserve.dateStart = currentReserve.dateStart.toDate();
                currentReserve.officialStart = currentReserve.officialEmail;
                currentReserve.officialEmail = parameter.officialEmail;
                resolve({ response: 1, data: currentReserve });
                return;
              }
              currentReserve.status = "finished";
              let dateFinished = moment().tz("America/Bogota");
              let dateStart = moment(currentReserve.dateStart.toDate()).tz(
                "America/Bogota"
              );
              let diff = moment.duration(dateFinished.diff(dateStart));
              let hours = diff.asHours();
              let minutes = diff.asMinutes();
              let days = diff.asDays();
              coupons
                .getUserCoupons({
                  phone: parameter.phone,
                  promotionType: "discount",
                })
                .then((coupons) => {
                  let coupon;
                  if (coupons.response === 1) {
                    coupon = coupons.coupons.find(
                      (coupon) =>
                        coupon.hqId === parameter.hqId && coupon.isValid
                    );
                  }
                  let total = 0;
                  let fraction = 0;
                  let dayDisc = 0;
                  if (!currentReserve.mensuality) {
                    if (days >= 1) {
                      if (currentReserve.type === "car") {
                        if (coupon && coupon.value.car.day) {
                          dayDisc +=
                            doc.data().dailyCarPrice * Math.floor(days);
                        } else
                          total += doc.data().dailyCarPrice * Math.floor(days);
                      }
                      if (currentReserve.type === "bike") {
                        if (coupon && coupon.value.bike.day) {
                          dayDisc +=
                            doc.data().dailyBikePrice * Math.floor(days);
                        } else
                          total += doc.data().dailyBikePrice * Math.floor(days);
                      }
                      let residualHours = hours - 24 * Math.floor(days);
                      if (
                        (residualHours >= 5 && residualHours <= 24) ||
                        (Math.floor(residualHours) === 4 && diff.minutes() > 31)
                      ) {
                        if (currentReserve.type === "car") {
                          if (coupon && coupon.value.car.day) {
                            dayDisc +=
                              doc.data().dailyCarPrice * Math.floor(days);
                          } else
                            total +=
                              doc.data().dailyCarPrice * Math.floor(days);
                        }
                        if (currentReserve.type === "bike") {
                          if (coupon && coupon.value.bike.day) {
                            dayDisc +=
                              doc.data().dailyBikePrice * Math.floor(days);
                          } else
                            total +=
                              doc.data().dailyBikePrice * Math.floor(days);
                        }
                      } else if (residualHours >= 1 && residualHours < 5) {
                        if (currentReserve.type === "car")
                          total +=
                            Math.floor(residualHours) * doc.data().hourCarPrice;
                        if (currentReserve.type === "bike")
                          total +=
                            Math.floor(residualHours) *
                            doc.data().hourBikePrice;
                        if (
                          diff.minutes() > 5 &&
                          diff.minutes() <= 30 &&
                          residualHours < 1
                        ) {
                          if (currentReserve.type === "car") {
                            if (coupon && coupon.value.car.fraction) {
                              fraction += doc.data().fractionCarPrice;
                            } else total += doc.data().fractionCarPrice;
                          }
                          if (currentReserve.type === "bike") {
                            if (coupon && coupon.value.bike.fraction) {
                              fraction += doc.data().fractionBikePrice;
                            } else total += doc.data().fractionBikePrice;
                          }
                        } else if (diff.minutes() > 31) {
                          if (currentReserve.type === "car")
                            total += doc.data().hourCarPrice;
                          if (currentReserve.type === "bike")
                            total += doc.data().hourBikePrice;
                        }
                      } else {
                        if (minutes <= 5 && minutes >= 0 && hours < 1) {
                          total += 0;
                        } else if (minutes > 5 && minutes <= 30 && hours < 1) {
                          if (currentReserve.type === "car") {
                            if (coupon && coupon.value.car.fraction) {
                              fraction += doc.data().fractionCarPrice;
                            } else total += doc.data().fractionCarPrice;
                          }
                          if (currentReserve.type === "bike") {
                            if (coupon && coupon.value.bike.fraction) {
                              fraction += doc.data().fractionBikePrice;
                            } else total += doc.data().fractionBikePrice;
                          }
                        } else {
                          if (currentReserve.type === "car")
                            total += doc.data().hourCarPrice;
                          if (currentReserve.type === "bike")
                            total += doc.data().hourBikePrice;
                        }
                      }
                    } else {
                      if (
                        (hours >= 5 && hours <= 24) ||
                        (Math.floor(hours) === 4 && diff.minutes() > 31)
                      ) {
                        if (currentReserve.type === "car") {
                          if (coupon && coupon.value.car.day) {
                            dayDisc +=
                              doc.data().dailyCarPrice;
                          } else
                            total +=
                              doc.data().dailyCarPrice;
                        }
                        if (currentReserve.type === "bike") {
                          if (coupon && coupon.value.bike.day) {
                            dayDisc +=
                              doc.data().dailyBikePrice;
                          } else
                            total +=
                              doc.data().dailyBikePrice;
                        }
                      } else if (hours >= 1 && hours < 5) {
                        if (currentReserve.type === "car")
                          total = doc.data().hourCarPrice * Math.floor(hours);
                        if (currentReserve.type === "bike")
                          total = doc.data().hourBikePrice * Math.floor(hours);
                        if (diff.minutes() >= 0 && diff.minutes() <= 30) {
                          if (currentReserve.type === "car") {
                            if (coupon && coupon.value.car.fraction) {
                              fraction += doc.data().fractionCarPrice;
                            } else total += doc.data().fractionCarPrice;
                          }
                          if (currentReserve.type === "bike") {
                            if (coupon && coupon.value.bike.fraction) {
                              fraction += doc.data().fractionBikePrice;
                            } else total += doc.data().fractionBikePrice;
                          }
                        } else if (diff.minutes() > 31) {
                          if (currentReserve.type === "car")
                            total += doc.data().hourCarPrice;
                          if (currentReserve.type === "bike")
                            total += doc.data().hourBikePrice;
                        }
                      } else {
                        if (minutes <= 5 && minutes >= 0 && hours < 1) {
                          total = 0;
                        } else if (minutes > 5 && minutes <= 30 && hours < 1) {
                          if (currentReserve.type === "car") {
                            if (coupon && coupon.value.car.fraction) {
                              fraction += doc.data().fractionCarPrice;
                            } else total += doc.data().fractionCarPrice;
                          }
                          if (currentReserve.type === "bike") {
                            if (coupon && coupon.value.bike.fraction) {
                              fraction += doc.data().fractionBikePrice;
                            } else total += doc.data().fractionBikePrice;
                          }
                        } else {
                          if (currentReserve.type === "car")
                            total = doc.data().hourCarPrice;
                          if (currentReserve.type === "bike")
                            total = doc.data().hourBikePrice;
                        }
                      }
                    }
                    if (coupon) {
                      if (currentReserve.type === "car") {
                        if (fraction > 0) {
                          fraction =
                            fraction -
                            Math.round(
                              (fraction *
                                parseFloat(coupon.value.car.fraction)) /
                                100.0
                            );
                        }
                        if (dayDisc > 0)
                          dayDisc =
                            dayDisc -
                            Math.round(
                              (dayDisc * parseFloat(coupon.value.car.day)) /
                                100.0
                            );
                        currentReserve.total =
                          total -
                          Math.ceil(
                            (total * parseFloat(coupon.value.car.hours)) / 100.0
                          ) +
                          fraction +
                          dayDisc;
                      } else {
                        if (fraction > 0)
                          fraction =
                            fraction -
                            Math.round(
                              (fraction *
                                parseFloat(coupon.value.bike.fraction)) /
                                100.0
                            );
                        if (dayDisc > 0)
                          dayDisc =
                            dayDisc -
                            Math.round(
                              (dayDisc * parseFloat(coupon.value.bike.day)) /
                                100.0
                            );
                        currentReserve.total =
                          total -
                          Math.ceil(
                            (total * parseFloat(coupon.value.bike.hours)) /
                              100.0
                          ) +
                          fraction +
                          dayDisc;
                      }
                      let strTotal = String(currentReserve.total);
                      if (strTotal[strTotal.length - 1] === "9") {
                        currentReserve.total += 1;
                      } else {
                        strTotal = strTotal.slice(0, -1) + "0";
                        currentReserve.total = Number(strTotal);
                      }
                    } else currentReserve.total = total;
                  } else currentReserve.total = 0;
                  currentReserve.hours = hours;
                  currentReserve.officialEmail = parameter.officialEmail;
                  currentReserve.dateStart = currentReserve.dateStart.toDate();
                  blCrud
                    .readBlackList({
                      hqId: parameter.hqId,
                      plate: currentReserve.plate,
                    })
                    .then((result) => {
                      try {
                        if (result.response === 1) {
                          currentReserve.pendingValue = result.data.value;
                          currentReserve.valuePark = total;
                          currentReserve.total += result.data.value;
                          resolve({
                            response: 1,
                            message: `Parking data calculated`,
                            data: currentReserve,
                            recipIds: result.data.recipIds,
                          });
                        } else {
                          resolve({
                            response: 1,
                            message: `Parking data calculated`,
                            data: currentReserve,
                          });
                        }
                      } catch (err) {
                        console.log(err);
                        reject(err);
                      }
                    })
                    .catch((err) => {
                      if (err.response === -2)
                        resolve({
                          response: 1,
                          message: `Parking data calculated`,
                          data: currentReserve,
                        });
                      else reject(err);
                    });
                })
                .catch((err) => {
                  console.log(err);
                  reject(err);
                });
            } else {
              if (parameter.verificationCode) {
                reject({
                  response: -3,
                  message: `ALERT: The verification code you sent doesn't match with the one generated for the parking!`,
                });
                return;
              }
              reject({ response: -2, message: "Reservation not found" });
              return;
            }
          } catch (err) {
            console.log(err);
            reject(err);
          }
        })
        .catch((err) => {
          console.log(err);
          reject({ response: 0, err });
          return;
        });
    } catch (err) {
      console.log(err);
      reject({ response: 0, err: JSON.stringify(err, 2) });
      return;
    }
  });
};

module.exports.finishParking = (parameter) => {
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
      if (!parameter.payOnlyDebts) {
        if (!parameter.phone) {
          reject({ response: -1, message: `Missing data: phone` });
          return;
        }
        if (!parameter.paymentType) {
          reject({ response: -1, message: `Missing data: paymentType` });
          return;
        }
        if (parameter.paymentType === "cash") {
          if (
            !["payed", "parcial-pending", "pending"].includes(parameter.status)
          ) {
            reject({ response: -1, message: `Bad data: status` });
            return;
          }
          if (
            (!parameter.cash && Number(parameter.cash) !== Number(0)) ||
            parameter.cash === null
          ) {
            reject({ response: -1, message: `Missing data: cash` });
            return;
          }
          if (
            (!parameter.total && Number(parameter.total) !== Number(0)) ||
            parameter.total === null
          ) {
            reject({ response: -1, message: `Missing data: total` });
            return;
          }
          if (
            (!parameter.change && Number(parameter.change) !== Number(0)) ||
            parameter.change === null
          ) {
            reject({ response: -1, message: `Missing data: change` });
            return;
          }
          if (
            (parameter.status === "parcial-pending" ||
              parameter.status === "pending") &&
            parameter.change > 0
          ) {
            reject({
              response: -2,
              message: `You can't have a possitive change if the user parcially paid or didn't paid`,
            });
            return;
          }
          if (parameter.change < 0 && parameter.status === "payed") {
            reject({
              response: -3,
              message: `You can't have a negative change if the user paid or didn't paid`,
            });
            return;
          }
          if (parameter.cash < 0) {
            reject({
              response: -4,
              message: `Cash can't be a negative number`,
            });
            return;
          }
        }
      }
      parameter.dateFinished = moment().tz("America/Bogota").toDate();
      const db = admin.firestore();
      let hqRef = db.collection("headquarters").doc(parameter.hqId);
      hqRef
        .get()
        .then((doc) => {
          try {
            if (!doc.exists) {
              console.log("Hq not found");
              reject({ response: -1, err: "Hq not found!" });
              return;
            }
            this.checkParking(parameter)
              .then(async (resultPark) => {
                try {
                  let currentReserve = resultPark.data;
                  currentReserve.total = parameter.total;
                  currentReserve.creditCardPay = false;
                  let docData = doc.data();
                  currentReserve.dateFinished =
                    admin.firestore.Timestamp.fromDate(parameter.dateFinished);
                  if (
                    currentReserve.prepayFullDay ||
                    currentReserve.total === 0 ||
                    currentReserve.mensualityId ||
                    parameter.status === "pending" ||
                    parameter.status === "partial-pending"
                  ) {
                    await finishPay(
                      parameter,
                      currentReserve,
                      docData,
                      (recipData = ""),
                      hqRef
                    )
                      .then((result) => {
                        resolve(result);
                        return;
                      })
                      .catch((err) => {
                        console.log(err);
                        reject(err);
                        return;
                      });
                  } else {
                    if (parameter.paymentType === "cash") {
                      currentReserve.change = parameter.change;
                      currentReserve.cash = parameter.cash;
                    }
                    currentReserve.paymentType = parameter.paymentType;
                    recipManager
                      .createRecip(currentReserve)
                      .then((resultRecip) => {
                        try {
                          recipManager
                            .readRecip({ recipId: resultRecip.id })
                            .then((recipCreated) => {
                              try {
                                let recipData = recipCreated.data;
                                parameter.recipId = resultRecip.id;
                                if (
                                  currentReserve.pendingValue &&
                                  parameter.cash > currentReserve.total
                                ) {
                                  blCrud
                                    .payDebts({
                                      hqId: parameter.hqId,
                                      plate: parameter.plate,
                                      value: currentReserve.pendingValue,
                                    })
                                    .then((res) => {
                                      finishPay(
                                        parameter,
                                        currentReserve,
                                        docData,
                                        recipData,
                                        hqRef
                                      )
                                        .then((resultPay) => {
                                          resolve(resultPay);
                                          return;
                                        })
                                        .catch((err) => {
                                          console.log(err);
                                          reject(err);
                                          return;
                                        });
                                    })
                                    .catch((err) => {
                                      console.log("line 472");
                                      console.log(err);
                                      reject(err);
                                    });
                                } else {
                                  finishPay(
                                    parameter,
                                    currentReserve,
                                    docData,
                                    recipData,
                                    hqRef
                                  )
                                    .then((result) => {
                                      resolve(result);
                                      return;
                                    })
                                    .catch((err) => {
                                      console.log(err);
                                      reject(err);
                                      return;
                                    });
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
                  }
                  if (currentReserve.isParanoic) {
                    let paranoicRef = await db.collection("paranoics").doc(parameter.phone)
                    await paranoicRef.update({plate: null})
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
          console.log("Error getting documents", err);
          reject({ response: 0, err });
          return;
        });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

const finishPay = (parameter, currentReserve, docData, recipData, hqRef) => {
  return new Promise((resolve, reject) => {
    try {
      parameter.prepayFullDay = currentReserve.prepayFullDay;
      parameter.total = currentReserve.total;
      parameter.mensualityId = currentReserve.mensualityId;
      parameter.mensuality = currentReserve.mensuality;
      const db = admin.firestore();
      pay
        .pay(parameter)
        .then(async (result) => {
          try {
            if (docData.reservations.length === 0) {
              reject({
                response: -2,
                message: `The HQ doesn't have any user parked`,
              });
              return;
            }
            if (currentReserve.mensualityId || currentReserve.mensuality) {
              await new Promise(async (resolve, reject) => {
                console.log(
                  "inside the conditional, resting 1 to parkedPlates"
                );
                let parkedPlatesResponse = await db
                  .collection("mensualities")
                  .doc(currentReserve.mensualityId)
                  .update({
                    parkedPlatesList: admin.firestore.FieldValue.arrayRemove(
                      parameter.plate
                    ),
                  });
                console.log("rested");
                let mensualityUsersParksResponse = await db
                  .collection("mensualityUsersParks")
                  .add(currentReserve);
                console.log("end");
                console.log(mensualityUsersParksResponse);
                if (!parkedPlatesResponse) {
                  console.log("parked plates failed");
                  parkedPlatesResponse = await db
                    .collection("mensualities")
                    .doc(currentReserve.mensualityId)
                    .update({
                      parkedPlatesList: admin.firestore.FieldValue.arrayRemove(
                        parameter.plate
                      ),
                    });
                  resolve("done");
                }
                if (!mensualityUsersParksResponse) {
                  console.log("mensualityUsersParks failed");
                  mensualityUsersParksResponse = await db
                    .collection("mensualityUsersParks")
                    .add(currentReserve);
                  resolve("done");
                }
                resolve("done");
              });
            }
            let filteredReservations = docData.reservations.filter(
              (reserve) => {
                return reserve.plate !== parameter.plate;
              }
            );
            let data = {
              reservations: filteredReservations,
            };
            if (currentReserve.prepayFullDay) {
              let reserve = docData.reservations.find(
                (reserve) => reserve.plate === parameter.plate
              );
              data.prepaySave = admin.firestore.FieldValue.arrayUnion(reserve);
            }
            if (
              currentReserve.type === "car" &&
              docData.availableCars + 1 <= docData.totalCars
            )
              data.availableCars = admin.firestore.FieldValue.increment(1);
            else if (
              currentReserve.type === "bike" &&
              docData.availableBikes + 1 <= docData.totalBikes
            )
              data.availableBikes = admin.firestore.FieldValue.increment(1);
            await hqRef.update(data);
            console.log("[finishParking]: currentReserve:");
            console.log(currentReserve);

            if (!currentReserve.isParanoic && !currentReserve.prepayFullDay) {
              let params = {};
              if (currentReserve.mensualityId || currentReserve.total === 0) {
                let dateStart = moment(parameter.dateFinished).tz(
                  "America/Bogota"
                );
                params = {
                  Message: `Saliste del parqueadero de Zona P a las ${
                    dateStart.hours() - 12 > 0
                      ? dateStart.hours() - 12
                      : dateStart.hours()
                  }:${
                    dateStart.minutes().toString() < 10
                      ? "0" + dateStart.minutes()
                      : dateStart.minutes()
                  } ${dateStart.hours() - 12 > 0 ? "PM" : "AM"}`,
                  PhoneNumber: parameter.phone,
                  MessageAttributes: {
                    "AWS.SNS.SMS.SMSType": {
                      DataType: "String",
                      StringValue: "Transactional",
                    },
                  },
                };
              } else if (parameter.status !== "pending")
                params = {
                  Message: `Tu pago ha sido registrado exitosamente. Recibo: https://tinyurl.com/bur82ydc/?rid=${
                    parameter.recipId
                  }  ${"\n"}`,
                  PhoneNumber: parameter.phone,
                  MessageAttributes: {
                    "AWS.SNS.SMS.SMSType": {
                      DataType: "String",
                      StringValue: "Transactional",
                    },
                  },
                };
              else if (parameter.status === "pending") {
                params = {
                  Message: `¡Hola tu saldo pendiente es: $${
                    currentReserve.change * -1
                  } `,
                  PhoneNumber: parameter.phone,
                  MessageAttributes: {
                    "AWS.SNS.SMS.SMSType": {
                      DataType: "String",
                      StringValue: "Transactional",
                    },
                  },
                };
              }
              sns.publish(params, (err, data) => {
                try {
                  if (err) {
                    console.log("publish[ERR] ", err, err.stack);
                    return reject(err);
                  }
                  console.log("publish[data] ", data);
                  console.log(recipData);
                  if (typeof recipData === "object") {
                    if (
                      recipData &&
                      recipData.dateStart &&
                      recipData.dateStart.nanoseconds
                    )
                      recipData.dateStart = recipData.dateStart.toDate();
                    else recipData.dateStart = recipData.dateStart;
                    if (
                      recipData &&
                      recipData.dateFinished &&
                      recipData.dateFinished.nanoseconds
                    )
                      recipData.dateFinished = recipData.dateFinished.toDate();
                    else recipData.dateFinished = recipData.dateFinished;
                  }
                  resolve({
                    response: 1,
                    message: `Parking marked as finished`,
                    data: recipData,
                  });
                } catch (err) {
                  console.log(err);
                  reject(err);
                }
              });
            } else if (parameter.prepayFullDay) {
              resolve({
                response: 1,
                message: `Parking marked as finished`,
                data: currentReserve,
              });
            } else {
              if (typeof recipData === "object") {
                console.log(recipData);
                if (
                  recipData &&
                  recipData.dateStart &&
                  recipData.dateStart.nanoseconds
                )
                  recipData.dateStart = recipData.dateStart.toDate();
                else recipData.dateStart = recipData.dateStart;
                if (
                  recipData &&
                  recipData.dateFinished &&
                  recipData.dateFinished.nanoseconds
                )
                  recipData.dateFinished = recipData.dateFinished.toDate();
                else recipData.dateFinished = recipData.dateFinished;
              }
              resolve({
                response: 1,
                message: `Parking marked as finished`,
                data: recipData,
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

module.exports.prepayFullDay = (parameter, reservation) => {
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
      if (!parameter.dateStart) {
        reject({ response: -1, message: `Missing data: dateStart` });
        return;
      }
      if (!parameter.phone) {
        reject({ response: -1, message: `Missing data: phone` });
        return;
      }
      if (!parameter.plate) {
        reject({ response: -1, message: `Missing data: plate` });
        return;
      }
      if (!parameter.type) {
        reject({ response: -1, message: `Missing data: type` });
        return;
      }
      if (!("cash" in parameter)) {
        reject({ response: -1, message: `Missing data: cash` });
      }
      if (!("change" in parameter)) {
        reject({ response: -1, message: `Missing data: change` });
      }

      hqCrud
        .readHq({ id: parameter.hqId })
        .then(async (resultHq) => {
          let code = 0;
          let dateStart;
          let currentReserve = {};
          let dateFinished = "";
          coupons
            .getUserCoupons({
              phone: parameter.phone,
              promotionType: "discount",
            })
            .then(async (coupons) => {
              let coupon;
              if (coupons.response === 1) {
                coupon = coupons.coupons.find(
                  (coupon) => coupon.hqId === parameter.hqId && coupon.isValid
                );
              }
              console.log(coupon);
              let total =
                parameter.type === "car"
                  ? resultHq.data.dailyCarPrice
                  : resultHq.data.dailyBikePrice;
              if (coupon) {
                if (parameter.type === "car") {
                  total = Math.round(
                    total - total * (parseFloat(coupon.value.car.day) / 100.0)
                  );
                } else {
                  total = Math.round(
                    total - total * (parseFloat(coupon.value.bike.day) / 100.0)
                  );
                }
              }
              console.log(total);
              if (reservation && reservation.plate) {
                code = reservation.verificationCode;
                dateStart = reservation.dateStart;
                currentReserve = {
                  hqId: parameter.hqId,
                  plate: reservation.plate,
                  phone: reservation.phone,
                  type: reservation.type,
                  dateStart: reservation.dateStart,
                  dateFactured: moment().tz("Amareica/Bogota").toDate(),
                  verificationCode: code,
                  status: "read",
                  total: total,
                  hours: 24,
                  officialEmail: parameter.officialEmail,
                  prepayFullDay: true,
                  cash: parameter.cash,
                  change: parameter.change,
                };
                if (typeof reservation.dateStart === "string")
                  dateFinished = moment(new Date(reservation.dateStart)).add(
                    1,
                    "day"
                  );
                else if (reservation.dateStart.nanoseconds)
                  moment(reservation.dateStart.toDate()).add(1, "day");
                else dateFinished = moment(reservation.dateStart).add(1, "day");
              } else {
                code = Number(
                  String(
                    Math.floor(Math.random() * new Date().getTime())
                  ).substr(0, 5)
                );
                const db = admin.firestore();
                let hqRef = db.collection("headquarters").doc(parameter.hqId);
                dateStart = parameter.dateStart.toDate();
                let data = {
                  reservations:
                    admin.firestore.FieldValue.arrayUnion(parameter),
                };
                dateFinished = moment(new Date(dateStart)).add(1, "day");
                if (parameter.type === "car")
                  data.availableCars = admin.firestore.FieldValue.increment(-1);
                else
                  data.availableBikes =
                    admin.firestore.FieldValue.increment(-1);
                await hqRef.update(data);
                currentReserve = {
                  hqId: parameter.hqId,
                  plate: parameter.plate,
                  phone: parameter.phone,
                  type: parameter.type,
                  dateStart: parameter.dateStart,
                  dateFactured: moment().tz("Amareica/Bogota").toDate(),
                  verificationCode: code,
                  status: "read",
                  total: total,
                  hours: 24,
                  officialEmail: parameter.officialEmail,
                  prepayFullDay: true,
                  cash: parameter.cash,
                  change: parameter.change,
                };
              }
              currentReserve.dateFinished = dateFinished;
              recipManager
                .createRecip(currentReserve)
                .then((resultRecip) => {
                  recipManager
                    .readRecip({ recipId: resultRecip.id })
                    .then(async (recipCreated) => {
                      let data = recipCreated.data;
                      data.dateStart = data.dateStart.nanoseconds
                        ? data.dateStart.toDate()
                        : data.dateStart;
                      data.dateFinished = data.dateFinished.nanoseconds
                        ? data.dateFinished.toDate()
                        : data.dateFinished;
                      if (!parameter.isParanoic) {
                        const params = {
                          Message: `¡Hola! Tu código Zona P es: (${code}). Hora: ${
                            moment(data.dateStart)
                              .tz("America/Bogota")
                              .hours() -
                              12 >
                            0
                              ? moment(data.dateStart)
                                  .tz("America/Bogota")
                                  .hours() - 12
                              : moment(data.dateStart)
                                  .tz("America/Bogota")
                                  .hours()
                          }:${
                            moment(data.dateStart)
                              .tz("America/Bogota")
                              .minutes() < 10
                              ? "0" +
                                moment(data.dateStart)
                                  .tz("America/Bogota")
                                  .minutes()
                              : moment(data.dateStart)
                                  .tz("America/Bogota")
                                  .minutes()
                          } ${
                            moment(data.dateStart)
                              .tz("America/Bogota")
                              .hours() -
                              12 >
                            0
                              ? "PM"
                              : "AM"
                          }. Recibo: https://tinyurl.com/bur82ydc/?rid=${
                            resultRecip.id
                          } Más información: https://bit.ly/3rQeKDM`,
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
                          resolve({
                            response: 1,
                            message: `The user ${parameter.plate} started succesfully the parking time`,
                          });
                        });
                      } else {
                        const db = admin.firestore();
                        let paranoicRef = db
                          .collection("paranoics")
                          .doc(parameter.phone);
                        await paranoicRef.update({ plate: parameter.plate });
                        resolve({
                          response: 1,
                          message: `The user ${parameter.plate} started succesfully the parking time`,
                        });
                      }
                    })
                    .catch((err) => {
                      console.log(err);
                      reject(err);
                    });
                })
                .catch((err) => {
                  console.log(err);
                  reject(err);
                });
            })
            .catch((err) => {
              console.log(err);
              reject(err);
            });
        })
        .catch((err) => {
          console.log(err);
          reject({ response: 0, err });
          return;
        });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

module.exports.qrPay = (parameter) => {
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
      if (!parameter.phone) {
        reject({ response: -1, message: `Missing data: phone` });
        return;
      }
      if (!parameter.total) {
        reject({ response: -1, message: `Missing data: total` });
        return;
      }
      const db = admin.firestore();
      db.collection("headquarters")
        .doc(parameter.hqId)
        .get()
        .then((doc) => {
          if (!doc.exists) {
            reject({
              response: -2,
              message: `There is no HQ with the id provided`,
            });
            return;
          }
          let hqData = doc.data();
          let reservation = hqData.reservations.find(
            (reserve) => reserve.phone === parameter.phone
          );
          if (!reservation) {
            reject({
              response: -3,
              message: `There is no parking found with the provided data`,
            });
            return;
          }
          db.collection("officials")
            .where("status", "==", "active")
            .where("hq", "array-contains", parameter.hqId)
            .get()
            .then((snapshot) => {
              if (snapshot.empty) {
                reject({
                  response: -4,
                  message: `There is no officials on shift`,
                });
                return;
              }
              parameter.officialEmail = snapshot.docs[0].data().email;
              parameter.paymentType = "cc";
              parameter.plate = reservation.plate;
              console.log(parameter);

              stripeController
                .chargeStripeUser({
                  phone: parameter.phone,
                  amount: parameter.total,
                })
                .then((resultPay) => {
                  this.checkParking(parameter)
                    .then((currentReserve) => {
                      let recipData = currentReserve.data;
                      recipData.cash = 0;
                      recipData.change = 0;
                      recipData.phone = parameter.phone;
                      recipData.total = parameter.total;
                      recipData.dateFinished = moment().tz("America/Bogota");
                      recipData.creditCardPay = true
                      recipManager
                        .createRecip(recipData)
                        .then(async (res) => {
                          let filteredReservations = hqData.reservations.filter(
                            (reserve) => reserve.phone !== parameter.phone
                          );
                          console.log(filteredReservations);
                          await new Promise(async (resolve, reject) => {
                            await db
                              .collection("headquarters")
                              .doc(parameter.hqId)
                              .update({ reservations: filteredReservations });
                            resolve("done");
                          });
                          let params = {
                            Message: `Tu pago ha sido registrado exitosamente. Recibo: https://tinyurl.com/bur82ydc/?rid=${parameter.recipId}`,
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
                            resolve(res);
                          });
                        })
                        .catch((err) => {
                          console.log("checkParking");
                          reject(err);
                        });
                    })
                    .catch((err) => console.log(err));
                })
                .catch((err) => reject(err));
            });
        });
    } catch (err) {
      console.log(err);
      reject({ response: -2, err });
    }
  });
};

module.exports.checkUserParkingTotal = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("checkUserParkingTotal called");
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.hqId) {
        reject({ response: -1, message: `Missing data: hqId` });
        return;
      }
      if (!parameter.phone) {
        reject({ response: -1, message: `Missing data: phone` });
        return;
      }
      const db = admin.firestore();
      let hqRef = db.collection("headquarters").doc(parameter.hqId);

      coupons
      .getUserCoupons({phone: parameter.phone})
      .then(result => {
        //console.log('RESULT',result)
        let coupon = result.coupons
        if(result.response === 1){
          coupon = coupon[0]
        }
        // const coupon = 
        //   (result) =>
        //     result.hqId === parameter.hqId &&
        //     result.isValid
        
        //console.log('COUPON',coupon)
        hqRef
        .get()
        .then(async (doc) => {
          try {

            if (!doc.exists) {
              console.log("Hq not found");
              reject({ response: -1, err: "Hq not found!" });
              return;
            }
            let reservations = doc.data().reservations;
            if (reservations.length === 0) {
              reject({
                response: -2,
                message: `The HQ doesn't have any user parked`,
              });
              return;
            }
            let currentReserve;
            if (parameter.phone)
              currentReserve = reservations.find(
                (reserve) => reserve.phone === parameter.phone
              );
            else if (parameter.verificationCode)
              currentReserve = reservations.find(
                (reserve) =>
                  reserve.verificationCode === parameter.verificationCode
              );
            if (currentReserve) {
              if (currentReserve.prepayFullDay) {
                currentReserve.total = 0;
                currentReserve.hours = 24;
                currentReserve.dateStart = currentReserve.dateStart.toDate();
                resolve({ response: 1, data: currentReserve });
                return;
              }
              let dateFinished = moment().tz("America/Bogota");
              let dateStart = moment(currentReserve.dateStart.toDate()).tz(
                "America/Bogota"
              );
              currentReserve.totalTime = moment(dateFinished.diff(dateStart));
              let diff = moment.duration(dateFinished.diff(dateStart));
              let hours = diff.asHours();
              let minutes = diff.asMinutes();
              let days = diff.asDays();
              let total = 0;
              if (!currentReserve.mensuality) {
                if (days >= 1) {
                  if (currentReserve.type === "car"){
                    coupon 
                    ? total = (doc.data().dailyCarPrice - (Math.round(Math.floor(doc.data().dailyCarPrice * parseFloat(coupon.value.car.day) / 100.0)))) * Math.floor(days)
                    : total = doc.data().dailyCarPrice * Math.floor(days)
                  }
                  if (currentReserve.type === "bike"){
                    coupon 
                    ? total = (doc.data().dailyBikePrice - (doc.data().dailyBikePrice * parseFloat(coupon.value.bike.day) / 100.0)) * Math.floor(days)
                    : total = doc.data().dailyBikePrice * Math.floor(days)
                  }
                  let residualHours = hours - 24 * Math.floor(days);
                  if (
                    (residualHours >= 5 && residualHours <= 24) ||
                    (Math.floor(residualHours) === 4 && diff.minutes() > 31)
                  ) {
                    if (currentReserve.type === "car"){
                      coupon
                      ? total += doc.data().dailyCarPrice - (Math.round(Math.floor(doc.data().dailyCarPrice * parseFloat(coupon.value.car.day) / 100.0)))
                      : total += doc.data().dailyCarPrice
                    }
                    if (currentReserve.type === "bike"){
                      coupon
                      ? total += doc.data().dailyBikePrice - (doc.data().dailyBikePrice * parseFloat(coupon.value.bike.day) / 100.0) 
                      : total += doc.data().dailyBikePrice
                    }
                  } else if (residualHours >= 1 && residualHours < 5) {
                    if (currentReserve.type === "car"){
                      coupon
                      ? total += Math.floor(residualHours) * (doc.data().hourCarPrice - (doc.data().hourCarPrice * parseFloat(coupon.value.car.hours) / 100.0))
                      : total += Math.floor(residualHours) * doc.data().hourCarPrice
                    }

                    if (currentReserve.type === "bike"){
                      coupon
                      ? total += Math.floor(residualHours) * (doc.data().hourBikePrice - (doc.data().hourBikePrice * parseFloat(coupon.value.bike.hours) / 100.0))
                      : total += Math.floor(residualHours) * doc.data().hourBikePrice
                    }
                    if (
                      diff.minutes() > 5 &&
                      diff.minutes() <= 30 &&
                      residualHours < 1
                    ) {
                      if (currentReserve.type === "car"){
                        coupon
                        ? total += doc.data().fractionCarPrice - doc.data().fractionCarPrice * parseFloat(coupon.value.car.fraction) / 100.0
                        : total += doc.data().fractionCarPrice 
                      }
                      if (currentReserve.type === "bike"){
                        coupon
                        ? total += doc.data().fractionBikePrice - doc.data().fractionBikePrice * parseFloat(coupon.value.bike.fraction) / 100.0
                        : total += doc.data().fractionBikePrice 
                      }
                    } else if (diff.minutes() > 31) {
                      if (currentReserve.type === "car"){
                        coupon
                        ? total += (doc.data().hourCarPrice - (doc.data().hourCarPrice * parseFloat(coupon.value.car.hours) / 100.0))
                        : total += doc.data().hourCarPrice
                      }
                      if (currentReserve.type === "bike"){
                        coupon
                        ? total += (doc.data().hourBikePrice - (doc.data().hourBikePrice * parseFloat(coupon.value.bike.hours) / 100.0))
                        : total += doc.data().hourBikePrice
                      }
                    }
                  } else {
                    if (minutes <= 5 && minutes >= 0 && hours < 1) {
                      total += 0;
                    } else if (minutes > 5 && minutes <= 30 && hours < 1) {
                      if (currentReserve.type === "car"){
                        coupon
                        ? total += doc.data().fractionCarPrice - doc.data().fractionCarPrice * parseFloat(coupon.value.car.fraction) / 100.0
                        : total += doc.data().fractionCarPrice 
                      }
                      if (currentReserve.type === "bike"){
                        coupon
                        ? total += doc.data().fractionBikePrice - doc.data().fractionBikePrice * parseFloat(coupon.value.bike.fraction) / 100.0
                        : total += doc.data().fractionBikePrice 
                      }
                    } else {
                      if (currentReserve.type === "car"){
                        coupon
                        ? total += (doc.data().hourCarPrice - (doc.data().hourCarPrice * parseFloat(coupon.value.car.hours) / 100.0))
                        : total += doc.data().hourCarPrice
                      }
                      if (currentReserve.type === "bike"){
                        coupon
                        ? total += (doc.data().hourBikePrice - (doc.data().hourBikePrice * parseFloat(coupon.value.bike.hours) / 100.0))
                        : total += doc.data().hourBikePrice
                      }
                    }
                  }
                } else {
                  if (
                    (hours >= 5 && hours <= 24) ||
                    (Math.floor(hours) === 4 && diff.minutes() > 31)
                  ) {
                    if (currentReserve.type === "car"){
                      coupon
                      ? total = Math.ceil(doc.data().dailyCarPrice - (doc.data().dailyCarPrice * parseFloat(coupon.value.car.day)  / 100.0))
                      : total = doc.data().dailyCarPrice
                    }
                    if (currentReserve.type === "bike"){
                      coupon
                      ? total = doc.data().dailyBikePrice - (doc.data().dailyBikePrice * parseFloat(coupon.value.bike.day)  / 100.0)
                      : total = doc.data().dailyBikePrice
                    }
                  } else if (hours >= 1 && hours < 5) {
                    if (currentReserve.type === "car"){
                      coupon
                      ? total = Math.floor(hours) * (doc.data().hourCarPrice - (Math.round(Math.floor(doc.data().hourCarPrice * parseFloat(coupon.value.car.hours) / 10000.0)) * 100))
                      : total = Math.floor(hours) * doc.data().hourCarPrice
                    }
                    if (currentReserve.type === "bike"){
                      coupon
                      ? total = Math.floor(hours) * (doc.data().hourBikePrice - (doc.data().hourBikePrice * parseFloat(coupon.value.bike.hours) / 100.0))
                      : total = Math.floor(hours) * doc.data().hourBikePrice
                    }
                    if (diff.minutes() >= 0 && diff.minutes() <= 30) {
                      if (currentReserve.type === "car"){
                        coupon
                        ? total += doc.data().fractionCarPrice - doc.data().fractionCarPrice * parseFloat(coupon.value.car.fraction) / 100.0
                        : total += doc.data().fractionCarPrice 
                      }
                      if (currentReserve.type === "bike"){
                        coupon
                        ? total += doc.data().fractionBikePrice - doc.data().fractionBikePrice * parseFloat(coupon.value.bike.fraction) / 100.0
                        : total += doc.data().fractionBikePrice 
                      }
                    } else if (diff.minutes() > 31) {
                      if (currentReserve.type === "car"){
                        coupon
                        ? total += (doc.data().hourCarPrice - (Math.round(Math.floor(doc.data().hourCarPrice * parseFloat(coupon.value.car.hours) / 10000.0)).toFixed(2) * 100))
                        : total += doc.data().hourCarPrice
                      }
                      if (currentReserve.type === "bike"){
                        coupon
                        ? total += (doc.data().hourBikePrice - (doc.data().hourBikePrice * parseFloat(coupon.value.bike.hours) / 100.0))
                        : total += doc.data().hourBikePrice
                      }
                    }
                  } else {
                    if (minutes <= 5 && minutes >= 0 && hours < 1) {
                      total = 0;
                    } else if (minutes > 5 && minutes <= 30 && hours < 1) {
                      if (currentReserve.type === "car"){
                        coupon
                        ? total = doc.data().fractionCarPrice - doc.data().fractionCarPrice * parseFloat(coupon.value.car.fraction) / 100.0
                        : total = doc.data().fractionCarPrice 
                      }
                      if (currentReserve.type === "bike"){
                        coupon
                        ? total = doc.data().fractionBikePrice - doc.data().fractionBikePrice * parseFloat(coupon.value.bike.fraction) / 100.0
                        : total = doc.data().fractionBikePrice 
                      }
                    } else {
                      if (currentReserve.type === "car"){
                        coupon
                        ? total = (doc.data().hourCarPrice - (Math.round(Math.floor(doc.data().hourCarPrice * parseFloat(coupon.value.car.hours) / 10000.0)).toFixed(2) * 100))
                        : total = doc.data().hourCarPrice
                      }
                      if (currentReserve.type === "bike"){
                        coupon
                        ? total = (doc.data().hourBikePrice - (doc.data().hourBikePrice * parseFloat(coupon.value.bike.hours) / 100.0))
                        : total = doc.data().hourBikePrice
                      }
                    }
                  }
                }
              }
              currentReserve.total = total;
              currentReserve.hours = hours;
              currentReserve.dateStart = currentReserve.dateStart.toDate();
              blCrud
                .readBlackList({
                  hqId: parameter.hqId,
                  plate: currentReserve.plate,
                })
                .then((result) => {
                  try {
                    if (result.response === 1) {
                      currentReserve.pendingValue = result.data.value;
                      currentReserve.valuePark = total;
                      currentReserve.total += result.data.value;
                      resolve({
                        response: 1,
                        message: `Parking data calculated`,
                        data: currentReserve,
                        recipIds: result.data.recipIds,
                      });
                    } else {
                      resolve({
                        response: 1,
                        message: `Parking data calculated`,
                        data: currentReserve,
                      });
                    }
                  } catch (err) {
                    console.log(err);
                    reject(err);
                  }
                })
                .catch((err) => {
                  if (err.response === -2)
                    resolve({
                      response: 1,
                      message: `Parking data calculated`,
                      data: currentReserve,
                    });
                  else reject(err);
                });
            } else {
              if (parameter.verificationCode) {
                reject({
                  response: -3,
                  message: `ALERT: The verification code you sent doesn't match with the one generated for the parking!`,
                });
                return;
              }
              reject({ response: -2, message: "Reservation not found" });
              return;
            }
          } catch (err) {
            console.log(err);
            reject(err);
          }
        })
        .catch((err) => {
          console.log(err);
          reject({ response: 0, err });
          return;
        });
      })
      .catch((err) => {
        console.log(err);
        reject({ response: 0, err });
        return;
      });
    } catch (err) {
      console.log(err);
      reject({ response: 0, err: JSON.stringify(err, 2) });
      return;
    }
  });
};

// module.exports.migrateParkedList = () => {
//   const db = admin.firestore();
//   db.collection("mensualities")
//   .get()
//   .then(snapshot => {
//     snapshot.forEach(async (doc) => {
//       await db.collection("mensualities").doc(doc.id).update({parkedPlatesList: []})
//     })
//   })
// }
