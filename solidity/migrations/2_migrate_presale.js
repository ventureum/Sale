const Presale = artifacts.require('./Presale.sol')
const Token = artifacts.require('./VetXToken.sol')
const SafeMath = artifacts.require('./SafeMath.sol')
const duration = require('openzeppelin-solidity/test/helpers/increaseTime').duration

module.exports = function (deployer, network, accounts) {
  deployer.deploy(SafeMath).then(function() {
    return deployer.link(SafeMath, [Presale, Token])
  }).then(function() {
    return deployer.deploy(Token, '1000000000000000000000000000', 'VetX', 18, 'VTX')
  }).then(function() {
    var start = web3.eth.getBlock('latest').timestamp + duration.weeks(1)
    var end = web3.eth.getBlock('latest').timestamp + duration.weeks(2)
    return deployer.deploy(Presale, '0xaa61EfbCECb656A4C95aa5bA602CEC547F91F1Cc', Token.address, start, end)
  })
}
