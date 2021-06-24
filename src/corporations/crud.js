const admin = require('firebase-admin');

module.exports.createCorporation = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {

            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            // if (!parameter.password) { reject({ response: -1, message: `Missing data: password` }); return }
            if (!parameter.name) { reject({ response: -1, message: `Missing data: name` }) }
            if (!parameter.phone) { reject({ response: -1, message: `Missing data: phone` }) }
            if (!parameter.location) { reject({ response: -1, message: `Missing data: location` }) }
            if (!parameter.location.address) { reject({ response: -1, message: `Missing data: location.address` }) }
            if (!parameter.nit) { reject({ response: -1, message: `Missing data: nit` }) }
            if (!parameter.businessName) { reject({ response: -1, message: `Missing data: businessName` }) }
            if (!parameter.type) { reject({ response: -1, message: `Missing data: type` }) }

            Object.assign(parameter, {
                leancoreId: "",
                admins: [],
                hqs: [],
                officials: [],
                urlResponse: ""
            })
            const db = admin.firestore();
            await db.collection('corporations').add(parameter)
            resolve({ response: 1, message: `Corporation  created succesfully` })
        } catch (err) {
            console.log(err)
            reject({ response: 0, err });
            return;
        }
    })
}

module.exports.readCorporation = (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.name && !parameter.id) { reject({ response: -1, message: `Missing data: name or id` }); return }
            const db = admin.firestore();

            if (parameter.name) {
                db
                .collection('corporations')
                .where('name', '==', parameter.name)
                .get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        reject({ response: -1, message: `Corporation by name not found` })
                        return;
                    }
                    snapshot.forEach(doc => {
                        let data = doc.data()
                        data.id = doc.id
                        resolve({ response: 1, message: `Corporation found succesfully`, data: data })
                    });
                })
                .catch(err => {
                    console.log('Error getting documents', err);
                    reject({ response: 0, err })
                    return;
                });
            } else {
                db
                .collection('corporations')
                .doc(parameter.id)
                .get()
                .then(doc => {
                    if (!doc.exists) {
                        console.log('Hq not found');
                        reject({ response: -1, err: "Corporation by id not found!" })
                        return;
                    }
                    let data = doc.data()
                    data.id = doc.id
                    resolve({ response: 1, message: `Corporation found succesfully`, data: data })
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

module.exports.editCorporation = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {

            let data = {}
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.id) { reject({ response: -1, message: `Missing data: id` }); return }
            if (parameter.name) data.name = parameter.name
            if (parameter.phone) data.phone = parameter.phone
            if (parameter.location) data.location = parameter.location
            if (parameter.type) data.type = parameter.type
            if (parameter.businessName) data.host = parameter.businessName
            if (Object.values(data).length === 0) { reject({ response: -1, message: `Error: Bad parameters` }); return }
            
            const db = admin.firestore();
            await  db.collection('corporations').doc(parameter.id).update(data)
            resolve({ response: 1, message: `Corporation updated succesfully` })
        } catch (err) {
            console.log('Error getting documents', err);
            reject({ response: 0, err });
            return;
        }
    })

}