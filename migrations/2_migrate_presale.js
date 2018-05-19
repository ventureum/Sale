var Presale = artifacts.require('./Presale.sol')
var Token = artifacts.require('./Token.sol')
var SafeMath = artifacts.require('./SafeMath.sol')
var moment = require("moment")

module.exports = async function (deployer, network, accounts) {

  var initialAccounts = [
    accounts[0]
  ];
  var initialBalance = 1000000;
  deployer.deploy(Token, initialAccounts, initialBalance)
  
  deployer.deploy(SafeMath)
  deployer.link(SafeMath, Presale)
  var start = moment().unix()
  var end = moment().add(1, 'weeks').unix()
  console.log(Token.address)
  deployer.deploy(Presale, '0x35c0f041528BeD52f3349111F619Af402d654F37', Token.address, start, end)
}
