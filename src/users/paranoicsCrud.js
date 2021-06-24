const admin = require('firebase-admin');

module.exports.createParanoicUser = (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.hqId) { reject({ response: -1, message: `Missing data: email` }); return }
            Object.assign(parameter, {
                name: "Paranoic user",
                lastName: "None",
                analytics: {
                    creationDate: new Date()
                }
            })
            const db = admin.firestore();
            const response = await db.collection('paranoics').add(parameter)
            resolve({ response: 1, message: `Paranoic created. Try to convince them give us their data dude!`, id: response.id })

        } catch (err) {
            console.log(err)
            reject({ response: 0, message: JSON.stringify(err) })
        }

    })
}

module.exports.readParanoicUser = (parameter) => {
    return new Promise(async (resolve, reject) => {
        if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
        if (!parameter.paranoicId) { reject({ response: -1, message: `Missing data: email` }); return }
        const db = admin.firestore();
        let paranoicRef = db.collection('paranoics').doc(parameter.paranoicId)
        let query = paranoicRef.get()
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
    })
}


module.exports.getParanoicsFromHq = (parameter) => {
    return new Promise(async (resolve, reject) => {
        if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
        if (!parameter.hqId) { reject({ response: -1, message: `Missing data: email` }); return }
        const db = admin.firestore();
        let userRef = db.collection('paranoics')
        let query = userRef.where('hqId', '==', parameter.hqId).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    reject({ response: -1, message: `Admin not found` })
                    return;
                }
                let paranoics = []
                snapshot.forEach(doc => {
                    let data = doc.data()
                    data.id = doc.id
                    paranoics.push(data)

                });
                resolve({ response: 1, message: `Admin found succesfully`, data: paranoics })
            })
            .catch(err => {
                console.log('Error getting documents', err);
                reject({ response: 0, err })
                return;
            });
    })
}