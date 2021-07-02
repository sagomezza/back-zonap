const admin = require('firebase-admin');
const moment = require('moment-timezone')
moment().tz("America/Bogota").format();


outterPromise = (doc) => {
  return new Promise((resolve, reject) => {
    if (doc.data().reservations && doc.data().reservations.length && doc.data().reservations.length > 0) {
      let innerPromises = []
      doc.data().reservations.forEach((reserve) => {
        innerPromises.push(innerPromise(reserve, doc, "reserve"))
      })
      let innerResults = Promise.all(innerPromises)
      innerResults.then(res => {
        resolve(res)
      })
    }
    if (doc.data().prepaySave && doc.data().prepaySave.length && doc.data().prepaySave.length > 0) {
      let innerPromises = []
      doc.data().prepaySave.forEach((reserve) => {
        innerPromises.push(innerPromise(reserve, doc, "prepaySave"))
      })
      let innerResults = Promise.all(innerPromises)
      innerResults.then(res => {
        resolve(res)
      })
    } else resolve("none")
  })
}

innerPromise = (reserve, doc, type) => {
  return new Promise(async (resolve, reject) => {
    if (reserve.prepayFullDay) {
      const db = admin.firestore();
      let dateStart = moment(reserve.dateStart.toDate()).tz("America/Bogota")
      let dateFinished = moment().tz("America/Bogota")
      let diff = moment.duration(dateFinished.diff(dateStart));
      let hours = diff.asHours();
      if (hours >= 24) {
        let hqRef = db.collection('headquarters').doc(doc.id)
        let data = {}
        if (type === "prepaySave") {
          let filteredReservations = doc.data().prepaySave.filter(reserv => { return reserv.plate !== reserve.plate })
          if (filteredReservations) data.prepaySave = filteredReservations
          else data.prepaySave = []
        } else {
          let filteredReservations = doc.data().reservations.filter(reserv => { return reserv.plate !== reserve.plate })
          if (filteredReservations) data.reservations = filteredReservations
          else data.reservations = []
        }
        await hqRef.update(data)
        resolve("done")
      } else resolve("done")
    } else resolve("done")
  })
}

module.exports.endPrepayed = () => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection('headquarters').get()
      .then(snapshot => {
        try {
          if (snapshot.empty) {
            resolve("none")
            return;
          }
          let promises = []
          snapshot.forEach(doc => {
            promises.push(outterPromise(doc))
          })
          let results = Promise.all(promises)
          results.then(res => {
            resolve(res)
          })
        } catch (err) {
          console.log('[cron][endPrepayed]:')
          console.log(err)
          reject(err)
        }
      })
  })
}


dueMensualitiesOps = (doc) => {
  return new Promise(async (resolve, reject) => {
    let now = moment().tz("America/Bogota")
    let data = doc.data()
    let dateFinished = moment(new Date (data.validity._seconds) * 1000).tz("America/Bogota").toDate()
    let diff = now.isAfter(dateFinished)
    console.log(diff)
    if (diff) {
      const db = admin.firestore();
      let mensualityRef = db.collection('mensualities').doc(doc.id)
      await mensualityRef.update({ status: "due" })
    } else resolve("none")
  })
}

module.exports.dueMensualities = () => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection('mensualities').get()
      .then(snapshot => {
        try {
          if (snapshot.empty) {
            resolve("none")
            return;
          }
          let promises = []
          snapshot.forEach(doc => {
            promises.push(dueMensualitiesOps(doc))
          })
          let results = Promise.all(promises)
          results.then(res => {
            resolve(res)
          })
        } catch (err) {
          console.log('[cron][dueMensualities]:')
          console.log(err)
          resolve(err)
        }
      })
  })
}

pendingMensualitiesOps = (doc) => {
  return new Promise((resolve, reject) => {
    let now = moment().tz("America/Bogota")
    let data = doc.data()
    let dateFinished = moment(data.validity).tz("America/Bogota")
    let diff = now.isAfter(dateFinished)
    if (diff) {
      const db = admin.firestore();
      db.collection('mensualities').doc(doc.id).delete().then(() => {
        resolve("done")
      })
    } else resolve("none")
  })
}

module.exports.pendingMensualities = () => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection('mensualities')
      .where("status", "==", "pending")
      .get()
      .then(snapshot => {
        try {
          if (snapshot.empty) {
            resolve("none")
            return;
          }
          let promises = []
          snapshot.forEach(doc => {
            let data = doc.data()
            data.id = doc.id
            promises.push(pendingMensualitiesOps(data))
          })
          let results = Promise.all(promises)
          results.then(res => {
            resolve(res)
          })
        } catch (err) {
          console.log('[cron][pendingMensualitiesOps]:')
          console.log(err)
          resolve(err)
        }
      })
  })
}