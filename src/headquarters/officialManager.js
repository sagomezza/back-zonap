const admin = require('firebase-admin');
const FieldValue = admin.firestore.FieldValue;
const officialCrud = require('../official/crud')
const hqCrud = require('./crud')

module.exports.assignWorker = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.email) { reject({ response: -1, message: `Missing data: email` }); return }
            if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
            hqCrud.readHq({ id: parameter.hqId })
                .then(result => {
                    console.log(result)
                    officialCrud.readOfficial({ email: parameter.email })
                        .then(async (result2) => {
                            const db = admin.firestore();
                            let hqRef = db.collection('headquarters').doc(parameter.hqId)
                            await hqRef.update({
                                officials: admin.firestore.FieldValue.arrayUnion(parameter.email)
                            })
                            let officialRef = db.collection('officials').doc(result2.data.id)
                            await officialRef.update({
                                hq: admin.firestore.FieldValue.arrayUnion(parameter.hqId)
                            })
                            resolve({ response: 1, message: `The official ${parameter.email} was assigned to Hq ${result.name} assigned succesfully` })
                        })
                        .catch(err => {
                            console.log('Error assignWorker', err);
                            reject({ response: 0, err })
                            return;
                        })
                })
                .catch(err => {
                    console.log('Error assignWorker', err);
                    reject({ response: 0, err })
                    return;
                })
        } catch (err) {
            console.log('Error assignWorker', err);
            reject({ response: 0, err })
            return;
        }
    })
}

module.exports.unAssignWorker = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.email) { reject({ response: -1, message: `Missing data: email` }); return }
            if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
            hqCrud.readHq({ id: parameter.hqId })
                .then(result => {
                    console.log(result)
                    officialCrud.readOfficial({ phone: parameter.phone })
                        .then(async (result2) => {
                            const db = admin.firestore();
                            let hqRef = db.collection('headquarters').doc(parameter.hqId)
                            await hqRef.update({
                                officials: admin.firestore.FieldValue.arrayRemove(parameter.email)
                            })
                            let officialRef = db.collection('officials').doc(result2.data.id)
                            await officialRef.update({
                                hq: admin.firestore.FieldValue.arrayRemove(parameter.hqId)
                            })
                            resolve({ response: 1, message: `The official ${parameter.email} was unassigned to Hq ${result.name} assigned succesfully` })
                        })
                        .catch(err => {
                            console.log('Error assignWorker', err);
                            reject({ response: 0, err })
                            return;
                        })
                })
                .catch(err => {
                    console.log('Error assignWorker', err);
                    reject({ response: 0, err })
                    return;
                })
        } catch (err) {
            console.log('Error assignWorker', err);
            reject({ response: 0, err })
            return;
        }
    })

}  