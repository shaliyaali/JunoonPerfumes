const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User=require('../model/userSchema')
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({$or:[{googleId: profile.id},{email:profile.emails[0].value}]  });
      if (user) {
        if (user.isBlocked) {
          return done(null, false, { message: 'User is blocked' });
        }
        if(user.password){

          console.log('user with password trying for google signin')
          // Link the Google ID to the existing user account
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }
      } else {
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          isBlocked:false

        });
        await user.save();
      }   
      done(null, user);
    } catch (err) {
      done(err, null);
    }     
  }));

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}); 
module.exports=passport
