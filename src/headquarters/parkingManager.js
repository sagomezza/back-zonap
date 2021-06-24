const admin = require('firebase-admin');
const FieldValue = admin.firestore.FieldValue;
const parkingCrud = require('../parks/crud')
const hqCrud = require('./crud')

module.exports.assignPark = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
            if (!parameter.parkId) { reject({ response: -1, message: `Missing data: parkId` }); return }
            hqCrud.readHq({ id: parameter.hqId })
                .then(result => {
                    parkingCrud.readPark({ id: parameter.parkId })
                        .then(async (result2) => {
                            const db = admin.firestore();
                            let hqRef = db.collection('headquarters').doc(parameter.hqId)
                            await hqRef.update({
                                parks: admin.firestore.FieldValue.arrayUnion(parameter.parkId)
                            })
                            let parkRef = db.collection('parks').doc(parameter.parkId)
                            await parkRef.update({
                                hq: admin.firestore.FieldValue.arrayUnion(parameter.hqId)
                            })
                            resolve({ response: 1, message: `The park ${parameter.parkId} was assigned to Hq ${result.name} assigned succesfully` })
                        })
                        .catch(err => {
                            console.log('Error assignPark', err);
                            reject({ response: 0, err })
                            return;
                        })
                })
                .catch(err => {
                    console.log('Error assignPark', err);
                    reject({ response: 0, err })
                    return;
                })
        } catch (err) {
            console.log('Error assignPark', err);
            reject({ response: 0, err })
            return;
        }
    })

}

module.exports.unAssignPark = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
            if (!parameter.parkId) { reject({ response: -1, message: `Missing data: parkId` }); return }
            hqCrud.readHq({ id: parameter.parkId })
                .then(result => {
                    parkingCrud.readOfficial({ id: parameter.hqId })
                        .then(async (result2) => {
                            const db = admin.firestore();
                            let hqRef = db.collection('headquarters').doc(parameter.parkId)
                            await hqRef.update({
                                officials: admin.firestore.FieldValue.arrayRemove(parameter.email)
                            })
                            let parkRef = db.collection('parks').doc(result2.data.id)
                            await parkRef.update({
                                hq: admin.firestore.FieldValue.arrayRemove(parameter.hqparkIdId)
                            })
                            resolve({ response: 1, message: `The park ${parameter.parkId} was unassigned to Hq ${result.name} assigned succesfully` })
                        })
                        .catch(err => {
                            console.log('Error assignPark', err);
                            reject({ response: 0, err })
                            return;
                        })
                })
                .catch(err => {
                    console.log('Error assignPark', err);
                    reject({ response: 0, err })
                    return;
                })
        } catch (err) {
            console.log('Error assignPark', err);
            reject({ response: 0, err })
            return;
        }
    })

}


const mapParkData = (parks) => {
    return new Promise((resolve, reject) => {
        try {
            let promises = []
            let parksData = []
            parks.map(park => {
                promises.push(
                    parkingCrud.readPark({ id: park })
                        .then(parkResult => {
                            parksData.push(parkResult)
                        })
                        .catch(err => reject(err))
                )
            })
            let results = Promise.all(promises)
            results.then(data => {
                let summary = {}

                let cars = parksData.filter(park => park.type === "car")
                summary.carsTotal = cars.length
                let carsAvailable = cars.filter(park => park.type === "available")
                summary.carsAvailable = carsAvailable.length

                let bikes = parksData.filter(park => park.type === "car")
                summary.bikesTotal = bikes.length
                let bikesAvailable = bikes.filter(park => park.type === "available")
                summary.bikesAvailable = bikesAvailable.length
                summary.totalParks = parksData.length
                // summary.cars = cars
                // summary.bikes = bikes
                resolve({ response: 1, message: `Pool found!`, data: summary })
            }).catch(err => {
                console.log(err)
                reject(err)
            })
        } catch (err) {
            console.log(err)
            reject({response: 0, err: JSON.stringify(err, 2)})
        }
    })
}

module.exports.getParkingData = (parameter) => {
    return new Promise((resolve, reject) => {
        if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
        if (!parameter.hqId || !parameter.parks) { reject({ response: -1, message: `Missing data: hqId or parks` }); return }
        if (parameter.hqId) {
            hqCrud.readHq({ name: hqId })
                .then(hqResult => {
                    let parks = hqResult.data.parks
                    mapParkData(parks)
                        .then(result => resolve(result))
                        .catch(err => reject(err))
                })
                .catch(err => reject(err))
        } else {
            mapParkData(parameter.parks)
                .then(result => resolve(result))
                .catch(err => reject(err))
        }
    })
}
