const axios = require('axios')

async function validatePincodeMatch(pincode, city, state) {
  try {
    const response = await axios.get(
      `https://api.postalpincode.in/pincode/${pincode}`
    )

    const result = response.data[0]

    if (result.Status !== "Success") {
      return { valid: false, message: "Invalid pincode" }
    }

    const postOffice = result.PostOffice[0]

    const apiCity = postOffice.District.toLowerCase()
    const apiState = postOffice.State.toLowerCase()

    if (
      apiCity !== city.toLowerCase() ||
      apiState !== state.toLowerCase()
    ) {
      return {
        valid: false,
        message: "Pincode does not match city/state"
      }
    }

    return { valid: true }

  } catch (err) {
    return { valid: false, message: "Pincode validation failed" }
  }
}

module.exports = { validatePincodeMatch }