const axios = require("axios");
const admin = require("firebase-admin");
const moment = require("moment-timezone");
const { createHash } = require("crypto");

module.exports.wompiResponse = (parameter) => {
  return new Promise((resolve, reject) => {
    console.log(parameter);
    console.log("wompiResponse called");
    try {
      console.log(parameter.data);
      const transaction = parameter.data.transaction;
      let checksum =
        transaction.id +
        transaction.status +
        transaction.amount_in_cents +
        parameter.timestamp +
        process.env.WOMPI_EVENTS_KEY;
      let hashedCheckSum = createHash("sha256").update(checksum).digest("hex");
      if (hashedCheckSum === parameter.signature.checksum) {
        console.log("Hash equals");
        if (transaction.reference.includes("production")) {
          let now = moment().tz("America/Bogota");
          let recip = {
            hqId: transaction.customer_data.hqId,
            phone: transaction.customer_data.phone,
            email: transaction.customer_data.email,
            total: transaction.amount_in_cents,
            vehicleType: transaction.customer_data.vehicleType,
            paymentType: "wompi",
            dateFactued: now.toDate(),
            dateStart: moment({
              year: now.year(),
              month: now.month(),
              day: 5,
              hour: 0,
              minute: 0,
              second: 0,
            })
              .tz("America/Bogota")
              .toDate(),
            dateFinished: moment({
              year: now.year(),
              month: now.month() + 1,
              day: 4,
              hour: 23,
              minute: 59,
              second: 59,
              millisecond: 59,
            })
              .tz("America/Bogota")
              .toDate(),
          };
          db.collection("recips")
            .add(recip)
            .then((recipRef) => {
              console.log(recipRef);
              resolve({
                response: 1,
                message: `Recip added successfuly`,
              });
            });
        } else {
          console.log("else");
          if (transaction.status === "REJECTED") {
            reject("REJECTED");
            return;
          }
          const db = admin.firestore();
          console.log("Searching for recip");
          db.collection("recips")
            .doc(String(transaction.reference))
            .update({
              status: "payed",
              change: 0,
              cash: 0,
              paymentType: "wompi",
              email: transaction.customer_email,
              datePayed: new Date(),
            })
            .then(async () => {
              const recip = await db.collection("recips").doc(String(transaction.reference)).get();
              console.log(recip.data());
              db.collection("mensualities")
                .where(
                  "userPhone",
                  "==",
                  transaction.customer_data.phone_number
                )
                .where("hqId", "==", recip.data().hqId)
                .get()
                .then((snapshot) => {
                  console.log("Finished finsing monthly payment");
                  if (snapshot.empty) {
                    console.log("No monthly payment found");
                    reject("No monthly payment found");
                    return;
                  }
                  const doc = snapshot.docs[0];
                  console.log(doc)
                  db.collection("mensualities")
                    .doc(doc.id)
                    .update({
                      status: transaction.status,
                      paymentType: "wompi",
                      datePayed: new Date(),
                    })
                    .then(() => {
                      resolve({
                        response: 1,
                        message: "Wompi transaction stored succesfuly",
                      });
                      return;
                    })
                    .catch((err) => {
                      console.log("Error updating document: ", err);
                      reject({
                        response: -1,
                        message: "Wompi transaction rejected",
                      });
                      return;
                    });
                });
            });
        }
      } else {
        console.log("Checksum does not match");
        reject({ response: -1, err: "Checksum does not match" });
      }
    } catch (err) {
      console.log(err);
      reject({ response: 0, err });
    }
  });
};

module.exports.wompiRequestPaymentURL = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (!parameter.total || parameter.total < 20000) {
        reject({
          response: -1,
          err: "Total must be set and it has to be at least 20.000 COP",
        });
        return;
      }
      const authorization = `Bearer ${process.env.WOMPI_SECRET_PRV}`;
      axios
        .post(
          `${process.env.WOMPI_API}/payment_links`,
          {
            name: parameter.name,
            description: parameter.description,
            single_use: false,
            collect_shipping: false,
            currency: "COP",
            amount_in_cents: parameter.total,
            sku: parameter.hqId,
            customer_data: {
              customer_references: [
                {
                  vehicle_type: parameter.vehicleType,
                  hqId: parameter.hqId,
                },
              ],
            },
            payment_source_id: parameter.hqId,
          },
          {
            headers: {
              Authorization: authorization,
            },
          }
        )
        .then((wompiResponse) => {
          let id = wompiResponse.data.data.id;
          console.log(id);
          resolve({
            response: 1,
            message: `Link generated successfuly`,
            link: `https://checkout.wompi.co/l/${id}`,
          });
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    } catch (err) {
      // console.log(err)
      console.log(process.env.WOMPI_SECRET_PRV);
      reject(err);
    }
  });
};
