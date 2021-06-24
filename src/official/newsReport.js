const admin = require('firebase-admin');
const moment = require("moment-timezone")

module.exports.createNewsReport = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Missing all parameters` }); return; }
      if (!parameter.officialEmail) { reject({ response: -1, message: `Missing parameter: officialEmail` }); return; }
      if (!parameter.report) { reject({ response: -1, message: `Missing parameter: report` }); return; }
      if (!parameter.hqId) { reject({ response: -1, message: `Missing parameter: hqIds` }); return; }
      parameter.date = moment().tz("America/Bogota").toDate()
      const db = admin.firestore();
      let response = await db.collection("newsReport").add(parameter)
      resolve({ response: 1, message: `Report stored`, id: response.id })
    } catch (err) {
      console.log(err)
      reject({ response: -2, message: `Something bad happened` })
    }
  })
}

module.exports.listNewsReports = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Missing all parameters` }); return; }
      if (!parameter.officialEmail && !parameter.hqId) { reject({ response: -1, message: `Missing parameters` }); return; }
      const db = admin.firestore();
      if (parameter.officialEmail) {
        db.collection("newsReport")
          .where("officialEmail", "==", parameter.officialEmail)
          .get()
          .then(snapshot => {
            if (snapshot.empty) {
              reject({ response: -2, message: `There are no news report for this email` })
              return;
            }
            let newsReports = []
            snapshot.forEach(doc => {
              let data = doc.data()
              data.date = data.date.nanoseconds ? data.date.toDate() : data.date
              data.id = doc.id
              newsReports.push(data)
            })
            resolve({ response: 1, message: `News reports found`, data: newsReports })
          })
      } else {
        db.collection("newsReport")
          .where("hqId", "==", parameter.hqId)
          .get()
          .then(snapshot => {
            if (snapshot.empty) {
              reject({ response: -2, message: `There are no news report for this headquarter` })
              return;
            }
            let newsReports = []
            snapshot.forEach(doc => {
              let data = doc.data()
              data.date = data.date.nanoseconds ? data.date.toDate() : data.date
              data.id = doc.id
              newsReports.push(data)
            })
            resolve({ response: 1, message: `News reports found`, data: newsReports })
          })

      }
    } catch (err) {
      console.log(err)
      reject({ response: -2, message: `Something bad happened` })
    }
  })
}