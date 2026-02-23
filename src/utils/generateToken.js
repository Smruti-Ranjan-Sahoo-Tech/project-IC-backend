const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username:user.username,
      email: user.email,
      role: user.role,
      cource:user.cource
    },
    process.env.JWT_SERVER_SECREAT,
    { expiresIn: "1d" }
  );
};

module.exports = generateToken;
