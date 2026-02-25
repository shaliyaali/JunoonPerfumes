const checkSession = (req, res, next) => {

  if (!req.session.user) {
    return res.redirect('/signin')
  }

  next()
}



const isLogin = (req, res, next) => {
   //console.log("entered in user auth")
  if (req.session.user) {
    return res.redirect('/')
  }
  console.log("entered in user auth")
  next()

}
module.exports = {  isLogin,checkSession }