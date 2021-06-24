const admin = require('firebase-admin');
const corpoCrud = require('../corporations/crud')

module.exports.createHq = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            // if (!parameter.password) { reject({ response: -1, message: `Missing data: password` }); return }
            if (!parameter.name) { reject({ response: -1, message: `Missing data: name` }) }
            if (!parameter.location) { reject({ response: -1, message: `Missing data: location` }) }
            if (!parameter.location.address) { reject({ response: -1, message: `Missing data: location` }) }
            if (!parameter.location.coordinates) { reject({ response: -1, message: `Missing data: location` }) }
            if (!parameter.reservationPolitics) { reject({ response: -1, message: `Missing data: reservationPolitics` }) }
            if (!parameter.monthlyPolitics) { reject({ response: -1, message: `Missing data: monthlyPolitics` }) }
            if (!parameter.type) { reject({ response: -1, message: `Missing data: type` }) }
            if (!parameter.hourCarPrice) { reject({ response: -1, message: `Missing data: hourCarPrice` }) }
            if (!parameter.host) { reject({ response: -1, message: `Missing data: host` }) }
            if (!parameter.corporation) { reject({ response: -1, message: `Missing data: corporation` }) }
            if (!parameter.hourBikePrice) { reject({ response: -1, message: `Missing data: hourBikePrice` }) }
            if (!parameter.monthlyCarUsers) parameter.monthlyCarUsers = 0
            if (!parameter.monthlyBikeUsers) parameter.monthlyBikeUsers = 0
            if (parameter.monthlyPolitics !== "non-monthly") {
                if (!parameter.monthlyCarPrice) { reject({ response: -1, message: `Missing data: monthlyCarPrice` }) }
                if (!parameter.monthlyBikePrice) { reject({ response: -1, message: `Missing data: monthlyBikePrice` }) }
            }
            Object.assign(parameter, {
                leancoreId: "",
                parks: [],
                officials: [],
                QRs: [],
                totalCars: parameter.totalCars ? parameter.totalCars : 0,
                totalBikes: parameter.totalBikes ? parameter.totalBikes : 0,
                availableCars: parameter.totalCars ? parameter.totalCars : 0,
                monthlyBikeUsers: parameter.monthlyBikeUsers,
                monthlyCarUsers: parameter.monthlyCarUsers,
                availableBikes: parameter.totalBikes ? parameter.totalBikes : 0,
                reservations: [],
                fractionCarPrice: parameter.fractionCarPrice ? parameter.fractionCarPrice : 0,
                fractionBikePrice: parameter.fractionBikePrice ? parameter.fractionBikePrice : 0,
                dailyCarPrice: parameter.dailyCarPrice ? parameter.dailyCarPrice : 0,
                dailyBikePrice: parameter.dailyBikePrice ? parameter.dailyBikePrice : 0,
            })
            const db = admin.firestore();
            db
            .collection('headquarters')
            .where('name', '==', parameter.name)
            .get()
            .then(async (snapshot) => {
                if (snapshot.empty) {
                    const response = await db.collection('headquarters').add(parameter)
                    let corpoRef = db.collection('corporations').doc(parameter.corporation)
                    await corpoRef.update({
                        hqs: admin.firestore.FieldValue.arrayUnion(response.id)
                    })
                    resolve({ response: 1, message: `Hq created succesfully` })
                    return;
                } else {
                    reject({ response: -1, message: `HQ already exists` })
                    return;
                }
            })
            .catch(err => {
                console.log('Error getting documents', err);
                reject({ response: 0, err })
                return;
            });
        } catch (err) {
            console.log(err)
            reject({ response: 0, err });
            return;
        }
    })
}

module.exports.readHq = (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.id && !parameter.name) { reject({ response: -1, message: `Missing data: id or name` }); return }

            if (parameter.id) {
                const db = admin.firestore();
                db
                .collection('headquarters')
                .doc(parameter.id)
                .get()
                .then(doc => {
                    if (!doc.exists) {
                        console.log('Hq not found');
                        reject({ response: -1, err: "Hq not found!" })
                        return;
                    }
                    let data = doc.data()
                    data.id = doc.id
                    data.occupiedCars = data.totalCars - data.availableCars
                    data.occupiedBikes = data.totalBikes - data.availableBikes
                    data.availableCars -= data.monthlyCarUsers
                    data.availableBikes -= data.monthlyBikeUsers
                    if (data.reservations && data.reservations.length && data.reservations.length > 0) {
                        data.reservations.map(reserve => {
                            reserve.dateStart = reserve.dateStart.toDate()
                        })
                        data.reservations.sort((a, b) => {
                            return b.dateStart - a.dateStart
                        })
                    }
                    if (parameter.limit) data.reservations = data.reservations.slice(0, parameter.limit)
                    if (parameter.recip) {
                        corpoCrud.readCorporation({ id: data.corporation })
                            .then(result => {
                                data.corporation = result.data
                                resolve({ response: 1, message: `Hq found succesfully`, data: data })
                            })
                            .catch(err => reject(err))
                    } else resolve({ response: 1, message: `Hq found succesfully`, data: data })
                })
                .catch(err => {
                    console.log('Error getting documents', err);
                    reject({ response: 0, err })
                    return;
                });
            } else {
                const db = admin.firestore();
                db
                .collection('headquarters')
                .where('name', '==', parameter.name)
                .get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        reject({ response: -1, message: `HQ not found` })
                        return;
                    }
                    snapshot.forEach(async (doc) => {
                        let data = doc.data()
                        data.id = doc.id
                        data.occupiedCars = data.totalCars - data.availableCars
                        data.occupiedBikes = data.totalBikes - data.availableBikes
                        data.availableCars -= data.monthlyCarUsers
                        data.availableBikes -= data.monthlyBikeUsers
                        if (data.reservations && data.reservations.length && data.reservations.length > 0) {
                            data.reservations.map(reserve => {
                                reserve.dateStart = reserve.dateStart.toDate()
                            })
                            data.reservations.sort((a, b) => {
                                return b.dateStart - a.dateStart
                            })
                        }
                        if (parameter.limit) data.reservations = data.reservations.slice(0, parameter.limit)
                        resolve({ response: 1, message: `Hq created succesfully`, data: data })
                    });
                })
                .catch(err => {
                    console.log('Error getting documents', err);
                    reject({ response: 0, err })
                    return;
                });
            }


        } catch (err) {
            console.log('Error getting documents', err);
            reject({ response: 0, err })
            return;
        }
    })

}

module.exports.editHq = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            let data = {}
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.id) { reject({ response: -1, message: `Missing data: id` }); return }
            if (parameter.location) data.location = parameter.location
            if (parameter.reservationPolitics) data.reservationPolitics = parameter.reservationPolitics
            if (parameter.monthlyPolitics) data.monthlyPolitics = parameter.monthlyPolitics
            if (parameter.type) data.type = parameter.type
            if (parameter.price) data.price = parameter.price
            if (parameter.host) data.host = parameter.host
            if (parameter.name) data.name = parameter.name
            const db = admin.firestore();
            let hqRef = db.collection('headquarters').doc(parameter.id)
            await hqRef.update(data)
            resolve({ response: 1, message: `Hq updated succesfully` })
        } catch (err) {
            console.log('Error getting documents', err);
            reject({ response: 0, err });
            return;
        }
    })
}

// let query = hqRef.where('id', '==', parameter.id).get()
