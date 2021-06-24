const admin = require('firebase-admin');
const stripe = require('./stripeController')

module.exports.saveCreditCard = (parameter) => {
    return new Promise(async (resolve, reject) => {
        
        if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
        if (!parameter.userId) { reject({ response: -1, message: `Error:missing parameter userId` }); return }
        if (!parameter.number) { reject({ response: -1, message: `Error:missing parameter number` }); return }
        if (!parameter.exp_month) { reject({ response: -1, message: `Error:missing parameter exp_month` }); return }
        if (!parameter.exp_year) { reject({ response: -1, message: `Error:missing parameter exp_year` }); return }
        if (!parameter.cvc) { reject({ response: -1, message: `Error:missing parameter cvc` }); return }
        const db = admin.firestore();
        let userRef = db.collection('users').doc(parameter.userId)
        let query = userRef.get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('No such document!');
                    reject({ response: -1, err: "No such document!" })
                    return;
                }
                let phone = doc.data().phone
                parameter.phone = phone
                stripe.createStripeClient(parameter)
                    .then(async (customer) => {
                        try {
                            var infoUser = {
                                last4: customer.sources.data[0].last4,
                                exp_month: customer.sources.data[0].exp_month,
                                exp_year: customer.sources.data[0].exp_year,
                                brand: customer.sources.data[0].brand,
                                stripeToken: customer.id
                            };

                            await userRef.update({
                                "payments.cards": admin.firestore.FieldValue.arrayUnion(infoUser)
                            })
                            resolve({ response: 1, message: `Credit card was stored succesfully` })
                        } catch (err) {
                            console.log('Error saveCreditCard', err);
                            reject({ response: 0, message:'Error saveCreditCard', err })
                            return;
                        }
                    })
                    .catch(err => {
                        console.log('Error saveCreditCard', err);
                        reject({ response: 0, message:'Error saveCreditCard', err })
                        return;
                    })

            })
            .catch(err => {
                console.log('Error getting documents', err);
                reject({ response: 0, message:'Error getting documents', err })
                return;
            });
    })
}

module.exports.deleteCreditCard = async (parameter) => {
    return new Promise(async (resolve, reject)=> {
        try {
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (!parameter.userId) { reject({ response: -1, message: `Error:missing parameter userId` }); return }
            if (!parameter.stripeToken) { reject({ response: -1, message: `Error:missing parameter stripeToken` }); return }
            const db = admin.firestore();
            let userRef = db.collection('users').doc(parameter.userId)
            let query = userRef.get()
                .then(async (doc) => {
                    if (!doc.exists) {
                        console.log('No such document!');
                        reject({ response: -1, err: "No such document!" })
                        return;
                    }
                    let cards = doc.data().payments.cards
                    await userRef.update({
                        "payments.cards": cards.filter(card => card.stripeToken !== parameter.stripeToken)
                    })
                    resolve({ response: 1, message: `Credit card was removed succesfully` })
    
                })
                .catch(err => {
                    console.log('Error getting documents', err);
                    reject({ response: 0, err })
                    return;
                });
    
        } catch (err) {
            console.log('Error deleteCreditCard', err);
            reject({ response: 0, err: JSON.stringify(err, 2) });
            return;
        }
    })
}