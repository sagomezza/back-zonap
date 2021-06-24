const admin = require('firebase-admin');
const crypto = require('crypto');
const { box, randomBytes } = require('tweetnacl');
const {
    decodeUTF8,
    encodeBase64,
    decodeBase64
} = require('tweetnacl-util');
const _this = this;

module.exports.hashSpotId = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            
            const hash = crypto.createHmac('sha256', parameter.spotId).digest('hex').substring(0, 5);
            const db = admin.firestore();
            const response = await db.collection('hashqr').add({ hash, spotId: parameter.spotId })
            resolve({ response: 1, message: `Spot hashed to Table`, hash })
        } catch (err) {
            console.log("[hashSpotId] [ERR]:", JSON.stringify(err, 2))
            console.log("[hashSpotId] [DATA_ASOCIATED]:", JSON.stringify(parameter, 2))
            reject({ response: 0, message: JSON.stringify(err, 2), data: parameter })
        }
    })
}

module.exports.hashPoolId = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            
            const hash = crypto.createHmac('sha256', parameter.poolId).digest('hex').substring(0, 5);
            const db = admin.firestore();
            const response = await db.collection('hashqr').add({ hash, poolId: parameter.poolId })
            resolve({ response: 1, message: `Pool hashed to Table`, hash })
        } catch (err) {
            console.log(err)
            console.log("[hashPoolId] [ERR]:", JSON.stringify(err, 2))
            console.log("[hashPoolId] [DATA_ASOCIATED]:", JSON.stringify(parameter, 2))
            reject({ response: 0, message: JSON.stringify(err, 2), data: parameter })
        }
    })
}

module.exports.findHash = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            
            const db = admin.firestore();
            let qrRef = db.collection('hashqr')
            let query = qrRef.where('hash', '==', parameter.hash).get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        reject({ response: -1, message: `Hash not found` })
                        return;
                    }
                    snapshot.forEach(doc => {
                        let data = doc.data()
                        data.id = doc.id
                        resolve({ response: 1, message: `Hash found succesfully`, data: data })
                    });
                })
                .catch(err => {
                    console.log('Error getting documents', err);
                    reject({ response: 0, err })
                    return;
                });
        } catch (err) {
            console.log("[findHash] [ERR]:", JSON.stringify(err, 2))
            console.log("[findHash] [DATA_ASOCIATED]:", JSON.stringify(parameter, 2))
            reject({ response: 0, message: JSON.stringify(err, 2), data: parameter })
        }
    })

}

module.exports.encryptQRCom = (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            
            const { publicKey, secretKey } = box.keyPair();
            const nonce = randomBytes(box.nonceLength);
            const publicKeyApp = decodeBase64(parameter.base64PublicKeyApp);
            const sharedKey = box.before(publicKeyApp, secretKey);
            _this.findHash({ hash: parameter.data }).then(result => {
                if (result.response === 1) {
                    const messageUint8 = new Uint8Array(decodeUTF8(result.hashes[0].spotId || result.hashes[0].poolId));
                    const encrypted = box.after(messageUint8, nonce, sharedKey);
                    const base64Encrypted = encodeBase64(encrypted);
                    const base64EncodedPublic = encodeBase64(publicKey);
                    const base64EncodedNonce = encodeBase64(nonce);
                    resolve({
                        base64Encrypted,
                        base64EncodedPublic,
                        base64EncodedNonce,
                        type: result.hashes[0].spotId ? 'spot' : 'pool'
                    })
                } else {
                    reject(result)
                }
            }).catch(err => reject(err))
        } catch (err) {
            console.log("[encryptQRCom] [ERR]:", JSON.stringify(err, 2))
            console.log("[encryptQRCom] [DATA_ASOCIATED]:", JSON.stringify(parameter, 2))
            reject({ response: 0, message: JSON.stringify(err, 2), data: parameter })
        }
    })
}