const crypto = require('crypto');

const generateOtp = () => {
    var nums = "0123456789"
    let OTP = "";
    for (let i = 0; i < process.env.OTP_LENGTH; i++){
        const randomIndex = crypto.randomInt(0, nums.length);
        OTP += nums[randomIndex];
    }
    return OTP;
}

const generateToken = () => {
    return crypto.randomBytes(32).toString('hex'); 
};

module.exports = {generateOtp, generateToken};