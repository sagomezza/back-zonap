const admin = require("firebase-admin");
const voucher_codes = require("voucher-code-generator");
const userCrud = require("../users/crud");
const hqCrud = require("../headquarters/crud");
//Contant Strings

module.exports.checkCoupon = (coupon) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(coupon).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!coupon.coupon) {
        reject({ response: -1, message: `Error:missing parameter coupon` });
        return;
      }
      const db = admin.firestore();
      db.collection("coupons")
        .doc(String(coupon.coupon))
        .get()
        .then((doc) => {
          try {
            let data = doc.data();
            console.log(data);
            if (!data) {
              resolve({
                response: -3,
                message: `Coupon doesn't exist.`,
              });
              return;
            }
            if (coupon.phone && doc.isValid) {
              let hasUserClaimed = data.claimedBy.find(
                (o) => o.claimedBy === coupon.phone
              );
              if (hasUserClaimed) {
                resolve({
                  response: 2,
                  message: `Coupon already exists, it is valid and user already claimed it.`,
                  data: data,
                });
              } else {
                resolve({
                  response: 1,
                  message: `Coupon already exists and user hasn't claimed it yet`,
                  data: data,
                });
              }
            } else if (!data.isValid) {
              resolve({
                response: -2,
                message: `Coupon already exists and it's not valid.`,
                data: data,
              });
            } else {
              resolve({
                response: 1,
                message: `Coupon found`,
                data: data,
              });
            }
          } catch (err) {
            console.log(err);
            reject({
              response: 0,
              message: `Something went wrong`,
              err: err,
            });
          }
        })
        .catch((err) => {
          console.log(err);
          resolve({
            response: -3,
            message: `Coupon doesn't exist.`,
          });
        });
    } catch (err) {
      console.log(err);
      resolve({
        response: -3,
        message: `Coupon doesn't exist.`,
      });
    }
  });
};

/**
 * @param parameter.type - It can be one of these: support, influencer, agreement
 */
module.exports.createCoupon = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!parameter.createdBy) {
        reject({ response: -1, message: `Error:missing parameter createdBy` });
        return;
      }
      if (!parameter.value) {
        reject({ response: -1, message: `Error:missing parameter value` });
        return;
      }
      if (!parameter.expireDate) {
        reject({ response: -1, message: `Error:missing parameter expireDate` });
        return;
      }
      if (!parameter.startDate) {
        reject({ response: -1, message: `Error:missing parameter startDate` });
        return;
      }
      if (!parameter.type) {
        reject({ response: -1, message: `Error:missing parameter type` });
        return;
      }
      if (!parameter.promotionType) {
        reject({
          response: -1,
          message: `Error:missing parameter promotionType`,
        });
        return;
      }
      if (!("renewable" in parameter)) {
        reject({
          response: -1,
          message: `Error:missing parameter renewable`,
        });
        return;
      }

      const db = admin.firestore();
      if (parameter.maxUsers && typeof parameter.maxUsers !== "number") {
        reject({
          response: -1,
          message: "maxUser was specified but is non-numerical",
        });
        return;
      } else if (parameter.maxUsers && !Number.isInteger(parameter.maxUsers)) {
        reject({
          response: -1,
          message: "maxUser was specified but is not an integer",
        });
        return;
      } else if (!parameter.maxUsers) parameter.maxUsers = 1;
      if (!parameter.coupon || parameter.coupon === "") {
        coupon = voucher_codes.generate({
          length: 6,
          count: 1,
        });
        parameter.coupon = coupon[0];
      }
      console.log(parameter);
      this.checkCoupon({ coupon: coupon })
        .then(async (result) => {
          try {
            if (result.response === -3) {
              hqCrud
                .readHq({ id: parameter.hqId })
                .then(async (hq) => {
                  await db
                    .collection("coupons")
                    .doc(parameter.coupon)
                    .set({
                      isValid: true,
                      createdBy: parameter.createdBy,
                      value: parameter.value,
                      creationDate: new Date(),
                      startDate: parameter.startDate
                        ? new Date(parameter.startDate)
                        : new Date(),
                      expireDate: new Date(parameter.expireDate),
                      claimedBy: parameter.claimedBy ?? [],
                      type: parameter.type,
                      renewable: parameter.renewable,
                      maxUsers: parameter.maxUsers,
                      promotionType: parameter.promotionType,
                      hqId: parameter.hqId,
                    });
                  // if (parameter.type === "support") {
                  //   let record = {
                  //     type: "marketing",
                  //     logMessage: `El héroe de soporte ${parameter.createdBy} ha generado un cupón por $${parameter.value}.`,
                  //     date: new Date(),
                  //   };
                  //   recordsUtils.addRecord(record);
                  // } else {
                  //   let record = {
                  //     type: "marketing",
                  //     logMessage: `El usuario ${parameter.createdBy} ha generado un cupón por $${parameter.value}.`,
                  //     date: new Date(),
                  //   };
                  //   recordsUtils.addRecord(record);
                  // }
                  resolve({
                    response: 1,
                    message: `Coupon created succesfuly`,
                    coupon: coupon,
                  });
                })
                .catch((err) => {
                  console.log(err);
                  reject(err);
                });
            } else {
              reject(result);
            }
          } catch (err) {
            console.log(err);
            reject({
              response: 0,
              message: `Something went wrong`,
              err: err,
            });
          }
        })
        .catch((err) => {
          console.log(err);
          reject({
            response: 0,
            message: `Something went wrong`,
            err: err,
          });
        });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

module.exports.deleteCoupon = (parameter) => {
  return new Promise(async (resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!("coupon" in parameter)) {
      reject({
        response: -1,
        message: `Error:missing parameter coupon`,
      });
      return;
    }
    // if (!parameter.user) {
    //   reject({
    //     response: 0,
    //     message: "No user provided",
    //   });
    // }
    try {
      const db = admin.firestore();
      await db.collection("coupons").doc(parameter.coupon).delete();
      //   let record = {
      //     type: "marketing",
      //     logMessage: `The user ${parameter.user} delete the coupon ${parameter.coupon}`,
      //     date: new Date(),
      //   };
      //   recordsUtils.addRecord(record);
      resolve({
        response: 1,
        message: `Deleted coupon`,
      });
    } catch (err) {
      console.log(err);
      reject({
        response: 0,
        message: `Something went wrong`,
        err: err,
      });
    }
  });
};

module.exports.claimCoupon = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!("coupon" in parameter)) {
      reject({
        response: -1,
        message: `Error:missing parameter coupon`,
      });
      return;
    }
    if (!("claimedBy" in parameter)) {
      reject({
        response: -1,
        message: `Error:missing parameter claimedBy`,
      });
      return;
    }
    userCrud
      .readUser({ phone: parameter.claimedBy })
      .then((resultUser) => {
        try {
          const db = admin.firestore();
          this.checkCoupon({
            coupon: parameter.coupon,
            phone: parameter.claimedBy,
          })
            .then(async (couponResult) => {
              if (couponResult.response === 1) {
                let isValid = true;
                if (couponResult.data.type === "agreement") {
                  if (couponResult.data.claimedBy.length > 0) {
                    if (
                      couponResult.data.claimedBy.includes(parameter.claimedBy)
                    ) {
                      reject({response: -5, message: "Coupon already claimed"});
                    } else if (
                      couponResult.data.claimedBy.length >
                      couponResult.data.maxUsers
                    ) {
                      reject({
                        response: -4,
                        message:
                          "This coupon is not valid. It reached its max allowed users limit",
                      });
                      return;
                    } else if (
                      couponResult.data.claimedBy.length ===
                      couponResult.data.maxUsers - 1
                    ) {
                      isValid = false;
                    }
                  }
                } else {
                  isValid = false;
                }
                await db
                  .collection("coupons")
                  .doc(parameter.coupon)
                  .update({
                    isValid,
                    claimedBy: admin.firestore.FieldValue.arrayUnion(
                      parameter.claimedBy
                    ),
                    maxUsers: admin.firestore.FieldValue.increment(-1),
                  });
                resolve({
                  response: 1,
                  message: `The user ${parameter.claimedBy} claimed succesfuly the coupon ${parameter.coupon}`,
                  value: couponResult.data.value,
                });
              } else {
                reject(couponResult);
                return;
              }
            })
            .catch((err) => {
              console.log(err);
              reject(err);
            });
        } catch (err) {
          console.log(err);
          reject({
            response: 0,
            message: `Something went wrong`,
            err: err,
          });
        }
      })
      .catch((err) => reject(err));
  });
};

module.exports.findValidCoupons = () => {
  return new Promise((resolve, reject) => {
    const db = admin.firestore();
    db.collection("coupons")
      .where({ isValid: true })
      .get()
      .then((snapshot) => {
        if (snapshot.size === 0)
          reject({
            response: -1,
            message: `There are no valid coupons at the moment`,
          });
        else {
          let coupons = [];
          snapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            coupons.push(data);
          });
          resolve({ respone: 1, coupons: coupons });
        }
      });
  });
};

module.exports.expireCoupon = (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (Object.values(parameter).length === 0) {
        reject({ response: -1, message: `Error: Empty object` });
        return;
      }
      if (!("coupon" in parameter)) {
        reject({
          response: -1,
          message: `Error:missing parameter coupon`,
        });
        return;
      }
      const db = admin.firestore();
      await db
        .collection("coupons")
        .doc(parameter.coupon)
        .update({ isValid: false });
      resolve({ response: 1, message: `Coupon expired` });
    } catch (err) {
      console.log(err);
      reject({
        response: 0,
        message: `Something went wrong`,
        err: err,
      });
    }
  });
};

module.exports.getUserCoupons = (parameter) => {
  return new Promise((resolve, reject) => {
    if (Object.values(parameter).length === 0) {
      reject({ response: -1, message: `Error: Empty object` });
      return;
    }
    if (!("phone" in parameter)) {
      reject({
        response: -1,
        message: `Error: missing parameter phone`,
      });
      return;
    }
    const db = admin.firestore();
    db.collection("coupons")
      .where("claimedBy", "array-contains", parameter.phone)
      .where("isValid", "==", true)
      .get()
      .then(async (snapshot) => {
        if (snapshot.empty) {
          resolve({ response: 2, message: `No coupons found` });
          return;
        }
        let coupons = [];
        let ids = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.id = doc.id;
          if (parameter.couponType) {
            if (data.type === parameter.couponType) {
              ids.push(data.id);
              coupons.push(data);
            }
          } else if (parameter.promotionType) {
            if (data.promotionType === parameter.promotionType) {
              ids.push(data.id);
              coupons.push(data);
            }
          } else {
            ids.push(data.id);
            coupons.push(data);
          }
        });
        resolve({ response: 1, coupons: coupons, ids: ids });
      });
  });
};
