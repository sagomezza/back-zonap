const admin = require("firebase-admin");

module.exports.createOfficial = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) {
                reject({ response: -1, message: `Error: Empty object` });
                return;
            }
            if (!parameter.email) {
                reject({ response: -1, message: `Missing data: email` });
                return;
            }
            if (!parameter.phone) {
                reject({ response: -1, message: `Missing data: phone` });
                return;
            }
            //if (!parameter.password) { reject({ response: -1, message: `Missing data: password` }); return }
            if (!parameter.name) {
                reject({ response: -1, message: `Missing data: name` });
            }
            if (!parameter.lastName) {
                reject({ response: -1, message: `Missing data: lastname` });
                return;
            }
            if (!parameter.expoToken) {
                reject({ response: -1, message: `Missing data: expoToken` });
                return;
            }
            if (!parameter.createdBy) {
                reject({ response: -1, message: `Missing data: createdBy` });
                return;
            }
            if (!parameter.nid) {
                reject({ response: -1, message: `Missing data: nid` });
                return;
            }
            //if (!parameter.schedule) parameter.schedule = {};

            Object.assign(parameter, {
                creationDate: admin.firestore.Timestamp.fromDate(new Date()),
                hq: [],
            });
            // let password = parameter.password
            // delete parameter.password
            const db = admin.firestore();
            const response = await db.collection("officials").add(parameter);

            //uid: phone
            const response2 = await admin.auth().createUser({
                email: parameter.email,
                emailVerified: true,
                password: process.env.DEFAULTPASSWORD,
                displayName: parameter.name + " " + parameter.lastName,
                photoURL:
                    "https://cdn0.iconfinder.com/data/icons/elasto-online-store/26/00-ELASTOFONT-STORE-READY_user-circle-512.png",
                disabled: false,
                uid: response.id,
            });
            resolve({
                response: 1,
                message: `Official created succesfully`,
                id: response.id,
            });
        } catch (err) {
            console.log(err);
            reject({ response: 0, err });
            return;
        }
    });
};

module.exports.readOfficial = (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (Object.values(parameter).length === 0) {
                reject({ response: -1, message: `Error: Empty object` });
                return;
            }
            if (!parameter.email) {
                reject({ response: -1, message: `Missing data: email` });
                return;
            }
            const db = admin.firestore();
            let userRef = db.collection("officials");
            let query = userRef
                .where("email", "==", parameter.email)
                .get()
                .then((snapshot) => {
                    if (snapshot.empty) {
                        reject({ response: -1, message: `Official not found` });
                        return;
                    }
                    snapshot.forEach((doc) => {
                        let data = doc.data();
                        data.id = doc.id;

                        if (
                            data &&
                            data.schedule.start &&
                            data.schedule.start.nanoseconds
                        )
                            data.schedule.start = data.schedule.start.toDate();
                        else data.schedule.start = data.schedule.start;
                        if (
                            data &&
                            data.schedule.end &&
                            data.schedule.end.nanoseconds
                        )
                            data.schedule.end = data.schedule.end.toDate();
                        else data.schedule.end = data.schedule.end;
                        resolve({
                            response: 1,
                            message: `Official found succesfully`,
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

module.exports.editOfficial = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            let data = {};
            console.log(parameter);
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
            console.log(data);
            const db = admin.firestore();
            let userRef = db.collection("officials").doc(parameter.id);
            await userRef.update(data);
            resolve({ response: 1, message: `Official updated succesfully` });
        } catch (err) {
            console.log("Error getting documents", err);
            reject({ response: 0, err });
            return;
        }
    });
};

module.exports.changePassword = async (parameter) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await admin.auth().getUserByEmail(parameter.email);
            admin
                .auth()
                .updateUser(user.uid, { password: parameter.password })
                .then(function (userRecord) {
                    // See the UserRecord reference doc for the contents of userRecord.
                    console.log(
                        "Successfully updated user",
                        userRecord.toJSON()
                    );
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
