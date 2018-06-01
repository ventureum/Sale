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

contract('Post Delivery', function ([_, investor, wallet, purchaser]) {
  const rate = new BigNumber(5);
  const value = ether(42);
  const tokenSupply = new BigNumber('1e22');
  const expectedTokenAmount = rate.mul(value);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = latestTime() + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(1);
    this.beforeEndTime = this.closingTime - duration.hours(1);
    this.afterClosingTime = this.closingTime + duration.seconds(1);
    this.afterLockupTime = this.afterClosingTime + duration.seconds(10000);
    this.token = await SimpleToken.new();
    this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.openingTime, this.closingTime);
    await this.token.transfer(this.crowdsale.address, tokenSupply);
    await this.crowdsale.addToWhitelist(investor, 5, 10000);
  });

  it('should not immediately assign tokens to beneficiary', async function () {
    await increaseTimeTo(this.openingTime);
    await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
    const balance = await this.token.balanceOf(investor);
    balance.should.be.bignumber.equal(0);
  });

  it('should not allow beneficiaries to withdraw tokens before crowdsale ends', async function () {
    await increaseTimeTo(this.beforeEndTime);
    await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
    await this.crowdsale.withdrawTokens({ from: investor }).should.be.rejectedWith(EVMRevert);
  });

  it('should not allow beneficiaries to withdraw tokens after crowdsale ends before lockup period ends', async function () {
    await increaseTimeTo(this.openingTime);
    await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
    await increaseTimeTo(this.afterClosingTime);
    await this.crowdsale.withdrawTokens({ from: investor }).should.be.rejectedWith(EVMRevert);
  });

  it('should allow beneficiaries to withdraw tokens after lockup period ends', async function () {
    await increaseTimeTo(this.openingTime);
    await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
    await increaseTimeTo(this.afterLockupTime);
    await this.crowdsale.withdrawTokens({ from: investor }).should.be.fulfilled;
  });

  it('should return the amount of tokens bought after lockup period ends', async function () {
    await increaseTimeTo(this.openingTime);
    await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
    await increaseTimeTo(this.afterLockupTime);
    await this.crowdsale.withdrawTokens({ from: investor });
    const balance = await this.token.balanceOf(investor);
    balance.should.be.bignumber.equal(expectedTokenAmount);
  });
});
