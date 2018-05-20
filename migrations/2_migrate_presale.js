var Presale = artifacts.require('./Presale.sol')
var Token = artifacts.require('./Token.sol')
var SafeMath = artifacts.require('./SafeMath.sol')
var moment = require("moment")

module.exports = async function (deployer, network, accounts) {

  await deployer.deploy(SafeMath)
  await deployer.link(SafeMath, [Presale, Token])
  await deployer.deploy(Token)
  var start = moment().add(1, 'weeks').unix()
  var end = moment().add(2, 'weeks').unix()
  console.log("Token address: ", Token.address)
  await deployer.deploy(Presale, '0x35c0f041528BeD52f3349111F619Af402d654F37', Token.address, start, end)
}
