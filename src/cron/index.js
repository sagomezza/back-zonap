const admin = require("firebase-admin");
const moment = require("moment-timezone");
const wompi = require("../payment/wompi");
const sms = require("../marketing/sms");
const utils = require("../utils/groupBy");
const _ = require("lodash");
moment().tz("America/Bogota").format();

outterPromise = (doc) => {
  return new Promise((resolve, reject) => {
    if (
      doc.data().reservations &&
      doc.data().reservations.length &&
      doc.data().reservations.length > 0
    ) {
      let innerPromises = [];
      doc.data().reservations.forEach((reserve) => {
        innerPromises.push(innerPromise(reserve, doc, "reserve"));
      });
      let innerResults = Promise.all(innerPromises);
      innerResults.then((res) => {
        resolve(res);
      });
    }
    if (
      doc.data().prepaySave &&
      doc.data().prepaySave.length &&
      doc.data().prepaySave.length > 0
    ) {
      let innerPromises = [];
      doc.data().prepaySave.forEach((reserve) => {
        innerPromises.push(innerPromise(reserve, doc, "prepaySave"));
      });
      let innerResults = Promise.all(innerPromises);
      innerResults.then((res) => {
        resolve(res);
      });
    } else resolve("none");
  });
};

innerPromise = (reserve, doc, type) => {
  return new Promise(async (resolve, reject) => {
    if (reserve.prepayFullDay) {
      const db = admin.firestore();
      let dateStart = moment(reserve.dateStart.toDate()).tz("America/Bogota");
      let dateFinished = moment().tz("America/Bogota");
      let diff = moment.duration(dateFinished.diff(dateStart));
      let hours = diff.asHours();
      if (hours >= 24) {
        let hqRef = db.collection("headquarters").doc(doc.id);
        let data = {};
        if (type === "prepaySave") {
          let filteredReservations = doc.data().prepaySave.filter((reserv) => {
            return reserv.plate !== reserve.plate;
          });
          if (filteredReservations) data.prepaySave = filteredReservations;
          else data.prepaySave = [];
        } else {
          let filteredReservations = doc
            .data()
            .reservations.filter((reserv) => {
              return reserv.plate !== reserve.plate;
            });
          let reservation = doc.data().reservations.find((reserv) => {
            return reserv.plate === reserve.plate;
          });
          reservation.prepayFullDay = false;
          reservation.dateStart = dateFinished.toDate();
          delete reservation.dateFinished;
          delete reservation.cash;
          delete reservation.change;
          delete reservation.total;
          if (filteredReservations) data.reservations = filteredReservations;
          else data.reservations = [];
          data.reservations.push(reservation);
        }
        await hqRef.update(data);
        resolve("done");
      } else resolve("done");
    } else resolve("done");
  });
};

module.exports.endPrepayed = () => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("headquarters")
      .get()
      .then((snapshot) => {
        try {
          if (snapshot.empty) {
            resolve("none");
            return;
          }
          let promises = [];
          snapshot.forEach((doc) => {
            promises.push(outterPromise(doc));
          });
          let results = Promise.all(promises);
          results.then((res) => {
            resolve(res);
          });
        } catch (err) {
          console.log("[cron][endPrepayed]:");
          console.log(err);
          reject(err);
        }
      });
  });
};

dueMensualitiesOps = (doc) => {
  return new Promise(async (resolve, reject) => {
    let now = moment().tz("America/Bogota");
    let data = doc.data();
    let dateFinished = moment(new Date(data.validity._seconds) * 1000)
      .tz("America/Bogota")
      .toDate();
    let diff = now.isAfter(dateFinished);
    console.log(diff);
    if (diff) {
      const db = admin.firestore();
      let mensualityRef = db.collection("mensualities").doc(doc.id);
      await mensualityRef.update({ status: "due" });
    } else resolve("none");
  });
};

module.exports.dueMensualities = () => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("mensualities")
      .get()
      .then((snapshot) => {
        try {
          if (snapshot.empty) {
            resolve("none");
            return;
          }
          let promises = [];
          snapshot.forEach((doc) => {
            promises.push(dueMensualitiesOps(doc));
          });
          let results = Promise.all(promises);
          results.then((res) => {
            resolve(res);
          });
        } catch (err) {
          console.log("[cron][dueMensualities]:");
          console.log(err);
          resolve(err);
        }
      });
  });
};

pendingMensualitiesOps = (doc) => {
  return new Promise((resolve, reject) => {
    let now = moment().tz("America/Bogota");
    let data = doc.data();
    let dateFinished = moment(data.validity).tz("America/Bogota");
    let diff = now.isAfter(dateFinished);
    if (diff) {
      const db = admin.firestore();
      db.collection("mensualities")
        .doc(doc.id)
        .delete()
        .then(() => {
          resolve("done");
        });
    } else resolve("none");
  });
};

module.exports.pendingMensualities = () => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("mensualities")
      .where("status", "==", "pending")
      .get()
      .then((snapshot) => {
        try {
          if (snapshot.empty) {
            resolve("none");
            return;
          }
          let promises = [];
          snapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            promises.push(pendingMensualitiesOps(data));
          });
          let results = Promise.all(promises);
          results.then((res) => {
            resolve(res);
          });
        } catch (err) {
          console.log("[cron][pendingMensualitiesOps]:");
          console.log(err);
          resolve(err);
        }
      });
  });
};

module.exports.wompiPay = () => {
  return new Promise((resolve, reject) => {
    let dueDate = moment()
      .tz("America/Bogota")
      .set({
        date: 5,
        hours: 23,
        minutes: 59,
        seconds: 59,
        milliseconds: 59,
      })
      .toDate();
    const db = admin.firestore();
    db.collection("mensualities")
      .where("type", "==", "personal")
      .where("validity", "==", dueDate)
      .get()
      .then(async (snapshot) => {
        try {
          if (snapshot.size > 0) {
            let docs = [];
            snapshot.forEach((doc) => {
              let data = doc.data();
              data.id = doc.id;
              docs.push(data);
            });
            let groupedDocs = _.groupBy(docs, (doc) => doc.hqId);
            let promises = [];
            Object.keys(groupedDocs).forEach(async (key) => {
              let hqData = await (
                await db.collection("headquarters").doc(key).get()
              ).data();
              let carLink = await wompi.wompiRequestPaymentURL({
                name: "Mensualidad de Zona P",
                description: `Pago de mensualidad de tu carro en nuestro parqueadero ${hqData.name} de Zona P`,
                total: hqData.monthlyCarPrice * 100,
              })
              let bikeLink = await wompi.wompiRequestPaymentURL({
                name: "Mensualidad de Zona P",
                description: `Pago de mensualidad de tu carro en nuestro parqueadero ${hqData.name} de Zona P`,
                total: hqData.monthlyBikePrice * 100,
              })
              carLink = carLink.link;
              bikeLink = bikeLink.link;
              console.log(carLink, bikeLink)
              groupedDocs[key].forEach((doc) => {
                promises.push(
                  sms
                    .sendSMS({
                      phone: doc.userPhone,
                      message: `Tu mensualidad de Zona P esta a punto de vencerse, para pagar ingresa a ${doc.vehicleType === 'car' ? carLink : bikeLink}`,
                    })
                );
              });
              let results = Promise.all(promises);
              results.then(res => {
                console.log(res);
                resolve(res);
              }).catch(err => {
                console.log(err);
                reject(err);
              })
            });
          } else {
            resolve("none");
          }
        } catch (err) {
          console.log("[cron][wompiPay]:", err);
          resolve("none");
        }
      });
  });
};
