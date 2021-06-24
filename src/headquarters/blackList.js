const admin = require('firebase-admin');
const moment = require("moment-timezone")
const hqCrud = require('./crud')

module.exports.createBlackList = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
    if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
    if (!parameter.plate) { reject({ response: -1, message: `Missing data: plate` }); return }
    if (!parameter.recipId) { reject({ response: -1, message: `Missing data: recipId` }); return }
    if (!parameter.userPhone) { reject({ response: -1, message: `Missing data: userPhone` }); return }
    if (!parameter.value) { reject({ response: -1, message: `Missing data: value` }); return }

    hqCrud.readHq({ id: parameter.hqId })
      .then(resultHq => {
        if (resultHq.response === 1) {
          const db = admin.firestore();
          this.readBlackList({ hqId: parameter.hqId, plate: parameter.plate })
            .then(async (blResult) => {
              try {
                if (blResult.data.recipIds.includes(parameter.recipId)) reject({ response: -1, message: `Blacklist exists, and this recip id is not new to it` })
                else {
                  let data = {
                    value: admin.firestore.FieldValue.increment(parameter.value),
                    recipIds: admin.firestore.FieldValue.arrayUnion(parameter.recipId),
                    status : "active",
                    date: moment().tz("America-Bogota")
                  }
                  if (!blResult.data.userPhones.includes(parameter.userPhone) && parameter.userPhone.startsWith("+57")) data.userPhones = admin.firestore.FieldValue.arrayUnion(parameter.userPhone)
                  let blRef = await db.collection('blacklist').doc(blResult.data.id).update(data)
                  resolve({ response: 1, message: `Blacklist registered` })
                }
              } catch (err) {
                console.log(err)
                reject(err)
              }
            })
            .catch(async (err) => {
              try {
                if (err.response && err.response === -1) {
                  parameter.recipIds = [parameter.recipId]
                  if(parameter.userPhone.startsWith("+57")) parameter.userPhones = [parameter.userPhone]
                  delete parameter.recipId
                  delete parameter.userPhone
                  parameter.status = "active"
                  parameter.date = moment().tz("America-Bogota")
                  let blRef = await db.collection('blacklist').add(parameter)
                  resolve({ response: 1, message: `Blacklist registered`, id: blRef.id })
                } else reject(err)
              } catch (err) {
                console.log(err)
                reject(err)
              }
            })
        } else reject(resultHq)
      })
      .catch(err => reject(err))
  })
}

module.exports.readBlackList = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
    if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
    if (!parameter.plate) { reject({ response: -1, message: `Missing data: hqId` }); return }
    const db = admin.firestore();
    let blRef = db.collection('blacklist').where('hqId', '==', parameter.hqId).where('plate', '==', parameter.plate).where('status', '==', 'active')
    blRef.get()
      .then(snapshot => {
        if (snapshot.empty) {
          reject({ response: -1, message: `Bl not found` })
          return;
        }
        snapshot.forEach(doc => {
          let data = doc.data()
          data.id = doc.id
          if (data.date) data.date = Number(data.date.nanoseconds) === Number(0) || data.date.nanoseconds ? data.date.toDate() : data.date
          resolve({ response: 1, message: `BL found`, data })
        })

      })
      .catch(err => {
        console.log(err)
        reject(err)
      })
  })
}

module.exports.payDebts = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
      if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
      if (!parameter.plate) { reject({ response: -1, message: `Missing data: hqId` }); return }
      if (!parameter.value) { reject({ response: -1, message: `Missing data: value` }); return }
      this.readBlackList(parameter)
        .then(async (res) => {
          try {
            const db = admin.firestore();
            let data = {}
            if (res.data.value === parameter.value) {
              data.value = 0
              data.status = "payed"
            } else {
              data.value = res.data.value - parameter.value
            }
            await db.collection('blacklist').doc(res.data.id).update(data)
            resolve({ response: 1, message: `BL payed`, data })
          } catch (err) {
            console.log(err)
            reject(err)
          }
        })
        .catch(err => reject(err))
    } catch (err) {
      console.log(err)
      reject(err)
    }
  })
}

module.exports.listHQDebts = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
    if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
    const db = admin.firestore();
    let blRef = db.collection('blacklist').where('hqId', '==', parameter.hqId).where('status', '==', 'active')
    blRef.get()
      .then(snapshot => {
        if (snapshot.empty) {
          reject({ response: -1, message: `Bl not found` })
          return;
        }
        let bl = []
        snapshot.forEach(doc => {
          let data = doc.data()
          data.id = doc.id
          data.date =  Number(data.date.nanoseconds) === Number(0) || data.date.nanoseconds ? data.date.toDate() : data.date
          bl.push(data)
        })
        resolve({ response: 1, message: `BL found`, data: bl })
      })
      .catch(err => {
        console.log(err)
        reject(err)
      })
  })
}

module.exports.blackListForPlate = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
    if (!parameter.plate) { reject({ response: -1, message: `Missing data: plate` }); return }
    const db = admin.firestore();
    let blRef = db.collection('blacklist').where('plate', '==', parameter.plate).where('status', '==', 'active')
    blRef.get()
      .then(snapshot => {
        if (snapshot.empty) {
          reject({ response: -1, message: `Bl not found` })
          return;
        }
        let bl = []
        snapshot.forEach(doc => {
          let data = doc.data()
          data.date = data.date.nanoseconds ? data.date.toDate() : data.date
          data.id = doc.id
          bl.push(data)
        })
        resolve({ response: 1, message: `BL found`, data: bl })
      })
      .catch(err => {
        console.log(err)
        reject(err)
      })
  })
}

