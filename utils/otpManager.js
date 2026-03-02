function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
function createOtpSession(req,purpose,payload){
  const otp=generateOTP()
  console.log('inside create otp',otp)
  req.session.otp={
    code:otp,
    purpose,
    payload,
    expiresAt:Date.now()+1*60*1000
  }
  
  return otp
  
}

function verifyOtpSession(req,enteredOtp,expectedPurpose){
  console.log('inside util/verifyotp')
  const otpData=req.session.otp
  if(!otpData) 
    return {sucess:false,message:"No OTP found"}
  if(otpData.purpose !== expectedPurpose)
    return {sucess:false,message:"Invalid otp purpose"}
  if(Date.now() > otpData.expiresAt)
    return {sucess:false,message:"OTP expaired"}
  if(enteredOtp !== otpData.code)
    return {sucess:false,message:"Invalid OTP"}

  return {sucess:true,payload:otpData.payload}
}

function clearOtpSession(req){
  delete req.session.otp
}


function getRemainingTime(req) {

 const otpData=req.session.otp
  if (!otpData || !otpData.expiresAt) {
     return 0;
  }
  const remaining = Math.floor(
    (otpData.expiresAt - Date.now()) / 1000
  );

  console.log("Calculated remaining:", remaining);

  return remaining > 0 ? remaining : 0;
}

module.exports={
  createOtpSession,verifyOtpSession,clearOtpSession,getRemainingTime
}