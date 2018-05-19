const Presale = artifacts.require("./Presale");
const BasicTokenMock = artifacts.require("./BasicTokenMock");

var BigNumber = web3.BigNumber;

contract("Test Presale", async (accounts) => {
    let presaleInstance;
    let basicTokenMockInstance;

    beforeEach(async () => {
        //presaleInstance = await Presale.deployed();
        basicTokenMockInstance = await BasicTokenMock.deployed();
    })

    it("Basic test", async () => {
        var totalSupply = await basicTokenMockInstance.totalSupply();
        assert.equal(totalSupply, 1000000, "basic test");
    })
})



