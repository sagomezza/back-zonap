const admin = require('firebase-admin');

module.exports = function (req, res) {
  if (!req.body.phone || !req.body.code) {
    return res.status(422).send({ error: 'Phone and code must be provided' });
  }

  const phone = String(req.body.phone).replace(/[^\d]/g, '');
  const code = parseInt(req.body.code);

  admin.auth().getUser(phone)
    .then(() => {
      const store = admin.firestore().collection('oneTimePassword')

      if (req.body.cron) {
        store.doc(phone).get().then(doc => {
          // if (doc.exists) {
          //   data = doc.data();
          //   console.log('cron[verify] ', data.code);
          // }
          console.log('cron[verify] ', doc);
        }).catch(err => {
          console.log('cron[verify] ', err);
        });
        return res.status(200).send({ code, phone, timestamp: new Date().toLocaleString() });
      }
      else {
        store.doc(phone).get().then(doc => {
          if (doc.exists) {
            data = doc.data()
            if (data.code !== code || !data.codeValid) {
              return res.status(422).send({ error: 'Code not valid' });
            }
            store.doc(phone).update({ codeValid: false });
            admin.auth().createCustomToken(phone)
              .then(token => res.send({ token: token }));
          } else {
            res.status(422).send({ error: 'No information was found for the given phone' })
          }
        })
      }
    })
    .catch((err) => res.status(422).send({ error: err }))
}