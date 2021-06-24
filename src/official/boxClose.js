const { response } = require("express");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

module.exports.createBoxReport = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
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
    if (!parameter.base) {
      reject({ response: -1, message: `Missing data: base` });
      return;
    }
    if (!parameter.totalReported) {
      reject({ response: -1, message: `Missing data: totalCalculated` });
      return;
    }
    //if (moment().tz("America/Bogota").hours() !== 7 && moment().tz("America/Bogota").minutes() < 10) { reject({ response: -2, message: `Wrong time` }); return }
    let dateStart = moment()
      .tz("America/Bogota")
      .add(-1, "days")
      .set("hours", 5)
      .set("minutes", 0)
      .set("seconds", 0)
      .set("milliseconds", 0)
      .toDate();
    let dateEnd = moment()
      .tz("America/Bogota")
      .set("hours", 5)
      .set("minutes", 0)
      .set("seconds", 0)
      .set("milliseconds", 0)
      .toDate();
    parameter.status = "active";
    const db = admin.firestore();
    db.collection("recips")
      .where("hqId", "==", parameter.hqId)
      .where(
        "dateFinished",
        ">=",
        admin.firestore.Timestamp.fromDate(dateStart)
      )
      .where("dateFinished", "<=", admin.firestore.Timestamp.fromDate(dateEnd))
      .orderBy("dateFinished", "desc")
      .get()
      .then(async (snapshot) => {
        try {
          let recips = [];
          let recipsIds = [];
          let total = 0;
          if (!snapshot.empty) {
            snapshot.forEach((doc) => {
              let data = doc.data();
              data.id = doc.id;
              data.dateStart = data.dateStart.toDate();
              data.dateFinished = data.dateFinished.toDate();
              total += data.total;
              recipsIds.push(doc.id);
              recips.push(data);
            });
          }
          db.collection("recips")
            .where("hqId", "==", parameter.hqId)
            .where("prepayFullDay", "==", true)
            .where("dateFactured", ">=", dateStart)
            .where("dateFactured", "<=", dateEnd)
            .orderBy("dateFactured", "desc")
            .get()
            .then(async (snapshot) => {
              try {
                if (!snapshot.empty) {
                  snapshot.forEach((doc) => {
                    let data = doc.data();
                    data.id = doc.id;
                    data.dateStart = data.dateStart.toDate();
                    data.dateFinished = data.dateFinished.toDate();
                    total += data.total;
                    recipsIds.push(doc.id);
                    recips.push(data);
                  });
                }
                db.collection("recips")
                  .where("hqId", "==", parameter.hqId)
                  .where("mensuality", "==", true)
                  .where("dateStart", ">=", dateStart)
                  .where("dateStart", "<=", dateEnd)
                  .orderBy("dateStart", "desc")
                  .get()
                  .then(async (snapshot) => {
                    try {
                      if (!snapshot.empty) {
                        snapshot.forEach((doc) => {
                          let data = doc.data();
                          data.id = doc.id;
                          data.dateStart = data.dateStart.toDate();
                          data.dateFinished = data.dateFinished.toDate();
                          if (data.change < 0 && data.cash > 0)
                            total += data.cash;
                          else if (data.change < 0 && data.cash === 0)
                            total += 0;
                          else total += data.total;
                          recipsIds.push(doc.id);
                          recips.push(data);
                        });
                      }
                      if (recips.length === 0) {
                        reject({ response: -2, message: "No recips found" });
                        return;
                      } else {
                        parameter.recips = recipsIds;
                        parameter.totalCalculated = total;
                        let diff = parameter.totalReported - total;
                        parameter.difference = diff;
                        if (diff < 0) parameter.issueWithBox = true;
                        parameter.dateStart =
                          admin.firestore.Timestamp.fromDate(
                            new Date(dateStart)
                          );
                        parameter.dateFinished =
                          admin.firestore.Timestamp.fromDate(new Date(dateEnd));
                        let response = await db
                          .collection("boxCloses")
                          .add(parameter);
                        parameter.id = response.id;
                        resolve({
                          response: 1,
                          message: `Box registered`,
                          data: parameter,
                        });
                      }
                    } catch (err) {
                      console.log(err);
                      reject(err);
                    }
                  });
              } catch (err) {
                console.log(err);
                reject(err);
              }
            });
        } catch (err) {
          console.log(err);
          reject(err);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

module.exports.getBoxTotal = (parameter) => {
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
      let dateStart = moment()
        .tz("America/Bogota")
        .add(-1, "days")
        .set("hours", -5)
        .set("minutes", 0)
        .set("seconds", 0)
        .set("milliseconds", 0);
      
        let dateEnd = moment()
        .tz("America/Bogota")
        .add(-1, "days")
        .set("hours", 18)
        .set("minutes", 59)
        .set("seconds", 59)
        .set("milliseconds", 59);

      // let dateEnd = dateStart.clone();
      // dateEnd.set({ hours: 23, minutes: 59, seconds: 59, milliseconds: 59 });
      dateEnd = dateEnd.toDate();
      dateStart = dateStart.toDate();
      console.log('dateStart', dateStart)
      console.log('dateEnd', dateEnd)
      const db = admin.firestore();
      db.collection("shiftReports")
        .where("hqId", "==", parameter.hqId)
        .where("dateStart", ">=", admin.firestore.Timestamp.fromDate(dateStart))
        .where("dateStart", "<=", admin.firestore.Timestamp.fromDate(dateEnd))
        .get()
        .then(async (snapshot) => {
          try {
            let total = 0;
            if (snapshot.empty) {
              reject({
                response: -2,
                message: `There aren't shifts closed yet.`,
              });
              return;
            }
            if (snapshot.size < 3) {
              reject({
                response: -2,
                message: `We need to have the three main shifts complete`,
              });
              return;
            }
            dateStart = snapshot.docs[0].data().dateStart;
            dateEnd = snapshot.docs[2].data().date;
            db.collection("recips")
              .where("hqId", "==", parameter.hqId)
              .where("dateFinished", ">=", dateStart)
              .where("dateFinished", "<=", dateEnd)
              .orderBy("dateFinished", "desc")
              .get()
              .then(async (snapshot) => {
                if (!snapshot.empty) {
                  snapshot.forEach((doc) => {
                    let data = doc.data();
                    if (data.change < 0 && data.cash > 0) total += data.cash;
                    else if (data.change < 0 && data.cash === 0) total += 0;
                    else total += data.total;
                  });
                }
                db.collection("recips")
                  .where("hqId", "==", parameter.hqId)
                  .where("prepayFullDay", "==", true)
                  .where("dateFactured", ">=", dateStart)
                  .where("dateFactured", "<=", dateEnd)
                  .orderBy("dateFactured", "desc")
                  .get()
                  .then(async (snapshot) => {
                    try {
                      if (!snapshot.empty) {
                        snapshot.forEach((doc) => {
                          let data = doc.data();
                          if (data.change < 0 && data.cash > 0)
                            total += data.cash;
                          else if (data.change < 0 && data.cash === 0)
                            total += 0;
                          else total += data.total;
                        });
                      }
                      db.collection("recips")
                        .where("hqId", "==", parameter.hqId)
                        .where("mensuality", "==", true)
                        .where("dateStart", ">=", dateStart)
                        .where("dateStart", "<=", dateEnd)
                        .orderBy("dateStart", "desc")
                        .get()
                        .then(async (snapshot) => {
                          try {
                            if (!snapshot.empty) {
                              snapshot.forEach((doc) => {
                                let data = doc.data();
                                if (data.change < 0 && data.cash > 0)
                                  total += data.cash;
                                else if (data.change < 0 && data.cash === 0)
                                  total += 0;
                                else total += data.total;
                              });
                            }
                            if (total === 0) {
                              reject({
                                response: -2,
                                message: "No recips found",
                              });
                              return;
                            } else {
                              resolve({
                                response: 1,
                                message: `Box calculated`,
                                data: total,
                              });
                            }
                          } catch (err) {
                            console.log(err);
                            reject(err);
                          }
                        });
                    } catch (err) {
                      console.log(err);
                      reject(err);
                    }
                  });
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
      reject({ response: 0, message: `Something bad happened`, err });
    }
  });
};

module.exports.saveSignReport = (parameter) => {
  return new Promise(async (resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.id) {
      reject({ response: -1, message: `Missing data: id` });
      return;
    }
    if (!parameter.sign) {
      reject({ response: -1, message: `Missing data: sign` });
      return;
    }
    const db = admin.firestore();
    let boxRef = db.collection("boxCloses").doc(parameter.id);
    await boxRef.update({ sign: parameter.sign, status: "closed" });
    resolve({ response: 1, message: `Box signed succesfully` });
  });
};

module.exports.readBoxReport = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.id) {
      reject({ response: -1, message: `Missing data: id` });
      return;
    }
    const db = admin.firestore();
    let boxRef = db.collection("boxCloses").doc(parameter.id);
    boxRef.get().then((doc) => {
      if (!doc.exists) {
        console.log("Hq not found");
        reject({ response: -1, err: "Hq not found!" });
        return;
      }
      let data = doc.data();
      data.id = doc.id;
      data.dateStart = data.dateStart.nanoseconds
        ? data.dateStart.toDate()
        : data.dateStart;
      data.dateFinished = data.dateFinished.nanoseconds
        ? data.dateFinished.toDate()
        : data.dateFinished;
      resolve({ response: 1, message: `Box found succesfully`, data: data });
    });
  });
};

module.exports.listBoxClose = (parameter) => {
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
    db.collection("boxCloses")
      .where("hqId", "==", parameter.hqId)
      .orderBy("dateFinished", "desc")
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          console.log("Hq not found");
          reject({
            response: -1,
            err: "Hq not found or the hq doesn't have a blox closes!",
          });
          return;
        }
        let boxes = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          data.dateStart = data.dateStart.nanoseconds
            ? data.dateStart.toDate()
            : data.dateStart;
          data.dateFinished =
            Number(data.dateFinished.nanoseconds) === Number(0) ||
            data.dateFinished.nanoseconds
              ? data.dateFinished.toDate()
              : data.dateFinished;
          boxes.push(data);
        });
        resolve({ response: 1, message: `Box found succesfully`, data: boxes });
      });
  });
};
