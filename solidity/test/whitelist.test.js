import ether from 'openzeppelin-solidity/test/helpers/ether';
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'openzeppelin-solidity/test/helpers/latestTime';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Crowdsale = artifacts.require('Presale');
const SimpleToken = artifacts.require('Token');

contract('Whitelist', function ([_, wallet, authorized, unauthorized, anotherAuthorized]) {
  const value = ether(42);
  const tokenSupply = new BigNumber('1e22');

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await advanceBlock();
  });

  describe('single user whitelisting', function () {
    beforeEach(async function () {
      this.openingTime = latestTime() + duration.weeks(1);
      this.closingTime = this.openingTime + duration.weeks(1);
      this.token = await SimpleToken.new();
      this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.openingTime, this.closingTime);
      await this.token.transfer(this.crowdsale.address, tokenSupply);
      await this.crowdsale.addToWhitelist(authorized, 5, 10000);
      await increaseTimeTo(this.openingTime);
    });

    describe('check whitelist data', function () {
      it('check [whitelisted, rate, lockupDuration]', async function () {
        var [whitelisted, rate, lockDuration] = await this.crowdsale.whitelist(authorized);
        whitelisted.should.equal(true);
        var _rate = new BigNumber(5);
        rate.should.be.bignumber.equal(_rate);
        var _lockDuration = new BigNumber(10000);
        lockDuration.should.be.bignumber.equal(_lockDuration);
      });
    })

    describe('accepting payments', function () {
      it('should accept payments to whitelisted (from whichever buyers)', async function () {
        await this.crowdsale.buyTokens(authorized, { value: value, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(authorized, { value: value, from: unauthorized }).should.be.fulfilled;
      });

      it('should reject payments to not whitelisted (from whichever buyers)', async function () {
        await this.crowdsale.buyTokens(unauthorized, { value: value, from: unauthorized }).should.be.rejected;
        await this.crowdsale.buyTokens(unauthorized, { value: value, from: authorized }).should.be.rejected;
      });

      it('should reject payments to addresses removed from whitelist', async function () {
        await this.crowdsale.removeFromWhitelist(authorized);
        await this.crowdsale.buyTokens(authorized, { value: value, from: authorized }).should.be.rejected;
      });
    });

    describe('reporting whitelisted', function () {
      it('should correctly report whitelisted addresses', async function () {
        let [isAuthorized, ,] = await this.crowdsale.whitelist(authorized);
        isAuthorized.should.equal(true);
        let [isntAuthorized, ,] = await this.crowdsale.whitelist(unauthorized);
        isntAuthorized.should.equal(false);
      });
    });
  });
  
  describe('many user whitelisting', function () {
    beforeEach(async function () {
      this.openingTime = latestTime() + duration.weeks(1);
      this.closingTime = this.openingTime + duration.weeks(1);
      this.token = await SimpleToken.new();
      this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.openingTime, this.closingTime);
      await this.token.transfer(this.crowdsale.address, tokenSupply);
      await this.crowdsale.addManyToWhitelist([authorized, anotherAuthorized], [5, 6], [10000, 20000]);
      await increaseTimeTo(this.openingTime);
    });

    describe('check whitelist data', function () {
      it('check [whitelisted, rate, lockupDuration]', async function () {
        var [whitelisted, rate, lockDuration] = await this.crowdsale.whitelist(authorized);
        whitelisted.should.equal(true);
        var _rate = new BigNumber(5);
        rate.should.be.bignumber.equal(_rate);
        var _lockDuration = new BigNumber(10000);
        lockDuration.should.be.bignumber.equal(_lockDuration);

        var [anotherWhitelisted, anotherRate, anotherLockDuration] = await this.crowdsale.whitelist(anotherAuthorized);
        anotherWhitelisted.should.equal(true);
        _rate = new BigNumber(6);
        anotherRate.should.be.bignumber.equal(_rate);
        _lockDuration = new BigNumber(20000);
        anotherLockDuration.should.be.bignumber.equal(_lockDuration);
      });
    })

    describe('accepting payments', function () {
      it('should accept payments to whitelisted (from whichever buyers)', async function () {
        await this.crowdsale.buyTokens(authorized, { value: value, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(authorized, { value: value, from: unauthorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(anotherAuthorized, { value: value, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(anotherAuthorized, { value: value, from: unauthorized }).should.be.fulfilled;
      });

      it('should reject payments to not whitelisted (with whichever buyers)', async function () {
        await this.crowdsale.buyTokens(unauthorized, { value: value, from: unauthorized }).should.be.rejected;
        await this.crowdsale.buyTokens(unauthorized, { value: value, from: authorized }).should.be.rejected;
      });

      it('should reject payments to addresses removed from whitelist', async function () {
        await this.crowdsale.removeFromWhitelist(anotherAuthorized);
        await this.crowdsale.buyTokens(authorized, { value: value, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(anotherAuthorized, { value: value, from: authorized }).should.be.rejected;
      });
    });

    describe('reporting whitelisted', function () {
      it('should correctly report whitelisted addresses', async function () {
        let [isAuthorized, ,] = await this.crowdsale.whitelist(authorized);
        isAuthorized.should.equal(true);
        let [isAnotherAuthorized, ,] = await this.crowdsale.whitelist(anotherAuthorized);
        isAnotherAuthorized.should.equal(true);
        let [isntAuthorized, ,] = await this.crowdsale.whitelist(unauthorized);
        isntAuthorized.should.equal(false);
      });
    });
  });
});
