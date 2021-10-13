const axios = require("axios");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt");

module.exports.wompiResponse = (parameter) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`https://production.wompi.co/v1/transactions/${parameter.id}`)
      .then(async (respone) => {
        try {
          console.log(respone.data);
          let transaction = respone.data.transaction;
          let checksum =
            transaction.id +
            transaction.status +
            transaction.amount_in_cents +
            respone.data.data.timestamp +
            process.env.WOMPI_SECRET;
          let hashedCheckSum = bcrypt.hash(checksum);
          if (hashedCheckSum === respone.data.signature.checksum) {
            const db = admin.firestore();
            await db
              .collection("recips")
              .doc(String(transaction.reference))
              .set({
                status: transaction.status,
                change: 0,
                cash: 0,
                paymentType: "wompi",
                userEmail: transaction.customer_email,
                datePayed: new Date(),
              });
            resolve({
              response: 1,
              message: "Wompi transaction stored succesfuly",
            });
            return;
          } else { 
            console.log(err);
            reject({ response: -1, err: 'Checksum does not match' });
          }
        } catch (err) {
          console.log(err);
          reject({ response: 0, err });
        }
      });
  });
};
