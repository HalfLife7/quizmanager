var express = require('express');
var session = require('express-session')
var passwordHash = require('password-hash');

var router = express.Router()




// mysql
var mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'quizmanager'
});

router.post('/attemptlogin', function (req, res) {
  console.log(req.body);

  connection.query("SELECT * FROM user WHERE email = ?", req.body.email, function callback(error, results, fields) {
    if (error != null) {
      console.log(error);
    } else {
      console.log(results[0]);

      if (results[0] == undefined) {
        req.session.loginError = "Invalid email!";
        res.redirect("/");
      }
      // check the email and password are valid before allowing the user
      // to view the users page. 
      else if (passwordHash.verify(req.body.password, results[0].password) == true) {

        // set an email session variable to indicate that a user is logged in
        req.session.email = req.body.email;
        req.session.userInfo =
          {
            email: results[0].email,
            firstName: results[0].first_name,
            lastName: results[0].last_name
          }

        // check if the user account_type
        if (results[0].account_type == "administrator") {
          req.session.accountType = "administrator";
          res.redirect("/homepage")
          // if user send to user panel
        } else if (results[0].account_type == "student") {
          req.session.accountType = "student";
          res.redirect("/homepage");
        }
        // if the input was not valid, re-render the login page with an error message
      } else {
        req.session.loginError = "Invalid password!";
        res.redirect("/");
      }
    }
  });

})

router.get('/register', function (req, res) {
  registerError = req.session.registerError;
  req.session.registerError = "";

  res.render("register", { errorMessage: registerError });
})

router.post('/registeruser', function (req, res) {
  console.log(req.body);

  // validation to make sure the passwords match
  if (req.body.password == req.body.confirmPassword) {
    var hashedPassword = passwordHash.generate(req.body.password);

    connection.query("INSERT into user (email, password, account_type, first_name, last_name, secretQuestion, secretAnswer) VALUES (?,?,?,?,?,?,?)", [req.body.email, hashedPassword, "student", req.body.firstName, req.body.lastName, req.body.secretQuestion, req.body.secretAnswer], function callback(error, results, fields) {
      if (error != null) {
        console.log(error)
      } else {

        req.session.email = req.body.email;
        req.session.accountType = "student";

        console.log(req.session);

        // redirect to student homepage for logged-in students
        res.redirect("/homepage");
      }
    })
  } else {
    req.session.registerError = "Passwords do not match."
    // redirect to student homepage for logged-in students
    res.redirect("/register");
  }
})

router.get('/forgotpassword', function (req, res) {
  forgotPasswordError = req.session.forgotPasswordError;
  req.session.forgotPasswordError = "";
  res.render("forgotpasswordconfirmemail", { errorMessage: forgotPasswordError })
});

router.post('/forgotpasswordconfirmemail', function (req, res) {
  console.log(req.body);

  connection.query("SELECT email, secretQuestion, secretAnswer FROM user WHERE email = ?", req.body.email, function callback(error, results, fields) {
    if (error != null) {
      console.log(error);
    } else {
      console.log(results[0]);

      if (results[0] == undefined) {
        req.session.forgotPasswordError = "Invalid email!";
        res.redirect("/forgotpassword");
      }
      // check the email and password are valid before allowing the user
      // to view the users page. 
      else {
        console.log("correct");

        // store secret question/answer in session and have user confirm in next page
        req.session.forgotPassword =
          {
            email: results[0].email,
            secretQuestion: results[0].secret_question,
            secretAnswer: results[0].secret_answer
          }
        console.log(req.session.forgotPassword.secretAnswer);
        res.redirect('/secretanswer');
      }
    }
  });
});

router.get('/secretanswer', function (req, res) {
  secretAnswerError = req.session.secretAnswerError;
  req.session.secretAnswerError = "";

  // if user didnt enter an e-mail and shouldn't be here, redirect them back to the loginpage
  if (req.session.forgotPassword == null) {
    res.redirect('/');
  } else {
    res.render('forgotpasswordsecretquestion', { secretQuestion: req.session.forgotPassword.secretQuestion, errorMessage: secretAnswerError });
  }
})

router.post('/forgotpasswordconfirmsecretanswer', function (req, res) {
  console.log(req.body);
  // if they enter the correct scret answer, send them to update their password
  if (req.body.secretAnswer == req.session.forgotPassword.secretAnswer) {
    req.session.secretAnswerSuccess = "success";
    res.redirect('/updatepassword')
  } else {
    // reload page with error saying incorrect secret answer
    req.session.secretAnswerError = "Incorrect!";
    res.redirect('/secretanswer');
  }
})

router.get('/updatepassword', function (req, res) {
  console.log(req.session);
  updatePasswordError = req.session.updatePasswordError;
  req.session.updatePasswordError = "";

  // if user didnt answer secret successfully, redirect them back to the loginpage
  if (req.session.secretAnswerSuccess == null) {
    res.redirect('/');
  } else {
    res.render('forgotpasswordupdatepassword', { errorMessage: updatePasswordError, email: req.session.forgotPassword.email });
  }
})

router.post('/forgotpasswordupdatepassword', function (req, res) {
  console.log(req.body);
  // update the password of the user

  // validation to make sure the passwords match
  if (req.body.password == req.body.confirmPassword && req.body.password != "") {
    var hashedPassword = passwordHash.generate(req.body.password);

    connection.query("UPDATE user SET password = (?) WHERE email = ?", [hashedPassword, req.session.forgotPassword.email], function callback(error, results, fields) {
      if (error != null) {
        console.log(error)
      } else {

        req.session.email = req.session.forgotPassword.email;
        req.session.accountType = "student";

        // remove session variables related to forgot password
        delete (req.session.forgotPassword);

        console.log(req.session);

        // redirect to student homepage for logged-in students
        res.redirect("/homepage");
      }
    })
  } else if (req.body.password == "") {
    req.session.updatePasswordError = "Password cannot be blank."
    // redirect to student homepage for logged-in students
    res.redirect("/updatepassword");
  } else {
    req.session.updatePasswordError = "Passwords do not match."
    // redirect to student homepage for logged-in students
    res.redirect("/updatepassword");
  }

})

module.exports = router;