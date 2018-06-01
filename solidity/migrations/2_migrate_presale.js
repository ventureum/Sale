var Presale = artifacts.require('./Presale.sol')
var Token = artifacts.require('./VetXToken.sol')
var SafeMath = artifacts.require('./SafeMath.sol')
var moment = require("moment")

module.exports = function (deployer, network, accounts) {
  deployer.deploy(SafeMath).then(function() {
    return deployer.link(SafeMath, [Presale, Token])
  }).then(function() {
    return deployer.deploy(Token, '1000000000000000000000000000', 'VetX', 18, 'VTX')
  }).then(function() {
    var start = moment().add(1, 'weeks').unix()
    var end = moment().add(2, 'weeks').unix()
    return deployer.deploy(Presale, '0xaa61EfbCECb656A4C95aa5bA602CEC547F91F1Cc', Token.address, start, end)
  })
}
