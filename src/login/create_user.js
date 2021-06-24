const admin = require('firebase-admin');

module.exports = function (req, res) {
  // Verify the user provided a phone
  if (!req.body.phone) {
    return res.status(422).send({ error: 'Bad Input' });
  }

  // Format the phone number to remove dashes and parens
  const phone = String(req.body.phone).replace(/[^\d]/g, "");

  // Create a new user account using that phone number
  admin.auth().getUser(phone)
    .then(function (userRecord) {
      res.send(userRecord)
      console.log("Successfully fetched user data:", userRecord.toJSON());
    })
    .catch(function (error) {

      admin.auth().createUser({ uid: phone })
        .then(user => res.send(user))
        .catch(err => res.status(422).send({ error: err }));
      //res.send(eror)
      console.log("Error fetching user data:", error);
    });


  // Respond to the user request, saying the account was made
}
