const admin = require('firebase-admin');

const stripeTest = process.env.STRIPE;
//const stripeLive = process.env.STRIPE;

var stripe = require('stripe')(stripeTest);
const userCrud = require('../users/crud')

module.exports.createStripeClient = (parameter) => {
    return new Promise((resolve, reject) => {
        stripe.tokens.create({
            card: {
                "number": parameter.number,
                "exp_month": Number(parameter.exp_month),
                "exp_year": Number(parameter.exp_year),
                "cvc": parameter.cvc
            }
        }, function (err, token) {
            if (err) {
                console.log(err);
                console.log(err.code);
                reject({ response: 0, err });
            } else {
                // console.log(`Se supone que el email es ${parameter.email}`);
                // asynchronously called
                stripe.customers.create({
                    phone: parameter.phone,
                    description: 'Zona-P user',
                    source: token.id // obtained with Stripe.js
                }, function (err, customer) {
                    // asynchronously called
                    if (err) {
                        console.log(err);
                        reject({ response: 0, err });
                    }
                    // console.log(`El customer obtenido es ${JSON.stringify(customer,undefined, 2)}`);
                    resolve(customer);
                });
            }
        });
    })
}

module.exports.chargeStripeUser = (parameter) => {
    return new Promise(async (resolve, reject) => {
        if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
        if (!parameter.phone) { reject({ response: -1, message: `Missing data: phone` }); return }
        if (!parameter.amount) { reject({ response: -1, message: `Missing data: amount` }); return }

        userCrud.readUser({ phone: parameter.phone }).then(resultUser => {
            try {
                let user = resultUser.data
                if(!user.payments || !user.payments.cards ||  user.payments.cards.length < 1) {
                    reject({response: -1, err: `User doesn't have credit card`})
                    return;
                }

                let amount = Math.floor(parameter.amount /3610 * 100)
                stripe.charges.create({
                    amount: amount,
                    currency: 'USD',
                    customer: user.payments.cards[0].stripeToken, // obtained with Stripe.js
                    description: `Charge for parking using Bluspot for parking`
                }, function (err, charge) {
                    if (err != null) {
                        console.log(err)
                        let resultPay = {}
                        resultPay.response = 0;
                        resultPay.messages = `error al realizar el cobro, ${err}`;
                        resultPay.err = JSON.stringify(err, 2, undefined)
                        reject(resultPay)
                    } else {
                        //debugger
                        resolve({
                            response: 1,
                            message: `Succesfuly charged the user for using Bluspot for parking. Total: ${parameter.amount * -1}`,
                            total: parameter.amount
                        })
                    }
                });
            } catch (err) {
                console.log(err)
                reject({
                    response: 0,
                    message: err
                })
            }
        }).catch(err => {
            console.log(err)
            reject(err)
        })
    })

}