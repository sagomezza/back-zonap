const admin = require('firebase-admin');
const parkingManager = require('../headquarters/parkingManager')
const hqCrud = require('../headquarters/crud')

module.exports.createPark = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            // if (!parameter.password) { reject({ response: -1, message: `Missing data: password` }); return }
            if (!parameter.number) { reject({ response: -1, message: `Missing data: number` }) }
            //if (!parameter.state) { reject({ response: -1, message: `Missing data: state` }) }
            if (!parameter.dimentions) { reject({ response: -1, message: `Missing data: dimentions` }) }
            if (!parameter.headquarter) { reject({ response: -1, message: `Missing data: heardquarter` }) }
            if (!parameter.type) { reject({ response: -1, message: `Missing data: type` }) }
            //if (!parameter.price) { reject({ response: -1, message: `Missing data: price` }) }
            if (!parameter.rent) { reject({ response: -1, message: `Missing data: rent` }) }
            //if (!parameter.schedule) { reject({ response: -1, message: `Missing data: schedule` }) }
            hqCrud.readHq({ name: parameter.headquarter })
                .then( async (hqRes)  => {
                    const db = admin.firestore();
                    const response = await db.collection('parks').add(parameter)
                    parkingManager.assignPark({ parkId: response.id, hqId: hqRes.data.id })
                        .then(assignRes => {
                            resolve({ response: 1, message: `Park  created succesfully` })
                        })
                        .catch(err => reject(err))
                })
                .catch(err => reject(err))

        } catch (err) {
            console.log(err)
            reject({ response: 0, err });
            return;
        }
    })
}

module.exports.readPark = (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.id) { reject({ response: -1, message: `Missing data: id` }); return }
            const db = admin.firestore();
            let userRef = db.collection('parks').doc(parameter.id)
            let query = userRef.get()
                .then(doc => {
                    if (!doc.exists) {
                        console.log('No such document!');
                        reject({ response: -1, err: "No such document!" })
                        return;
                    }
                    let data = doc.data()
                    data.id = doc.id
                    resolve({ response: 1, message: `Park found succesfully`, data: data })

                })
                .catch(err => {
                    console.log('Error getting documents', err);
                    reject({ response: 0, err })
                    return;
                });
        } catch (err) {
            console.log('Error getting documents', err);
            reject({ response: 0, err })
            return;
        }
    })
}

module.exports.editPark = async (parameter) => {
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
            const db = admin.firestore();
            let userRef = db.collection('parks').doc(parameter.id)
            await userRef.update(data)
            resolve({ response: 1, message: `Park updated succesfully` })
        } catch (err) {
            console.log('Error getting documents', err);
            reject({ response: 0, err });
            return;
        }
    })
}