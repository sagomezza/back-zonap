

const admin = require('firebase-admin');
// const twilio = require('./twilio');
const SNS = require('aws-sdk/clients/sns');

const sns = new SNS({ 
    apiVersion: '2010-03-31',
    accessKeyId: process.env.AWSACCESSKEY,
    secretAccessKey: process.env.AWSSECRETACCESSKEY,
    region: 'us-east-1',
});

module.exports = function (req, res) {
    if (!req.body.phone) {
        return res.status(422).send({ error: 'Ingrese un numero telefonico' });
    }
    const phone = String(req.body.phone).replace(/[^\d]/g, '');

    admin.auth().getUser(phone)
        .then(userRecord => {
            const code = Math.floor((Math.random() * 8999 + 1000));
            if (req.body.cron) {
                const store = admin.firestore().collection('oneTimePassword');
                store.doc(phone).get().then(doc => {
                    console.log('cron[request] ', doc);
                }).catch(err => {
                    console.log('cron[request] ', err);
                });
                
                return res.status(200).send({ message: code, phone: userRecord.uid, timestamp: new Date().toLocaleString() });
            }
            else {
                // twilio.messages.create({
                //     body: 'Tu cod. Bluspot es: ' + code,
                //     to: "+" + phone,
                //     from: '+19016726593 '
                // }, (err) => {
                //     if (err) { return res.status(422).send(err); }
                //     const store = admin.firestore().collection('oneTimePassword');
                //     store.doc(phone).set({
                //         code: code,
                //         codeValid: true
                //     }).then(() => {
                //         res.send({ success: true });
                //     }).catch(err => {
                //         console.log(err)
                //         res.status(422).send({ error: err });
                //     });
                // });
                const params = {
                    Message: 'Tu cod. Bluspot es: ' + code,
                    PhoneNumber: '+' + phone,
                    MessageAttributes: {
                        'AWS.SNS.SMS.SMSType': {
                            DataType: 'String',
                            StringValue: 'Transactional'
                        }
                    }
                };
                sns.publish(params, (err, data) => {
                    if (err) {
                        console.log('publish[ERR] ', err, err.stack);
                        return res.status(422).send(err);
                    }
                    const store = admin.firestore().collection('oneTimePassword');
                    store.doc(phone).set({
                        code: code,
                        codeValid: true
                    }).then(() => {
                        res.send({ success: true });
                    }).catch(err => {
                        console.log(err)
                        res.status(422).send({ error: err });
                    });
                    console.log('publish[data] ', data);
                });
            }
        })
        .catch((err) => {
            res.status(422).send({ error: err });
        });
}
