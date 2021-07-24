const admin = require("firebase-admin");
const mensualityCrud = require("./mensualityCrud");
const moment = require("moment-timezone");
const blCrud = require("../headquarters/blackList");
const fs = require("fs");

module.exports.createUser = async (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (parameter.type === "full") {
        // if (!parameter.email) { reject({ response: -1, message: `Missing data: email` }); return }
        // if (!parameter.phone) { reject({ response: -1, message: `Missing data: phone` }); return }
        // if (!parameter.name) { reject({ response: -1, message: `Missing data: name` }); return }
        // if (!parameter.lastName) { reject({ response: -1, message: `Missing data: lastname` }); return }
        // if (!parameter.expoToken) { reject({ response: -1, message: `Missing data: expoToken` }); return }
        let cars = [];
        if (parameter.plate) {
          parameter.plates = [parameter.plate];
          delete parameter.plate;
        }
        if (parameter.plates) {
          parameter.plates.map((plate) =>
            cars.push({ plate: plate, brand: parameter.brand })
          );
          delete parameter.brand;
        }

        Object.assign(parameter, {
          acceptanceTerms: true,
          acceptanceDate: moment().tz("America/Bogota").toDate(),
          leancoreId: "",
          stage: "full",
          payments: {
            cards: [],
          },
          cars: cars,
          plates: parameter.plates ? parameter.plates : [],
          analytics: {
            creationDate: moment().tz("America/Bogota").toDate(),
          },
          isMonthlyUser: parameter.monthlyUser ? parameter.monthlyUser : false,
          balance: 0
        });
        if (parameter.monthlyUser) {
          delete parameter.monthlyUser;
          if (!parameter.hqId) {
            reject({ response: -1, message: `Missing data: hqId` });
            return;
          }
          if (!parameter.mensualityType) {
            reject({ response: -1, message: `Missing data: mensualityType` });
            return;
          }
        }
      } else {
        if (!parameter.phone) {
          reject({ response: -1, message: `Missing data: phone` });
          return;
        }
        Object.assign(parameter, {
          leancoreId: "",
          stage: "starter",
          email: "",
          name: "",
          lastName: "",
          payments: {
            cards: [],
          },
          analytics: {
            creationDate: moment().tz("America/Bogota").toDate(),
          },
          cars: parameter.plate ? [{ plate: parameter.plate, brand: "" }] : [],
          plates: parameter.plate ? [parameter.plate] : [],
          isMonthlyUser: parameter.monthlyUser ? parameter.monthlyUser : false,
          balance: 0
        });
        delete parameter.plate;
      }
      if (parameter.phone) {
        let hasMensuality = null;
        try {
          if (
            parameter.plates &&
            parameter.plates.length &&
            parameter.plates.length > 0
          )
            hasMensuality = await mensualityCrud.findMensualityPlate({
              plate: parameter.plates[0],
            });
        } catch (err) {
          //console.log(err)
        }
        const db = admin.firestore();
        let userRef = db.collection("users");
        let query = userRef
          .where("phone", "==", parameter.phone)
          .get()
          .then(async (snapshot) => {
            try {
              if (snapshot.empty) {
                if (parameter.isMonthlyUser) {
                  const response = await db.collection("users").add({
                    name: parameter.name,
                    lastName: parameter.lastName,
                    email: parameter.email,
                    phone: parameter.phone,
                    plates: parameter.plates,
                    cars: parameter.cars,
                    expoToken: parameter.expoToken,
                    leancoreId: "",
                    payments: parameter.payments,
                    analytics: parameter.analytics,
                    isMonthlyUser: parameter.isMonthlyUser,
                    stage: parameter.stage,
                  });
                  console.log("mensuality case");
                  let data = {
                    type: "personal",
                    capacity: parameter.capacity,
                    userPhone: parameter.phone,
                    plates: parameter.plates ? parameter.plates : [],
                    hqId: parameter.hqId,
                    userId: response.id,
                    mensualityType: parameter.mensualityType,
                    officialEmail: parameter.officialEmail,
                    vehicleType: parameter.vehicleType,
                    cash: parameter.cash,
                    change: parameter.change,
                    generateRecip: parameter.generateRecip,
                    pending: parameter.pending,
                  };
                  console.log(data);
                  mensualityCrud
                    .createMensuality(data)
                    .then(async (resultMen) => {
                      resolve({
                        response: 1,
                        message: `User created succesfully`,
                        id: response.id,
                      });
                      return;
                    })
                    .catch((err) => {
                      console.log(err);
                      reject(err);
                    });
                } else {
                  const response = await db.collection("users").add(parameter);
                  if (hasMensuality && hasMensuality.response === 1) {
                    parameter.isMonthlyUser = true;
                    parameter.mensuality = hasMensuality.data[0].id;
                    await db.collection("users").doc(response.id).update({
                      isMonthlyUser: true,
                      mensuality: hasMensuality.data[0].id,
                    });
                    resolve({
                      response: 1,
                      message: `User created succesfully`,
                      id: response.id,
                    });
                  } else {
                    resolve({
                      response: 1,
                      message: `User created succesfully`,
                      id: response.id,
                    });
                    return;
                  }
                }
              } else {
                snapshot.forEach(async (doc) => {
                  let user = await db.collection("users").doc(doc.id);
                  user
                    .get()
                    .then(async (result) => {
                      try {
                        if (
                          result.data().plates.includes(parameter.plates[0]) ||
                          parameter.plates.length === 0
                        ) {
                          reject({
                            response: -1,
                            message:
                              "User already exists and there was no new info to update",
                          });
                          return;
                        } else {
                          await user.update({
                            plates: admin.firestore.FieldValue.arrayUnion(
                              parameter.plates[0]
                            ),
                          });
                          resolve({
                            response: 2,
                            message: `User already exists but added the new plate to the profile`,
                          });
                        }
                      } catch (err) {
                        console.log(err);
                        reject(err);
                      }
                    })
                    .catch((err) => {
                      console.log(err);
                      reject(err);
                    });
                });
              }
            } catch (err) {
              console.log(err);
              reject(err);
            }
          });
      } else {
        const db = admin.firestore();
        const response = await db.collection("users").add(parameter);
        resolve({ response: 1, message: `User created succesfully` });
        return;
      }
    } catch (err) {
      console.log(err);
      reject({ response: 0, err });
      return;
    }
  });
};

module.exports.readUser = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.phone) {
        reject({ response: -1, message: `Missing data: phone` });
        return;
      }
      const db = admin.firestore();
      let userRef = db.collection("users");
      let query = userRef
        .where("phone", "==", parameter.phone)
        .get()
        .then((snapshot) => {
          if (snapshot.empty) {
            reject({ response: -1, message: `User not found` });
            return;
          }
          snapshot.forEach(async (doc) => {
            let data = doc.data();
            data.id = doc.id;
            resolve({
              response: 1,
              message: `User found succesfully`,
              data: data,
            });
          });
        })
        .catch((err) => {
          console.log("Error getting documents", err);
          reject({ response: 0, err });
          return;
        });
    } catch (err) {
      console.log("Error getting documents", err);
      reject({ response: 0, err });
      return;
    }
  });
};

module.exports.editUser = async (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = {};
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.id) {
        reject({ response: -1, message: `Missing data: id` });
        return;
      }
      if (parameter.phone) data.phone = parameter.phone;
      if (parameter.email) data.email = parameter.email;
      if (parameter.name) data.name = parameter.name;
      if (parameter.lastName) data.lastName = parameter.lastName;
      if (parameter.expoToken) data.expoToken = parameter.expoToken;
      if (parameter.plate)
        data.plates = admin.firestore.FieldValue.arrayUnion(parameter.plate);
      if (parameter.nid)
        data.plate = admin.firestore.FieldValue.arrayUnion(parameter.nid);
      if (parameter.cars)
        data.cars = admin.firestore.FieldValue.arrayUnion(parameter.cars);
      if (parameter.type) data.type = parameter.type;
      if (Object.values(data).length === 0) {
        reject({ response: -1, message: `Error: Bad parameters` });
        return;
      }
      const db = admin.firestore();
      let userRef = db.collection("users").doc(parameter.id);
      await userRef.update(data);
      resolve({ response: 1, message: `User updated succesfully` });
    } catch (err) {
      console.log("Error getting documents", err);
      reject({ response: 0, err });
      return;
    }
  });
};

module.exports.findUserByPlate = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.plate) {
      reject({ response: -1, message: `Missing data: plate` });
      return;
    }
    const db = admin.firestore();
    let userRef = db.collection("users");
    let query = userRef
      .where("plates", "array-contains", parameter.plate)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          reject({ response: -1, message: `User not found` });
          return;
        }
        blCrud
          .blackListForPlate({ plate: parameter.plate })
          .then((blRes) => {
            let users = [];
            let fullData = [];
            snapshot.forEach((doc) => {
              let data = doc.data();
              users.push(data.phone);
              if (parameter.type === "full") {
                data.id = doc.id;
                fullData.push(data);
              }
            });
            resolve({
              response: 1,
              message: `User found succesfully`,
              data: users,
              blackList: blRes.data,
              fullData,
            });
          })
          .catch((err) => {
            if (err.response && err.response === -2) {
              let users = [];
              let fullData = [];
              snapshot.forEach((doc) => {
                let data = doc.data();
                users.push(data.phone);
                if (parameter.type === "full") {
                  data.id = doc.id;
                  fullData.push(data);
                }
              });
              resolve({
                response: 1,
                message: `User found succesfully`,
                data: users,
                fullData,
              });
            } else reject(err);
          });
      })
      .catch((err) => {
        console.log("Error getting documents", err);
        reject({ response: 0, err });
        return;
      });
  });
};

module.exports.changeUserPhoneNumber = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!parameter.uid) {
      reject({ response: -1, message: `Missing data: uid` });
      return;
    }

    try {
      admin
        .auth()
        .updateUser(parameter.uid, { phoneNumber: parameter.phoneNumber })
        .then(function (userRecord) {
          // See the UserRecord reference doc for the contents of userRecord.
          console.log("Successfully updated user", userRecord.toJSON());
          resolve({
            response: 1,
            message: "Successfully updated user",
          });
        })
        .catch(function (error) {
          console.log("Error updating user:", error);
        });
    } catch (err) {
      console.log("Error changing password", err);
      reject({ response: 0, err });
      return;
    }
  });
};

module.exports.deleteVehicle = async (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.userId) {
        reject({ response: -1, message: `Error:missing parameter userId` });
        return;
      }
      if (!parameter.plate) {
        reject({ response: -1, message: `Error:missing parameter plate` });
        return;
      }
      const db = admin.firestore();
      let userRef = db.collection("users").doc(parameter.userId);
      let query = userRef
        .get()
        .then(async (doc) => {
          if (!doc.exists) {
            console.log("No such document!");
            reject({ response: -1, err: "No such document!" });
            return;
          }
          let cars = doc.data().cars;
          let plates = doc.data().plates;
          await userRef.update({
            cars: cars.filter((car) => car.plate !== parameter.plate),
          });
          await userRef.update({
            plates: plates.filter((plate) => plate !== parameter.plate),
          });
          resolve({ response: 1, message: `Vehicle was removed succesfully` });
        })
        .catch((err) => {
          console.log("Error getting documents", err);
          reject({ response: 0, err });
          return;
        });
    } catch (err) {
      console.log("Error deleteVehicle", err);
      reject({ response: 0, err: JSON.stringify(err, 2) });
      return;
    }
  });
};

module.exports.updateVehicle = async (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.userId) {
        reject({ response: -1, message: `Error:missing parameter userId` });
        return;
      }
      //if (!parameter.vehicleIndex) { reject({ response: -1, message: `Error:missing parameter vehiceIndex` }); return }
      const db = admin.firestore();
      let userRef = db.collection("users").doc(parameter.userId);
      let query = userRef
        .get()
        .then(async (doc) => {
          if (!doc.exists) {
            console.log("No such document!");
            reject({ response: -1, err: "No such document!" });
            return;
          }
          let cars = doc.data().cars;
          let plates = doc.data().plates;
          cars[parameter.vehicleIndex] = {
            plate: parameter.plate,
            brand: parameter.brand,
          };
          plates[parameter.vehicleIndex] = parameter.plate;
          await userRef.update({
            cars: cars,
            plates: plates,
          });
          resolve({ response: 1, message: `Vehicle was updated succesfully` });
        })
        .catch((err) => {
          console.log("Error getting documents", err);
          reject({ response: 0, err });
          return;
        });
    } catch (err) {
      console.log("Error deleteVehicle", err);
      reject({ response: 0, err: JSON.stringify(err, 2) });
      return;
    }
  });
};

module.exports.getUserRecips = async (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.phone) {
        reject({ response: -1, message: `Error:missing parameter phone` });
        return;
      }
      const db = admin.firestore();
      let recipRef = db.collection("recips");
      recipRef
        .where("phone", "==", parameter.phone)
        .get()
        .then(async (snapshot) => {
          try {
            if (snapshot.empty) {
              reject({ response: -1, message: `Recips not found` });
              return;
            }
            let recips = [];
            if (!snapshot.empty) {
              snapshot.forEach((doc) => {
                let recipData = doc.data();
                if (!recipData.mensuality && !recipData.prepayFullDay) {
                  recipData.id = doc.id;
                  recips.push(recipData);
                }
              });
            }
            resolve({
              response: 1,
              message: `Recips found`,
              data: recips,
            });
          } catch (err) {
            console.log("Error getting user recips", err);
            reject({ response: -2, err: JSON.stringify(err, 2) });
            return;
          }
        });
    } catch (err) {
      console.log("Error getting user recips", err);
      reject({ response: 0, err: JSON.stringify(err, 2) });
      return;
    }
  });
};

module.exports.bulkUsers = (parameter) => {
    return new Promise(async (resolve, reject) => {
        
    })
}

// module.exports.getUsers = async (parameter) => {
//     return new Promise (async (resolve, reject) => {
//         try {
//             const db = admin.firestore();
//             let userRef = db.collection('users').size()
//             console.log(userRef)
//         } catch (err) {
//             console.log('Error fetching recips');
//             reject({ response: 0, err: JSON.stringify(err, 2)});
//             return
//         }
//     })
// }

// module.exports.countMensualities = () => {
//     return new Promise ((resolve, reject)=> {
//         const db = admin.firestore();
//         db.collection("mensualities")
//         .where("status", "==", "active")
//         .get()
//         .then(snapshot => {
//             let cars= 0
//             let bikes = 0
//             snapshot.forEach(doc=> {
//                 let data = doc.data()
//                 if(data.vehicleType === "car") cars += Number(data.capacity)
//                 else bikes += Number(data.capacity)
//             })
//             console.log(cars, bikes)
//         })
//     })
// }

//  module.exports.usersCount = () => {
//      return new Promise((resolve, reject)=> {
//         const db = admin.firestore();
//         db.collection("users").get().then(snapshot => {
//             let users = `Nombre,celular, ${"\n"}`
//             console.log("dfnnsdgj")
//             console.log(snapshot.size)
//             // snapshot.forEach(doc => {
//             //     let data = doc.data()
//             //     users +=  `${data.name && data.name !== '' ? data.name + ' ' + data.lastName : 'No registrado'}, ${data.phone} ${"\n"}`
//             // })
//             // fs.writeFileSync('data.csv', users.toString())
//         })
//      })
//  }

module.exports.migrateBalance = () => {
    return new Promise((resolve, reject)=>{
        const db = admin.firestore();
        db.collection("users").get().then(snapshot => {
            let promises = [];
            snapshot.forEach(async doc => {
               promises.push( await db.collection("users").doc(doc.id).update({balance: 0}))
            });
            let results = Promise.all(promises)
            results.then(result => {
                resolve({message: "done", result})
            })
            .catch(err => reject(err))
        });
    })
}