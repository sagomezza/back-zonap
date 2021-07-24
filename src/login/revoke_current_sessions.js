const admin = require("firebase-admin");

module.exports.revoke_current_sessions = function (params) {
  const { uid, deviceId } = params;
  return new Promise((resolve, reject) => {
    try {
      console.log(uid);
      if (!uid) {
        console.log("uid was not provided!");
        reject({ response: -1, message: "uid was not provided!" });
        return;
      }
      if (!deviceId) {
        console.log("deviceId was not provided!");
        reject({ response: -1, message: "deviceId was not provided!" });
        return;
      }
      admin
        .auth()
        .revokeRefreshTokens(uid)
        .then(() => {
          admin
            .auth()
            .getUser(uid)
            .then((user) => {
              admin
                .firestore()
                .collection("officials")
                .where("email", "==", user.email)
                .get()
                .then((snapshot) => {
                  snapshot.forEach((doc) => {
                    console.log("DOC ID ", doc.id);
                    admin
                      .firestore()
                      .collection("officials")
                      .doc(doc.id)
                      .update({
                        sessionInfo: {
                          previous:
                            doc.data().sessionInfo !== undefined
                              ? doc.data().sessionInfo.actual
                              : null,
                          actual: deviceId,
                        },
                      })
                      .then(() => console.log("UPDATED"))
                      .catch((error) => console.log("ERROR ", error));
                  });
                });
            });
          return admin.auth().getUser(uid);
        })
        .then((userRecord) => {
          return new Date(userRecord.tokensValidAfterTime).getTime() / 1000;
        })
        .then((timestamp) => {
          //return valid response to ios app to continue the user's login process
          resolve({ response: 1, message: "Revoked sessions" });
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};
