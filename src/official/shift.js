const admin = require("firebase-admin");
const officialCrud = require("./crud");
const hqCrud = require("../headquarters/crud");
const moment = require("moment-timezone");
const revoke_current_sessions = require("../login/revoke_current_sessions");

module.exports.assignSchedule = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.email) {
      reject({ response: -1, message: `Missing data: email` });
      return;
    }
    if (!parameter.schedule) {
      reject({ response: -1, message: `Missing data: schedule` });
      return;
    }
    if (!parameter.schedule.start) {
      reject({ response: -1, message: `Missing data: startDate` });
      return;
    }
    if (!parameter.schedule.end) {
      reject({ response: -1, message: `Missing data: endDate` });
      return;
    }
    officialCrud
      .readOfficial({ email: parameter.email })
      .then(async (result) => {
        try {
          const db = admin.firestore();
          let officialRef = db.collection("officials");
          let query = officialRef
            .where("email", "==", parameter.email)
            .get()
            .then((snapshot) => {
              if (snapshot.empty) {
                reject({ response: -1, message: `Official not found` });
                return;
              }
              snapshot.forEach(async (doc) => {
                let aux = db.collection("officials").doc(doc.id);
                await aux.update(parameter);
                resolve({ response: 1, message: "Shift assigned" });
              });
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
      })
      .catch((err) => reject(err));
  });
};

module.exports.unAssignSchedule = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.email) {
      reject({ response: -1, message: `Missing data: email` });
      return;
    }
    officialCrud
      .readOfficial({ email: parameter.email })
      .then(async (result) => {
        try {
          const db = admin.firestore();
          let officialRef = db.collection("officials");
          let query = officialRef
            .where("email", "==", parameter.email)
            .get()
            .then((snapshot) => {
              if (snapshot.empty) {
                reject({ response: -1, message: `Official not found` });
                return;
              }
              snapshot.forEach(async (doc) => {
                let aux = db.collection("officials").doc(doc.id);
                await aux.update({ schedule: {} });
                resolve({ response: 1, message: "Shift unassigned" });
              });
            })
            .catch((err) => {
              console.log("Error getting documents", err);
              reject({ response: 0, err });
              return;
            });

          resolve({ response: 1, message: "Shift started" });
        } catch (err) {
          reject(err);
        }
      })
      .catch((err) => reject(err));
  });
};

module.exports.startShift = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.email) {
      reject({ response: -1, message: `Missing data: email` });
      return;
    }
    // if (!parameter.schedule) { reject({ response: -1, message: `Missing data: schedule` }); return }
    officialCrud
      .readOfficial({ email: parameter.email })
      .then(async (result) => {
        try {
          if (result.data.end !== null){
            let data = {
              start: admin.firestore.Timestamp.fromDate(
                moment().tz("America/Bogota").toDate()
              ),
              end: null,
              status: "active",
            };
            const db = admin.firestore();
            let officialRef = db.collection("officials").doc(result.data.id);
            await officialRef.update(data);
            resolve({ response: 1, message: "Shift started" });
          } else {
            resolve({ response: 2, message: "Shift has already started"})
          }
        } catch (err) {
          console.log(err);
          reject(err);
        }
      })
      .catch((err) => reject(err));
  });
};

module.exports.markEndOfShift = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.email) {
      reject({ response: -1, message: `Missing data: email` });
      return;
    }
    if (!parameter.id) {
      reject({ response: -1, message: `Missing data: id` });
      return;
    }
    if (!parameter.total && Number(parameter.total) !== Number(0)) {
      reject({ response: -1, message: `Missing data: total` });
      return;
    }
    if (!parameter.input && Number(parameter.input) !== Number(0)) {
      reject({ response: -1, message: `Missing data: input` });
      return;
    }
    if (!parameter.base && Number(parameter.base) !== Number(0)) {
      reject({ response: -1, message: `Missing data: base` });
      return;
    }
    if (!parameter.hqId) {
      reject({ response: -1, message: `Missing data: hqId` });
      return;
    }
    if (!parameter.macAddress) {
      reject({ response: -1, message: `Missing data: macAddress` });
      return;
    }
    officialCrud
      .readOfficial({ email: parameter.email })
      .then(async (result) => {
        try {
          if (result.data.id !== parameter.id) {
            console.log({
              response: -2,
              message: "The id doesnt' correspond to official's id",
            });
            reject({
              response: -2,
              message: "The id doesnt' correspond to official's id",
            });
            return;
          }
          parameter.difference = (parameter.total - parameter.input) * -1;
          parameter.nid = result.data.nid;
          if (parameter.difference > 0) parameter.status = "over";
          else if (parameter.difference < 0) parameter.status = "negative";
          else parameter.status = "up-to-date";
          parameter.date = admin.firestore.Timestamp.fromDate(
            moment().tz("America/Bogota").toDate()
          );
          const db = admin.firestore();
          db.collection("metadata")
            .doc(parameter.hqId)
            .get()
            .then(async (doc) => {
              try {
                if (!doc.exists) {
                  console.log({ response: -2, message: `Bad hqId` });
                  reject({ response: -2, message: `Bad hqId` });
                  return;
                }
                let schedule = {
                  status: "inactive",
                  start: result.data.start,
                  end: parameter.date,
                };
                parameter.nid = result.data.nid;
                parameter.dateStart = result.data.start;
                if (parameter.uid) {
                  let revoke = await revoke_current_sessions({
                    uid: parameter.uid,
                    deviceId: parameter.deviceId,
                  });
                  console.log(revoke);
                }
                let shiftClose = doc.data().shiftClose + 1;
                let officialRef = db.collection("officials").doc(parameter.id);
                parameter.firm = `${parameter.email}_${
                  parameter.macAddress
                }-${new Date()}`;
                delete parameter.macAddress;
                await officialRef.update(schedule);
                await db
                  .collection("shiftReports")
                  .doc(shiftClose + "")
                  .set(parameter);
                await db
                  .collection("metadata")
                  .doc(parameter.hqId)
                  .update({ shiftClose });
                resolve({ response: 1, message: "Shift finished" });
              } catch (err) {
                console.log(err);
                reject({ response: 0, err });
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
  });
};

module.exports.getShiftRecips = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.email) {
        reject({ response: -1, message: `Missing data: email` });
        return;
      }
      if (!parameter.hqId) {
        reject({ response: -1, message: `Missing data: hqId` });
        return;
      }
      hqCrud
        .readHq({ id: parameter.hqId })
        .then((hqResult) => {
          try {
            if (hqResult.response === 1) {
              officialCrud
                .readOfficial({ email: parameter.email })
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
                      let dateStart = moment(new Date(officialData.start._seconds) * 1000)
                        .tz("America/Bogota")
                        .toDate();
                      let dateEnd = admin.firestore.Timestamp.fromDate(
                        moment().tz("America/Bogota").toDate()
                      );
                      const db = admin.firestore();
                      let recips = [];
                      let total = 0;
                      //console.log(dateStart);
                      //console.log(dateEnd.toDate());
                      let recipsRef = await db
                        .collection("recips")
                        .where("dateFinished", ">=", dateStart)
                        .where("dateFinished", "<=", dateEnd)
                        .where("officialEmail", "==", parameter.email)
                        .where("creditCardPay", "==", false)
                        .orderBy("dateFinished", "desc");
                      recipsRef
                        .get()
                        .then((snapshot) => {
                          try {
                            if (!snapshot.empty) {
                              snapshot.forEach((doc) => {
                                let data = doc.data();
                                if (!data.mensuality && !data.prepayFullDay) {
                                  data.id = doc.id;
                                  //console.log(data.id)
                                  data.dateStart = data.dateStart.toDate();
                                  data.dateFinished =
                                    data.dateFinished.toDate();
                                  data.change < 0
                                    ? (total += data.cash)
                                    : (total += data.total);
                                  recips.push(data);                
                                }
                              });
                            }
                            db.collection("recips")
                              .where("dateStart", ">=", dateStart)
                              .where("dateStart", "<=", dateEnd)
                              .where("mensuality", "==", true)
                              .where("officialEmail", "==", parameter.email)
                              .orderBy("dateStart", "desc")
                              .get()
                              .then((snapshot) => {
                                if (!snapshot.empty) {
                                  snapshot.forEach((doc) => {
                                    let data = doc.data();
                                    data.id = doc.id;
                                    data.dateStart = data.dateStart.toDate();
                                    data.dateFinished =
                                      data.dateFinished.toDate();
                                    data.change < 0
                                      ? (total += data.cash)
                                      : (total += data.total);
                                    recips.push(data);
                                  });
                                }
                                db.collection("recips")
                                  .where("dateFactured", ">=", dateStart)
                                  .where("dateFactured", "<=", dateEnd)
                                  .where("prepayFullDay", "==", true)
                                  .where("officialEmail", "==", parameter.email)
                                  .orderBy("dateFactured", "desc")
                                  .get()
                                  .then((snapshot) => {
                                    if (!snapshot.empty) {
                                      snapshot.forEach((doc) => {
                                        let data = doc.data();
                                        data.id = doc.id;
                                        data.dateStart =
                                          data.dateStart.toDate();
                                        data.dateFinished =
                                          data.dateFinished.toDate();
                                        data.change < 0
                                          ? (total += data.cash)
                                          : (total += data.total);
                                        recips.push(data);
                                      });
                                    }
                                    if (recips.length === 0) {
                                      reject({
                                        response: -1,
                                        message: `Recips not found`,
                                      });
                                      return;
                                    }
                                    resolve({
                                      response: 1,
                                      message: `Recips found succesfully`,
                                      data: { total, recips },
                                    });
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
                    } else {
                      reject({
                        response: -2,
                        message: `The official ${parameter.email} doesn't have any schedule programmed`,
                      });
                    }
                  } catch (err) {
                    console.log(err);
                    reject(err);
                  }
                })
                .catch((err) => reject(err));
            } else reject(hqResult);
          } catch (err) {
            console.log(err);
            reject({ response: 0, err });
          }
        })
        .catch((err) => reject(err));
    } catch (err) {
      console.log(err);
      reject({ response: 0, err });
    }
  });
};

module.exports.getShiftsOfBox = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.hqId) {
      reject({ response: -1, message: `Missing data: hqId` });
      return;
    }
    let dateStart = moment()
      .tz("America/Bogota")
      .add("days", -1)
      .set("hours", 7)
      .set("minutes", 0)
      .set("seconds", "==", 0)
      .set("milliseconds", "==", 0)
      .toDate();
    let dateEnd = moment().tz("America/Bogota").toDate();
    const db = admin.firestore();
    db.collection("shiftReports")
      .where("hqId", "==", parameter.hqId)
      .where("dateFinished", ">=", dateStart)
      .where("dateFinished", "<=", dateEnd)
      .orderBy("dateFinished", "desc")
      .get()
      .then((snapshot) => {
        let accumulatedShifts = 0;
        if (snapshot.empty) {
          reject({
            response: -1,
            message: `There are no shifts closed in the last 24 hours`,
          });
          return;
        } else {
          snapshot.forEach((doc) => {
            accumulatedShifts += doc.data().total;
          });
          resolve({ response: 1, data: accumulatedShifts });
        }
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};