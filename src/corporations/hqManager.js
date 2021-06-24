const admin = require('firebase-admin');
const corpoCrud = require('./crud')
const hqCrud = require('../headquarters/crud')

module.exports.assignHq = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
            if (!parameter.corpoId) { reject({ response: -1, message: `Missing data: corpoId` }); return }

            hqCrud.readHq({ id: parameter.hqId })
                .then(() => {
                    corpoCrud.readCorporation({ id: parameter.corpoId })
                        .then(async (result2) => {
                            if(result2.data.hqs.includes(parameter.hqId)) {
                                reject({response: -2, message: `The HQ ${parameter.hqId} is already assigned to corporation ${result2.data.name}.`})
                            }
                            const db = admin.firestore();
                            let corpoRef = db.collection('corporations').doc(parameter.corpoId)
                            await corpoRef.update({
                                hqs: admin.firestore.FieldValue.Union(parameter.hqId)
                            })
                            let hqRef = db.collection('headquarters').doc(parameter.hqId)
                            await hqRef.update({
                                corporation: parameter.corpoId
                            })
                            resolve({ response: 1, message: `The HQ ${parameter.hqId} was assigned to corporation ${result2.data.name}  succesfully` })
                        })
                        .catch(err => {
                            console.log('Error assignHq', err);
                            reject({ response: 0, err })
                            return;
                        })
                })
                .catch(err => {
                    console.log('Error assignHq', err);
                    reject({ response: 0, err })
                    return;
                })
        } catch (err) {
            console.log('Error assignHq', err);
            reject({ response: 0, err })
            return;
        }
    })

}

module.exports.unAssignHq = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.hqId) { reject({ response: -1, message: `Missing data: hqId` }); return }
            if (!parameter.corpoId) { reject({ response: -1, message: `Missing data: corpoId` }); return }
            
            hqCrud.readHq({ id: parameter.hqId })
                .then(() => {
                    corpoCrud.readPark({ id: parameter.corpoId })
                        .then(async (result2) => {
                            const db = admin.firestore();
                            let corpoRef = db.collection('corporations').doc(parameter.corpoId)
                            await corpoRef.update({
                                parks: admin.firestore.FieldValue.arrayRemove(parameter.hqId)
                            })
                            let hqRef = db.collection('headquarters').doc(parameter.hqId)
                            await hqRef.update({
                                hq: ""
                            })
                            resolve({ response: 1, message: `The HQ ${parameter.hqId} was unassigned to corporation ${result2.name}  succesfully` })
                        })
                        .catch(err => {
                            console.log('Error unAssignHq', err);
                            reject({ response: 0, err })
                            return;
                        })
                })
                .catch(err => {
                    console.log('Error unAssignHq', err);
                    reject({ response: 0, err })
                    return;
                })
        } catch (err) {
            console.log('Error unAssignHq', err);
            reject({ response: 0, err })
            return;
        }
    })

}