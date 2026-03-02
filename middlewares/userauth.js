
const userschema = require('../model/userSchema')
const checkSession = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect('/signin')
    }
    const user = await userschema.findById(req.session.user.id)
    if (!user) {
      return req.session.destroy((err) => {
        if (err)
          console.log(err)
        return res.redirect('/signin')
      });
    } 
    
    if (user.isBlocked) {
      return req.session.destroy((err) => {
        if (err) {
          console.error("User Blocked:", err)
        }
        res.clearCookie('connect.sid')
        return res.redirect('/signin')
      })
    }

    req.user = user
    next()

  } catch (error) {
    console.error(error);
    res.redirect('/signin');

  }

}

const isLogin = (req, res, next) => {
  //console.log("entered in user auth")
  if (req.session.user) {
    return res.redirect('/')
  }
  console.log("entered in user auth")
  next()

}
module.exports = { isLogin, checkSession }