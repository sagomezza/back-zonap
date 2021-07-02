const axios =  require("axios");
const { LEANCORE, CONNEXION, TIMEOUT } =  require('./api');
const functions = require('firebase-functions');


module.exports.authLeanCore = () => {
    return new Promise((resolve, reject)=> {
        axios.post(
            `${LEANCORE}${CONNEXION}`,
            { apiKey: functions.config().leancore.key },
            { timeout: TIMEOUT }
        ).then(result => {
            let accessToken = result.data.access_token
            axios.defaults.headers.common["Authorization"] = "Bearer " + accessToken;
            resolve(true)
        })
        .catch(err => reject(err))
    })    
}