const axios = require('axios')
const https = require('https')

async function validatePincodeMatch(pincode) {

  console.log('inside validate pincode')
  try {
    if(!/^\d{6}$/.test(pincode)){
      return {valid:false,message:'invalid pincode format'}
    }
    const response = await axios.get(
      `https://api.postalpincode.in/pincode/${pincode}`,
      {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    )

    const result = response.data[0]

    if (result.Status !== "Success" || !result.PostOffice) {
      return {valid:false, message: "Invalid pincode" }
    }

    const postOffice = result.PostOffice[0]

    const apiCity = postOffice.District.toLowerCase()
    const apiState = postOffice.State.toLowerCase()

    
    return {
      city:apiCity ,
      state:apiState,
      valid:true,
    
    }

  } catch (err) {
    console.error("Pincode API call failed:", err.message || err); // Log the actual error
    return { valid: false, message: "Pincode validation failed" }
  }
}

module.exports = { validatePincodeMatch }