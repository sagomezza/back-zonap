const admin = require('firebase-admin');

const moment = require('moment-timezone')
const corpoCrud = require('../corporations/crud')

module.exports.createAdmin = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            //
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.email) { reject({ response: -1, message: `Missing data: email` }); return }
            if (!parameter.phone) { reject({ response: -1, message: `Missing data: phone` }); return }
            // if (!parameter.password) { reject({ response: -1, message: `Missing data: password` }); return }
            if (!parameter.name) { reject({ response: -1, message: `Missing data: name` }) }
            if (!parameter.lastName) { reject({ response: -1, message: `Missing data: lastname` }); return }
            if (!parameter.roll) { reject({ response: -1, message: `Missing data: roll` }); return }
            if (!parameter.context) { reject({ response: -1, message: `Missing data: context` }); return }
            if (!parameter.nid) { reject({ response: -1, message: `Missing data: nid` }); return }
            
            parameter.creationDate = moment().tz("America/Bogota").toDate()
            corpoCrud.readCorporation({ name: parameter.context })
                .then(async () => {
                    parameter.isAdmin = true
                    parameter.hq = ""
                    const db = admin.firestore();
                    const response = await db.collection('admins').add(parameter)
                    await admin.auth().createUser({
                        email: parameter.email,
                        emailVerified: true,
                        password: process.env.DEFAULTPASSWORD,
                        displayName: parameter.name + " " + parameter.lastName,
                        photoURL: "https://cdn0.iconfinder.com/data/icons/elasto-online-store/26/00-ELASTOFONT-STORE-READY_user-circle-512.png",
                        disabled: false,
                        uid: response.id,
                    })
                    resolve({ response: 1, message: `Admin created succesfully` })
                })
                .catch(err => reject(err))
            
        } catch (err) {
            console.log(err)
            reject({ response: 0, err });
            return;
        }
    })
}

module.exports.readAdmin = (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.email) { reject({ response: -1, message: `Missing data: email` }); return }
            const db = admin.firestore();
            db
            .collection('admins')
            .where('email', '==', parameter.email)
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    reject({ response: -1, message: `Admin not found` })
                    return;
                }
                snapshot.forEach(doc => {
                    let data = doc.data()
                    data.id = doc.id
                    resolve({ response: 1, message: `Admin found succesfully`, data: data })
                });
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

module.exports.editAdmin = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            let data = {}
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.id) { reject({ response: -1, message: `Missing data: id` }); return }
            if (parameter.phone) data.phone = parameter.phone
            if (parameter.email) data.email = parameter.email
            if (parameter.name) data.name = parameter.name
            if (parameter.lastName) data.lastName = parameter.lastName
            if (parameter.roll) data.roll = parameter.roll
            if (parameter.context) data.context = parameter.context
            if(parameter.expoToken) data.expoToken = parameter.expoToken
            if (Object.values(data).length === 0) resolve({response: 2, message: "Nothig to update"}) 

            const db = admin.firestore();
            await db.collection('admins').doc(parameter.id).update(data)
            resolve({ response: 1, message: `Admin updated succesfully` })
        } catch (err) {
            console.log('Error getting documents', err);
            reject({ response: 0, err });
            return;
        }
    })
}