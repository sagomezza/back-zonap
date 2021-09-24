const sgMail = require("@sendgrid/mail");

module.exports.email = (parameter) => {
  return new Promise((resolve, reject) => {
    try {
      if (!parameter.about) {
        reject({ response: -1, message: "about required" });
        return;
      }
      if (!parameter.email) {
        reject({ response: -1, message: "about email" });
        return;
      }
    //   if (!parameter.templateData) {
    //     reject({ response: -1, message: "about templateData" });
    //     return;
    //   }
      if (!parameter.subject) {
        reject({ response: -1, message: "about subject" });
        return;
      }

      let template_data = {};
      if (parameter.about === "marketing") {
        sgMail.setApiKey(process.env.SENDGRIDMARKETINGKEY);
        // template_data = {
        //   header: parameter.templateData.header,
        //   section1: parameter.templateData.section1,
        //   section2: parameter.templateData.section2,
        //   section3: parameter.templateData.section3,
        // };
      } else {
        sgMail.setApiKey(process.env.SENDGRIDNOTIFICATIONKEY);
        // template_data = {
        //   header: parameter.templateData.header,
        //   text: parameter.templateData.text,
        //   button: parameter.templateData.button,
        //   link: parameter.templateData.link,
        // };
      }

      const msg = {
        personalizations: [
          {
            to: email,
            dynamic_template_data: {
              subject: parameter.subject,
            //   header: template_data.header || `Hola,`,
            //   text: template_data.text,
            //   button: template_data.button,
            //   link: template_data.link,
            },
          },
        ],
        from: {
          email: "info@zonap.com",
          name: parameter.about === "info" ? "Zona P Info." : "Zona P",
        },
        reply_to: {
          email: "info@zonap.com",
          name: "Zona P",
        },
        template_id:
          parameter.about === "marketing"
            ? process.env.MARKETINGTEMPLATE
            : process.env.TRANSACTIONTEMPLATE,
      };
      sgMail
        .send(msg)
        .then((response) => {
          resolve({
            response: Number(1),
            message: "Email was successfuly sent to users",
          });
        })
        .catch((err) => {
          reject({
            response: Number(0),
            message: "No se pudo enviar el email",
          });
        });
    } catch (err) {
      console.log(err);
      reject({
        response: 0,
        message: "No se pudo enviar el email",
      });
    }
  });
};

module.exports.massiveEmail = () => {
  return new Promise((resolve, reject) => {
    try {
      if (!parameter.about) {
        reject({ response: -1, message: "about required" });
        return;
      }
      if (!parameter.emails) {
        reject({ response: -1, message: "about email" });
        return;
      }
    //   if (!parameter.templateData) {
    //     reject({ response: -1, message: "about templateData" });
    //     return;
    //   }
      if (!parameter.subject) {
        reject({ response: -1, message: "about subject" });
        return;
      }
      let promises = [];
      emails.forEach((email) => {
        promises.push(
          this.email({
            email,
            templateData: parameter.templateData,
            subject: parameter.subject,
            about: parameter.about,
          })
        );
      });
      let results = Promise.all(promises);
      results
        .then((response) => {
          resolve({
            response: Number(1),
            message: "Email was successfuly sent to users",
          });
        })
        .catch((err) => {
          reject({
            response: 0,
            message: "No se pudo enviar el email",
          });
        });
    } catch (err) {
      console.log(err);
    }
  });
};
