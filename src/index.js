const express = require("express");
let path = require("path");
const admin = require("firebase-admin");
var cron = require("node-cron");

require("dotenv").config({ path: path.resolve(__dirname + "/.env") });

const auth = require("./leancore/token");
const create_user = require("./login/create_user");
const requestOneTimePassword = require("./login/request_one_time_password");
const verifyOneTimePassword = require("./login/verify_one_time_password");

const adminCrud = require("./admins/crud");
const userCrud = require("./users/crud");
const officialCrud = require("./official/crud");
const corporationCrud = require("./corporations/crud");
const headquarterCrud = require("./headquarters/crud");
const parkCrud = require("./parks/crud");
const officialManager = require("./headquarters/officialManager");
const parkingManager = require("./headquarters/parkingManager");
const creditCardController = require("./payment/creditCard");
const stripeController = require("./payment/stripeController");
const qrController = require("./qr");
const qrGenerator = require("./qr/genQr");
const hqManager = require("./corporations/hqManager");
const reservationManager = require("./headquarters/reservationManager");
const recips = require("./payment/recips");
const pay = require("./payment/pay");
const paranoicsCrud = require("./users/paranoicsCrud");
const shiftManager = require("./official/shift");
const push = require("./notifications");
const crons = require("./cron");
const mensualityCrud = require("./users/mensualityCrud");
const blackListCrud = require("./headquarters/blackList");
const boxCrud = require("./official/boxClose");
const newsReport = require("./official/newsReport");
const revoke_current_sessions = require("./login/revoke_current_sessions");
const coupon = require("./promotions/coupons");

const app = express();

app.use(
  express.json({
    limit: "50mb",
  })
);

app.use(
  express.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With,X-HTTP-Method-Override,Content-Type,Accept,Authorization"
  );
  res.header("Access-Control-Allow-Origin: *");
  next();
});

if (process.env.ENVIRONMENT === "test") {
  const serviceAccount = require("./service_account_dev.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://zona-p-test.firebaseio.com",
  });
} else {
  const serviceAccount = require("./service_account_prod.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://bluspot-worker.firebaseio.com",
  });
}

admin.firestore().settings({
  ignoreUndefinedProperties: true,
});

//auth.authLeanCore()

// recips.migrateRecips().then(res=> console.log(res))
//    push.sendSMS()
//  recips.check().then(res=> console.log(res))
// shiftManager.migrateShift()
// .then()
// userCrud.usersCount()
// userCrud.countMensualities()
// reservationManager.migrateParkedList()
// recips.countTransactions()
// .then(res => console.log(res))

//recips.migratePrepayFullDay().then(res=> console.log(res))

// userCrud.migrateBalance()
// .then(result => console.log(result))
// .catch(err => console.log(err) )

var task = cron.schedule("*/3 * * * * *", function () {
  crons
    .endPrepayed()
    .then((res) => {
      //console.log(res)
    })
    .catch((err) => console.log(err));
});

var dailyTask = cron.schedule("0 5 6 * *", function () {
  crons
    .dueMensualities()
    .then((res) => {
      console.log(res);
    })
    .catch((err) => console.log(err));

  crons
    .pendingMensualities()
    .then((res) => {
      console.log(res);
    })
    .catch((err) => console.log(err));
});

task.start();
dailyTask.start();

let hashCache = {};

const recordIdempotency = (hash, response) => {
  if (hashCache[hash]) {
    return "Not Modified";
  }
  hashCache[hash] = response;
  return "hashed";
};

app.get("/", (req, res) => {
  res.send("I'm okay");
});

// ---------------------- USER LOGIN ---------------------------
app.post("/createLoginUser", (req, res) =>
  create_user.create_user(req, res)
);

app.post("/requestOneTimePassword", (req, res) =>
  requestOneTimePassword.request_one_time_password(req, res)
);

app.post("/verifyOneTimePassword", (req, res) =>
  verifyOneTimePassword.verify_one_time_password(req, res)
);

app.post("/revoke_current_sessions", (req, res) =>
  revoke_current_sessions(req.body, res)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- ADMIN CRUD ---------------------------
app.post("/createAdmin", (req, res) =>
  adminCrud
    .createAdmin(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/readAdmin", (req, res) =>
  adminCrud
    .readAdmin(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/editAdmin", (req, res) =>
  adminCrud
    .editAdmin(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- USER CRUD ---------------------------
app.post("/createUser", (req, res) =>
  userCrud
    .createUser(req.body)
    .then((result) => res.send(result))
    .catch((err) => {
      console.log(err);
      res.status(422).send(err);
    })
);

app.post("/bulkCreateUser", (req, res) =>
  userCrud
    .bulkCreateUser(req.body)
    .then((result) => res.send(result))
    .catch((err) => {
      console.log(err);
      res.status(422).send(err);
    })
);

app.post("/readUser", (req, res) =>
  userCrud
    .readUser(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/editUser", (req, res) =>
  userCrud
    .editUser(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/findUserByPlate", (req, res) =>
  userCrud
    .findUserByPlate(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/createParanoicUser", (req, res) =>
  paranoicsCrud
    .createParanoicUser(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/getParanoicsFromHq", (req, res) =>
  paranoicsCrud
    .getParanoicsFromHq(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/readParanoicUser", (req, res) =>
  paranoicsCrud
    .readParanoicUser(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/changeUserPhoneNumber", (req, res) =>
  userCrud
    .changeUserPhoneNumber(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/getUserRecips", (req, res) =>
  userCrud
    .getUserRecips(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- OFFICIAL CRUD ---------------------------
app.post("/createOfficial", (req, res) =>
  officialCrud
    .createOfficial(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/readOfficial", (req, res) =>
  officialCrud
    .readOfficial(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/editOfficial", (req, res) =>
  officialCrud
    .editOfficial(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/changePassword", (req, res) =>
  officialCrud
    .changePassword(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- CORPO CRUD ---------------------------
app.post("/createCorporation", (req, res) =>
  corporationCrud
    .createCorporation(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/readCorporation", (req, res) =>
  corporationCrud
    .readCorporation(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/editCorporation", (req, res) =>
  corporationCrud
    .editCorporation(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- HQ CRUD ---------------------------
app.post("/createHq", (req, res) =>
  headquarterCrud
    .createHq(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/readHq", (req, res) =>
  headquarterCrud
    .readHq(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/editHq", (req, res) =>
  headquarterCrud
    .editHq(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- PARK CRUD ---------------------------
app.post("/createPark", (req, res) =>
  parkCrud
    .createPark(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/readPark", (req, res) =>
  parkCrud
    .readPark(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/editPark", (req, res) =>
  parkCrud
    .editPark(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- ASSIGN  WORKER---------------------------
app.post("/assignWorker", (req, res) =>
  officialManager
    .assignWorker(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/unAssignWorker", (req, res) =>
  officialManager
    .unAssignWorker(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- MANAGER PARK ---------------------------
app.post("/assignPark", (req, res) =>
  parkingManager
    .assignPark(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/unAssignPark", (req, res) =>
  parkingManager
    .unAssignPark(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/getParkingData", (req, res) =>
  parkingManager
    .getParkingData(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- CREDIT CARD ---------------------------
app.post("/saveCreditCard", (req, res) =>
  creditCardController
    .saveCreditCard(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/deleteCreditCard", (req, res) =>
  creditCardController
    .deleteCreditCard(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/chargeUser", (req, res) =>
  stripeController
    .chargeUser(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- QR ---------------------------
app.post("/encryptQRCom", (req, res) =>
  qrController
    .encryptQRCom(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/findHash", (req, res) =>
  qrController
    .findHash(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/hashPoolId", (req, res) =>
  qrController
    .hashPoolId(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/hashSpotId", (req, res) =>
  qrController
    .hashSpotId(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/generateQrForHQ", (req, res) =>
  qrGenerator
    .generateQrForHQ(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/generateQrForParanoicUser", (req, res) =>
  qrGenerator
    .generateQrForParanoicUser(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- ASSIGN HQ---------------------------
app.post("/assignHq", (req, res) =>
  hqManager
    .assignHq(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);
app.post("/unAssignHq", (req, res) =>
  hqManager
    .unAssignHq(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- MANAGER RESERVATION---------------------------
app.post("/finishParking", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  reservationManager
    .finishParking(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});
app.post("/checkParking", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  reservationManager
    .checkParking(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});

app.post("/startParking", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  reservationManager
    .startParking(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});

app.post("/prepayFullDay", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  reservationManager
    .prepayFullDay(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});

app.post("/qrPay", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  reservationManager
    .qrPay(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});

app.post("/checkUserParkingTotal", (req, res) =>
  reservationManager
    .checkUserParkingTotal(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- RECIPS---------------------------
app.post("/createRecip", (req, res) =>
  recips
    .createRecip(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/getRecips", (req, res) =>
  recips
    .getRecips(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/readRecip", (req, res) =>
  recips
    .readRecip(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/getRecipsByPlate", (req, res) =>
  recips
    .getRecipsByPlate(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- PAY ---------------------------
app.post("/pay", (req, res) =>
  pay
    .pay(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- SHIFTS ---------------------------
app.post("/assignSchedule", (req, res) =>
  shiftManager
    .assignSchedule(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/unAssignSchedule", (req, res) =>
  shiftManager
    .unAssignSchedule(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/startShift", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  shiftManager
    .startShift(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      consolo.log(err);
      res.status(422).send(err);
    });
});

app.post("/markEndOfShift", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  shiftManager
    .markEndOfShift(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});

app.post("/getShiftRecips", (req, res) =>
  shiftManager
    .getShiftRecips(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/getShiftsOfBox", (req, res) =>
  shiftManager
    .getShiftsOfBox(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- PUSH ---------------------------
app.post("/sendPush", (req, res) =>
  push
    .sendPush(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- MENSUALITY ---------------------------
app.post("/createMensuality", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  mensualityCrud
    .createMensuality(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});

app.post("/readMensuality", (req, res) =>
  mensualityCrud
    .readMensuality(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/findMensualityPlate", (req, res) =>
  mensualityCrud
    .findMensualityPlate(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/editMensuality", (req, res) =>
  mensualityCrud
    .editMensuality(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/renewMensuality", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  mensualityCrud
    .renewMensuality(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});

// ---------------------- BLACKLIST ---------------------------
// app.post('/createBlackList', (req, res) =>
//     blackListCrud.createBlackList(req.body)
//         .then(result => res.send(result))
//         .catch(err => res.status(422).send(err))
// }));
app.post("/readBlackList", (req, res) =>
  blackListCrud
    .readBlackList(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/payDebts", (req, res) =>
  blackListCrud
    .payDebts(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// app.post('/blackListForPlate', (req, res) =>
//     blackListCrud.blackListForPlate(req.body)
//         .then(result => res.send(result))
//         .catch(err => res.status(422).send(err))
// }));

app.post("/listHQDebts", (req, res) =>
  blackListCrud
    .listHQDebts(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- BOX CLOSE ---------------------------
app.post("/createBoxReport", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  boxCrud
    .createBoxReport(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], err);
      console.log(err);
      res.status(422).send(err);
    });
});

app.post("/readBoxReport", (req, res) =>
  boxCrud
    .readBoxReport(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/saveSignReport", (req, res) => {
  recordIdempotency(req.headers["x-idempotence-key"], "");
  boxCrud
    .saveSignReport(req.body)
    .then((result) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      res.send(result);
    })
    .catch((err) => {
      recordIdempotency(req.headers["x-idempotence-key"], result);
      console.log(err);
      res.status(422).send(err);
    });
});

app.post("/listBoxClose", (req, res) =>
  boxCrud
    .listBoxClose(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/getBoxTotal", (req, res) =>
  boxCrud
    .getBoxTotal(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

// ---------------------- NEWS REPORT ---------------------------
app.post("/createNewsReport", (req, res) =>
  newsReport
    .createNewsReport(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/listNewsReports", (req, res) =>
  newsReport
    .listNewsReports(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

const server = require("http").createServer(app);

server.listen(8000, () => {
  console.log("Started on port 8000");
});

//---------------------VEHICLES--------------------------
app.post("/deleteVehicle", (req, res) =>
  userCrud
    .deleteVehicle(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/updateVehicle", (req, res) =>
  userCrud
    .updateVehicle(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

//---------------------COUPONS--------------------------
app.post("/createCoupon", (req, res) =>
  coupon
    .createCoupon(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);
app.post("/claimCoupon", (req, res) =>
  coupon
    .claimCoupon(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);
app.post("/checkCoupon", (req, res) =>
  coupon
    .checkCoupon(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/deleteCoupon", (req, res) =>
coupon
    .deleteCoupon(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/bulkClaimCoupon", (req, res) =>
coupon
    .bulkClaimCoupon(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);

app.post("/getUserCoupons", (req, res) =>
coupon
    .getUserCoupons(req.body)
    .then((result) => res.send(result))
    .catch((err) => res.status(422).send(err))
);
