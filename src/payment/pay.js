const recip = require('./recips')
const stripeController = require('./stripeController')
const userCrud = require('../users/crud')
const blCrud = require('../headquarters/blackList')

module.exports.pay = (parameter) => {
    return new Promise((resolve, reject) => {
        try {
            console.log(parameter)
            if (Object.values(parameter).length === 0) { reject({ response: -1, message: `Error: Empty object` }); return }
            if (parameter.prepayFullDay || parameter.mensualityId || parameter.mensuality || parameter.total === 0) {
                resolve({ response: 1, message: `Cash payment registered` })
                return;
            } else {
                if (!parameter.recipId) { reject({ response: -1, message: `Missing data: recipId` }); return }
                if (!parameter.status) { reject({ response: -1, message: `Missing data: status` }); return }
                if (!parameter.paymentType) { reject({ response: -1, message: `Missing data: paymentType` }); return }
                recip.readRecip({ recipId: parameter.recipId })
                    .then(resultRecip => {
                        try {
                            if (parameter.status === 'pending' || parameter.status === 'parcial-pending') {
                                let value = parameter.status === 'pending' ? resultRecip.data.total : resultRecip.data.change * -1
                                if (parameter.status === 'parcial-pending' && resultRecip.data.pendingValue) value -= resultRecip.data.pendingValue
                                blCrud.createBlackList({
                                    plate: resultRecip.data.plate,
                                    hqId: resultRecip.data.hqId,
                                    recipId: resultRecip.data.id,
                                    value: value,
                                    userPhone: parameter.phone
                                })
                                    .then(result => {
                                        console.log(result)
                                        resolve(result)
                                        return;
                                    })
                                    .catch(err => {
                                        console.log('line 34')
                                        console.log(err)
                                        reject(err)
                                        return;
                                    })
                            } else if (parameter.paymentType === "cash") {
                                if (!parameter.cash && Number(parameter.cash) !== Number(0)) { reject({ response: -1, message: `Missing data: cash` }); return }
                                if (!parameter.change && Number(parameter.change) !== Number(0)) { reject({ response: -1, message: `Missing data: change` }); return }
                                recip.changeRecipStatus({ id: parameter.recipId, paymentStatus: parameter.status, status: "read", paymentType: parameter.paymentType, cash: parameter.cash, change: parameter.change })
                                    .then(result => {
                                        resolve({ response: 1, message: `Cash payment registered` })
                                        return;
                                    })
                                    .catch(err => reject(err))
                            } else if (parameter.paymentType === "cc") {
                                stripeController.chargeStripeUser({ phone: resultRecip.data.phone, amount: resultRecip.data.total })
                                    .then(resultPay => {
                                        recip.changeRecipStatus({ paymentStatus: parameter.status, status: "read", paymentType })
                                            .then(result => {
                                                resolve({ response: 1, message: `Credit card payment registered` })
                                                return;
                                            })
                                            .catch(err => reject(err))
                                    })
                                    .catch(err => reject(err))
                            }
                        } catch (err) {
                            console.log(err)
                            reject(err)
                        }
                    })
                    .catch(err => reject(err))
            }
        } catch (err) {
            console.log(err)
            reject(err)
        }

    })
}
