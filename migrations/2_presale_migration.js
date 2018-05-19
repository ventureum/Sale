const Presale = artifacts.require("./Presale");
const BasicTokenMock = artifacts.require("./BasicTokenMock");
const Web3 = require('web3');
const web3 = new Web3();
const NUMBER_ACCOUNT = 10;
const TIME_PERIOD = 1000

module.exports = function (deployer, network, accounts) {
    // deploy BasicTokenMock information
    async function init() {
        var initialAccounts = [
            accounts[0]
        ];
        var initialBalance = 1000000;

        // deploy Presale information
        var currentTimeStamp = 10;
        await deployer.deploy(BasicTokenMock, initialAccounts, initialBalance)
        var tokenAddress = BasicTokenMock.address;
        await deployer.deploy(Presale, accounts[0], tokenAddress, startTime);
    }
    init();
}


