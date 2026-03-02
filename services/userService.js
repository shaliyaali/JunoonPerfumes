const userSchema = require('../model/userSchema')
const bcrypt = require('bcrypt')
const saltround = 10

const checkEmailExist = async (email) => {
  try {
    //console.log('in user service')

    const user = await userSchema.findOne({ email })
    if (user) {
      throw new Error('user Already exist')
    }

  }
  catch (err) {
    console.log('user already exist checking error', err)
    throw err
  }
}
const createUser = async (userData) => {
  await checkEmailExist(userData.email)


  const hashedpassword = await bcrypt.hash(userData.password, saltround)
  
  const newUser = new userSchema({
    name: userData.name,
    email: userData.email,
    password: hashedpassword,
    isBlocked:false,
    createdAt: new Date()

  })
  console.log(newUser)
  await newUser.save()
  console.log('saved')
  return newUser

}
const userLogin=async(email,password)=>{
  
  const user=await userSchema.findOne({email})
  if(!user){

  throw new Error('Invalid email')
  }
  if(user.isBlocked){
    throw new Error('User is blocked')
  }console.log(user.password)
  const passwordMatch=await bcrypt.compare(password,user.password)
  if(!passwordMatch){
    console.log('password mismatch')
    throw new Error('Invalid password')
  }
  return user
}

const getUserById=async(userid)=>{
  const user=await userSchema.findById(userid)
  if(!user){
    throw new Error('user not found')
  }
  return user
}
const updateProfile=async(userid,name,phone)=>{
  await userSchema.findByIdAndUpdate(userid,{name,phone})
}

const findByEmail=async(email)=>{
 return await userSchema.findOne({email})
}

const updateEmail=async(userId,newEmail)=>{
  await userSchema.findByIdAndUpdate(userId,{email:newEmail})
}

const updatePassword = async (userId, newPassword) => {

  const hashedPassword = await bcrypt.hash(newPassword, saltround)

  await userSchema.findByIdAndUpdate(userId, {
    password: hashedPassword
  })
}

const addAddress = async (userId, addressData) => {

  const user = await userSchema.findById(userId)
  if (!user) throw new Error("User not found")

  if (addressData.isDefault) {
    user.addresses.forEach(addr => addr.isDefault = false)
  }

  user.addresses.push(addressData)

  // After adding, ensure at least one default address exists.
  const hasDefault = user.addresses.some(addr => addr.isDefault);
  if (!hasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save()
  return true
}
const editAddress = async (userId, addressId, updatedData) => {

  const user = await userSchema.findById(userId)
  if (!user) throw new Error("User not found")

  const address = user.addresses.id(addressId)
  if (!address) throw new Error("Address not found")

  if (updatedData.isDefault) {
    user.addresses.forEach(addr => addr.isDefault = false)
  }

  Object.assign(address, updatedData)

  // After editing, ensure at least one default address exists.
  const hasDefault = user.addresses.some(addr => addr.isDefault);
  if (!hasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save()
  return true
}

const deleteAddress = async (userId, addressId) => {

  const user = await userSchema.findById(userId)
  if (!user) throw new Error("User not found")

  user.addresses = user.addresses.filter(
    addr => addr._id.toString() !== addressId
  )

  // After deleting, ensure at least one default address exists.
  if (user.addresses.length > 0) {
    const hasDefault = user.addresses.some(addr => addr.isDefault);
    if (!hasDefault) {
      user.addresses[0].isDefault = true;
    }
  }

  await user.save()
  return true
}

const getUserAddresses = async (userId) => {
  return await userSchema.findById(userId).select('name email addresses')
}

module.exports = { checkEmailExist,createUser,userLogin ,getUserById,updateProfile,findByEmail,updateEmail,updatePassword,addAddress,editAddress,deleteAddress,getUserAddresses}