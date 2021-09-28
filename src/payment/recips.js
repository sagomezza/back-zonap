const admin = require("firebase-admin");
const hqCrud = require("../headquarters/crud");
const officialCrud = require("../official/crud");
const moment = require("moment-timezone");

module.exports.createRecip = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = admin.firestore();
      db.collection("metadata")
        .doc(parameter.hqId)
        .get()
        .then(async (doc) => {
          try {
            if (!doc.exists) {
              console.log("empty");
            }
            let data = doc.data();
            let numberId = data.recipId.numberId + 1;
            let stringId = data.recipId.stringId;
            console.log(stringId, numberId, stringId + numberId);
            console.log("createRecip:");
            console.log(parameter);
            await db
              .collection("recips")
              .doc(stringId + numberId)
              .set(parameter);
            await db
              .collection("metadata")
              .doc(parameter.hqId)
              .update({ recipId: { stringId, numberId } });
            resolve({
              response: 1,
              message: `Recip created succesfully`,
              data: { id: stringId + numberId, ...parameter },
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
    } catch (err) {
      console.log(err);
      reject({ response: 1, err: JSON.stringify(err, 2) });
    }
  });
};

module.exports.getRecips = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.hqId && !parameter.officialEmail) {
        reject({
          response: -1,
          message: `Missing data: hqId or officialEmail`,
        });
      }
      // let date = moment()
      //   .tz("America/Bogota")
      //   .set("hours", 5)
      //   .set("minutes", 0)
      //   .set("seconds", 0)
      //   .set("milliseconds", 0);
      // if (date.hours() < 5) date = date.add(-1, "days");
      const db = admin.firestore();
      let recipRef = db.collection("recips");
      if (parameter.hqId) {
        officialCrud
          .readOfficial({ email: parameter.officialEmail })
          .then(async (officialResult) => {
            try {
              let officialData = officialResult.data;
              if (officialData.start) {
                if (officialData.status !== "active") {
                  reject({
                    response: -3,
                    message: `The official ${parameter.email} isn't in active shift.`,
                  });
                  return;
                }
                let date = moment(new Date(officialData.start._seconds) * 1000)
                  .tz("America/Bogota")
                  .toDate();

                let query = recipRef
                  .where("hqId", "==", parameter.hqId)
                  .where("dateFinished", ">=", date)
                  .orderBy("dateFinished", "desc")
                  .get()
                  .then(async (snapshot) => {
                    try {
                      let recips = [];
                      if (!snapshot.empty) {
                        snapshot.forEach((doc) => {
                          let recipData = doc.data();
                          if (
                            !recipData.mensuality &&
                            !recipData.prepayFullDay
                          ) {
                            recipData.id = doc.id;
                            recips.push(recipData);
                          }
                        });
                      }
                      db.collection("recips")
                        .where("hqId", "==", parameter.hqId)
                        .where("prepayFullDay", "==", true)
                        .where("dateFactured", ">=", date)
                        .orderBy("dateFactured", "desc")
                        .get()
                        .then((snapshot) => {
                          if (!snapshot.empty) {
                            snapshot.forEach((doc) => {
                              let recipData = doc.data();
                              recipData.id = doc.id;
                              recips.push(recipData);
                            });
                          }
                          db.collection("recips")
                            .where("hqId", "==", parameter.hqId)
                            .where("mensuality", "==", true)
                            .where("dateStart", ">=", date)
                            .orderBy("dateStart", "desc")
                            .get()
                            .then((snapshot) => {
                              if (!snapshot.empty) {
                                snapshot.forEach((doc) => {
                                  let recipData = doc.data();
                                  recipData.id = doc.id;
                                  recips.push(recipData);
                                });
                              }
                              if (recips.length === 0) {
                                reject({
                                  response: -1,
                                  message: `Recips not found`,
                                });
                                return;
                              } else {
                                if (parameter.officialEmail) {
                                  let filteredRecips = recips.filter(
                                    (recip) => {
                                      return (
                                        recip.officialEmail ===
                                        parameter.officialEmail
                                      );
                                    }
                                  );
                                  recips = [...filteredRecips];
                                }
                                recips.map((recip) => {
                                  recip.dateStart = recip.dateStart.nanoseconds
                                    ? recip.dateStart.toDate()
                                    : recip.dateStart;
                                  recip.dateFinished = recip.dateFinished
                                    .nanoseconds
                                    ? recip.dateFinished.toDate()
                                    : recip.dateFinished;
                                  if (recip.totalTime)
                                    recip.totalTime = recip.totalTime
                                      .nanoseconds
                                      ? recip.totalTime.toDate()
                                      : recip.totalTime;
                                });
                                recips.sort((a, b) => {
                                  if (
                                    (a.mensuality || a.prepayFullDay) &&
                                    !b.mensuality
                                  ) {
                                    return b.dateFinished - a.dateStart;
                                  } else if (
                                    (b.mensuality || b.prepayFullDay) &&
                                    !a.mensuality
                                  ) {
                                    return b.dateStart - a.dateFinished;
                                  } else if (
                                    (a.mensuality || a.prepayFullDay) &&
                                    (b.mensuality || b.prepayFullDay)
                                  ) {
                                    return b.dateStart - a.dateStart;
                                  } else {
                                    return b.dateFinished - a.dateFinished;
                                  }
                                });
                                if (parameter.limit) {
                                  resolve({
                                    response: 1,
                                    message: `Recips found`,
                                    data: {
                                      total: recips.slice(0, parameter.limit),
                                    },
                                  });
                                } else {
                                  resolve({
                                    response: 1,
                                    message: `Recips found`,
                                    data: recips,
                                  });
                                }
                              }
                            });
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
              }
            } catch (err) {
              console.log("err", err);
            }
          });
      } else {
        let query = recipRef
          .where("officialEmail", "==", parameter.officialEmail)
          .orderBy("dateFinished", "desc")
          .get()
          .then(async (snapshot) => {
            if (snapshot.empty) {
              reject({ response: -1, message: `Recips not found` });
              return;
            }
            let recips = [];
            snapshot.forEach((doc) => {
              let recipData = doc.data();
              recipData.id = doc.id;
              recips.push(recipData);
            });
            recips.map((recip) => {
              recip.dateStart = recip.dateStart.nanoseconds
                ? recip.dateStart.toDate()
                : recip.dateStart;
              recip.dateFinished = recip.dateFinished.nanoseconds
                ? recip.dateFinished.toDate()
                : recip.dateFinished;
              if (recip.totalTime)
                recip.totalTime = recip.totalTime.nanoseconds
                  ? recip.totalTime.toDate()
                  : recip.totalTime;
            });
            if (parameter.limit) {
              resolve({
                response: 1,
                message: `Recips found`,
                data: {
                  total: recips.slice(0, parameter.limit),
                },
              });
            } else {
              resolve({
                response: 1,
                message: `Recips found`,
                data: { active, finished, total: recips },
              });
            }
          })
          .catch((err) => {
            console.log("Error getting documents", err);
            reject({ response: 0, err });
            return;
          });
      }
    } catch (err) {
      console.log(err);
      reject({ response: 0, err });
      return;
    }
  });
};

module.exports.readRecip = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.recipId) {
        reject({ response: -1, message: `Missing data: recipId` });
        return;
      }
      const db = admin.firestore();
      let recipRef = db.collection("recips").doc(parameter.recipId);
      let query = recipRef
        .get()
        .then((doc) => {
          try {
            if (!doc.exists) {
              console.log("No such document!");
              reject({ response: -1, err: "No such document!" });
              return;
            }
            let data = doc.data();
            data.id = doc.id;
            data.dateStart =
              Number(data.dateStart.nanoseconds) === Number(0) ||
              data.dateStart.nanoseconds
                ? data.dateStart.toDate()
                : data.dateStart;
            data.dateFinished =
              Number(data.dateFinished.nanoseconds) === Number(0) ||
              data.dateFinished.nanoseconds
                ? data.dateFinished.toDate()
                : data.dateFinished;
            if (data.totalTime)
              data.totalTime = data.totalTime.nanoseconds
                ? data.totalTime.toDate()
                : data.totalTime;
            if (parameter.print) {
              hqCrud
                .readHq({ id: data.hqId, recip: true })
                .then((res) => {
                  try {
                    data.corporation = res.data.corporation;
                    data.parkData = {
                      address: res.data.location.address,
                      name: res.data.name,
                    };
                    resolve({
                      response: 1,
                      message: `Recip found succesfully`,
                      data: data,
                    });
                  } catch (err) {
                    console.log(err);
                    reject(err);
                  }
                })
                .catch((err) => {
                  console.log(err);
                  resolve({
                    response: 1,
                    message: `Recip found succesfully`,
                    data: data,
                  });
                });
            } else
              resolve({
                response: 1,
                message: `Recip found succesfully`,
                data: data,
              });
          } catch (err) {
            console.log("Error getting documents", err);
            reject({ response: 0, err });
            return;
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

module.exports.changeRecipStatus = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = {};
      if (parameter.status) data.status = parameter.status;
      if (parameter.paymentStatus) data.paymentStatus = parameter.paymentStatus;
      if (parameter.cash) data.cash = parameter.cash;
      if (parameter.change) data.change = parameter.change;
      if (Object.values(data).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      const db = admin.firestore();
      let recipRef = db.collection("recips").doc(parameter.id);
      await recipRef.update(data);
      resolve({ response: 1, message: `Status changed` });
    } catch (err) {
      console.log("Error getting documents", err);
      reject({ response: 0, err });
      return;
    }
  });
};

module.exports.getRecipsByPlate = (parameter) => {
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
    let recipRef = db.collection("recips");
    recipRef
      .where("plate", "==", parameter.plate)
      .orderBy("dateFinished", "desc")
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          reject({ response: -1, message: `Recips not found` });
          return;
        }
        let recips = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          data.dateStart = data.dateStart.nanoseconds
            ? data.dateStart.toDate()
            : data.dateStart;
          data.dateFinished = data.dateFinished.nanoseconds
            ? data.dateFinished.toDate()
            : data.dateFinished;
          data.totalTime =
            data.totalTime && data.totalTime.nanoseconds
              ? data.totalTime.toDate()
              : data.totalTime;
          recips.push(data);
        });
        console.log(parameter.limit);
        if (parameter.limit) {
          resolve({
            response: 1,
            message: `Recips found succesfully`,
            data: recips.slice(0, parameter.limit),
          });
          return;
        } else {
          resolve({
            response: 1,
            message: `Recips found succesfully`,
            data: recips,
          });
          return;
        }
      })
      .catch((err) => {
        console.log("Error getting documents", err);
        reject({ response: 0, err });
        return;
      });
  });
};
