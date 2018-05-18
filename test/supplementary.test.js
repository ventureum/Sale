import ether from 'openzeppelin-solidity/test/helpers/ether'
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock'
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime'
import latestTime from 'openzeppelin-solidity/test/helpers/latestTime'
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

const BigNumber = web3.BigNumber

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const Crowdsale = artifacts.require('Presale')
const SimpleToken = artifacts.require('Token')

contract('Supplementary', function ([_, investor, investor2, investor3, wallet, purchaser]) {
  const rate = new BigNumber(5)
  const value = ether(12)
  const duraTime = 10000
  const tokenSupply = new BigNumber('1e22')
  const expectedTokenAmount = rate.mul(value)

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await advanceBlock()
  })

  beforeEach(async function () {
    this.openingTime = latestTime() + duration.weeks(1)
    this.closingTime = this.openingTime + duration.weeks(1)
    this.token = await SimpleToken.new()
    this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.openingTime, this.closingTime)
    await this.token.transfer(this.crowdsale.address, tokenSupply)
    await this.crowdsale.addToWhitelist(investor, rate, duraTime)
    await increaseTimeTo(this.openingTime)
  })

  describe('period is closed', function () {
    it('should not be able to purchase after purchase period', async function () {
      await increaseTimeTo(this.closingTime + 1)
      let periodState = await this.crowdsale.hasClosed.call()
      periodState.should.be.equal(true)
    })

    it('finalize the period', async function () {
      let periodState = await this.crowdsale.hasClosed.call()
      periodState.should.be.equal(false)

      await this.crowdsale.finalize()

      let closingTime = await this.crowdsale.closingTime.call()
      let currentTime = latestTime()
      closingTime.should.be.bignumber.equal(currentTime)
      await increaseTimeTo(latestTime() + 1)

      periodState = await this.crowdsale.hasClosed.call()
      periodState.should.be.equal(true)
    })
  })

  describe('add/remove investor to whitelist', function () {
    it('check white-list state', async function () {
      let state = await this.crowdsale.whitelist.call(investor)
      state[0].should.be.equal(true)
      state[1].should.be.bignumber.equal(rate)
      state[2].should.be.bignumber.equal(duraTime)
    })

    it('investor2 should not in white-list', async function () {
      let state = await this.crowdsale.whitelist.call(investor2)
      state[0].should.not.be.equal(true)
    })

    it('add to white-list', async function () {
      await this.crowdsale.addToWhitelist(investor2, rate, duraTime)
      let state = await this.crowdsale.whitelist.call(investor2)
      state[0].should.be.equal(true)
      state[1].should.be.bignumber.equal(rate)
      state[2].should.be.bignumber.equal(duraTime)
    })

    it('add many and remove whitelist', async function () {
      let investors = [investor, investor2, investor3]
      let rates = [1, 2, 3]
      let lockupDurations = [300, 200, 100]

      await this.crowdsale.addManyToWhitelist(investors, rates, lockupDurations)

      let state = await this.crowdsale.whitelist.call(investor2)
      state[0].should.be.equal(true)
      state[1].should.be.bignumber.equal(2)
      state[2].should.be.bignumber.equal(200)

      await this.crowdsale.removeFromWhitelist(investor2)
      state = await this.crowdsale.whitelist.call(investor2)
      state[0].should.not.be.equal(true)

      state = await this.crowdsale.whitelist.call(investor)
      state[0].should.be.equal(true)
      state[1].should.be.bignumber.equal(1)
      state[2].should.be.bignumber.equal(300)

      state = await this.crowdsale.whitelist.call(investor3)
      state[0].should.be.equal(true)
      state[1].should.be.bignumber.equal(3)
      state[2].should.be.bignumber.equal(100)
    })
  })

  describe('set opening time and closing time', function () {
    it('basic check', async function () {
      await this.crowdsale.setOpeningAndClosingTime(10000, 1)
      let openingTime = await this.crowdsale.openingTime.call()
      let closingTime = await this.crowdsale.closingTime.call()
      openingTime.should.be.bignumber.equal(10000)
      closingTime.should.be.bignumber.equal(1)
    })
  })

  describe('transfer token', function () {
    it('should receive token', async function () {
      let amountToken = 100
      let preBalance = await this.token.balanceOf(investor2)
      await this.crowdsale.transferTokens(investor2, amountToken)
      let postBalance = await this.token.balanceOf(investor2)

      postBalance.minus(preBalance).should.be.bignumber.equal(amountToken)
    })
  })

  describe('not meet the require', function () {
    it('should not constructor by small opening time', async function () {
      let currentTime = latestTime()
      await Crowdsale.new(wallet, this.token.address, currentTime - 1, this.closingTime).should.be.rejectedWith(EVMRevert)
    })

    it('should not construct with openingTime < now', async function () {
      await Crowdsale.new(wallet, this.token.address, this.closingTime + 1, this.closingTime).should.be.rejectedWith(EVMRevert)
    })

    it('should not withdraw if not in whitlist', async function () {
      await this.crowdsale.finalize()
      await increaseTimeTo(latestTime() + 1)
      this.crowdsale.withdrawTokens({ from: investor2 }).should.be.rejectedWith(EVMRevert)
    })

    it('should not withdraw if pending token amount is zero', async function () {
      await increaseTimeTo(this.closingTime + 1)
      this.crowdsale.withdrawTokens({ from: investor }).should.be.rejectedWith(EVMRevert)
    })

    it('should revert when calling transferTokens if balance is insufficient', async function () {
      let amountToken = await this.token.balanceOf(this.crowdsale.address)
      await this.crowdsale.transferTokens(investor2, amountToken.add(new BigNumber(1))).should.be.rejectedWith(EVMRevert)
    })

    it('should not transfer token by invalid address', async function () {
      await this.crowdsale.transferTokens('0x0', 10).should.be.rejectedWith(EVMRevert)
    })
  })

  describe('not meet the require', function () {
    it('should reject by onlyOwner', async function () {
      this.crowdsale.addToWhitelist(investor, 5, 1000, {from: investor}).should.be.rejectedWith(EVMRevert)
      this.crowdsale.addManyToWhitelist([investor], [5][1000], {from: investor}).should.be.rejectedWith(EVMRevert)
      this.crowdsale.removeFromWhitelist(investor, {from: investor}).should.be.rejectedWith(EVMRevert)
      this.crowdsale.finalize({from: investor}).should.be.rejectedWith(EVMRevert)
      this.crowdsale.setOpeningAndClosingTime(100, 1000, {from: investor}).should.be.rejectedWith(EVMRevert)
      this.crowdsale.transferTokens(investor, 100, {from: investor}).should.be.rejectedWith(EVMRevert)
      this.crowdsale.transferTokens(investor, 100, {from: investor}).should.be.rejectedWith(EVMRevert)
    })
  })
})
