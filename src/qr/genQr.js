const qrcode = require("qrcode");
const axios = require("axios");

const createQRBase64 = async (data) => {
  const options = {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 256,
    height: 256,
  };
  // console.log('[createQRBase64] ', data)
  return await qrcode.toDataURL(data, options);
};

module.exports.generateQrForHQ = async (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      const URL_BASE = "https://us-central1-zona-p-test.cloudfunctions.net";
      const hq = await axios.post(`${URL_BASE}/readHq`, { id: parameter.id });
      const { parks, price, id, reservationPolitics } = hq.data.data;
      // console.log('[generateQrForHQ] ', id)
      // CASO 1: NO SPOTS
      if (parks.length === 0 && reservationPolitics === "no-reserve") {
        const hashPoolId = await axios.post(`${URL_BASE}/hashPoolId`, {
          poolId: id,
        });
        // QR DATA
        const hash = hashPoolId.data.hash;
        //console.log('[generateQrForHQ] ', hash)
        const url = `http://zonapdigital.zonap.com?qr=${hash}`;
        const qrURLBase64 = await createQRBase64(
          JSON.stringify({
            url,
            price,
          })
        );
        resolve({
          response: 1,
          message: `QR`,
          qrURL: qrURLBase64,
        });
      } else {
        resolve({
          response: 1,
          message: `Not supported yet`,
        });
      }
    } catch (err) {
      console.log(err);
      reject({ response: 0, message: JSON.stringify(err, 2), data: parameter });
    }
  });
};

module.exports.generateQrForParanoicUser = async (parameter) => {
  return new Promise(async (resolve, reject) => {
    try {
      const URL_BASE = "https://us-central1-zona-p-test.cloudfunctions.net";
      const hq = await axios.post(`${URL_BASE}/readHq`, { id: parameter.id });
      // const { id } = hq.data.data;

      const paranoicUser = await axios.post(`${URL_BASE}/createParanoicUser`, {
        hqId: parameter.id,
      });
      const { id: paranoicUserId } = paranoicUser.data;

      const qrURLBase64 = await createQRBase64(
        JSON.stringify({ id: paranoicUserId })
      );
      resolve({
        response: 1,
        message: `QR`,
        qrURL: qrURLBase64,
      });

    } catch (err) {
      console.log(err);
      reject({ response: 0, message: JSON.stringify(err, 2), data: parameter });
    }
  });
};
