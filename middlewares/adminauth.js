const checkSession = (req, res, next) => {

  if (!req.session.admin) {
    return res.redirect('/admin/login')
  }

  next()
}



const isLogin = (req, res, next) => {
   
  if (req.session.admin) {
    return res.redirect('/admin/dashboard')
  }
  console.log("entered in admin auth")
  next()

}
module.exports = {  isLogin,checkSession }