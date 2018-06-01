import ether from 'openzeppelin-solidity/test/helpers/ether';
import { advanceBlock } from 'openzeppelin-solidity/test/helpers/advanceToBlock';
import { increaseTimeTo, duration } from 'openzeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'openzeppelin-solidity/test/helpers/latestTime';
import EVMRevert from 'openzeppelin-solidity/test/helpers/EVMRevert'

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Crowdsale = artifacts.require('Presale');
const SimpleToken = artifacts.require('Token');

contract('Basic', function ([_, investor, wallet, purchaser]) {
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
    this.token = await SimpleToken.new();
    this.crowdsale = await Crowdsale.new(wallet, this.token.address, this.openingTime, this.closingTime);
    await this.token.transfer(this.crowdsale.address, tokenSupply);
    await this.crowdsale.addToWhitelist(investor, 5, 10000);
    await increaseTimeTo(this.openingTime);
  });

  describe('accepting payments', function () {
    it('should accept payments', async function () {
      await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.fulfilled;
    });
  });

  
  describe('high-level purchase', function () {
    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.sendTransaction({ value: value, from: investor });
      const event = logs.find(e => e.event === 'TokenPurchase');
      should.exist(event);
      event.args.purchaser.should.equal(investor);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should assign tokens to sender', async function () {
      await this.crowdsale.sendTransaction({ value: value, from: investor });
      let balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(new BigNumber(0));

      let pendingBalance = await this.crowdsale.balances.call(investor);
      pendingBalance.should.be.bignumber.equal(expectedTokenAmount);

      let totalTokensSold = await this.crowdsale.totalTokenSold.call();
      totalTokensSold.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.sendTransaction({ value, from: investor });
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe('low-level purchase', function () {
    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
      const event = logs.find(e => e.event === 'TokenPurchase');
      should.exist(event);
      event.args.purchaser.should.equal(purchaser);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should assign tokens to beneficiary', async function () {
      await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
      const balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(new BigNumber(0));

      let pendingBalance = await this.crowdsale.balances.call(investor);
      pendingBalance.should.be.bignumber.equal(expectedTokenAmount);

      let totalTokensSold = await this.crowdsale.totalTokenSold.call();
      totalTokensSold.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe('Multiple purchases', function () {

    it('should assign tokens to beneficiary', async function () {
      await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
      let balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(new BigNumber(0));

      let pendingBalance = await this.crowdsale.balances.call(investor);
      pendingBalance.should.be.bignumber.equal(expectedTokenAmount);

      let totalTokensSold = await this.crowdsale.totalTokenSold.call();
      totalTokensSold.should.be.bignumber.equal(expectedTokenAmount);

      await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });
      balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(new BigNumber(0));

      pendingBalance = await this.crowdsale.balances.call(investor);
      pendingBalance.should.be.bignumber.equal(expectedTokenAmount.add(expectedTokenAmount));

      totalTokensSold = await this.crowdsale.totalTokenSold.call();
      totalTokensSold.should.be.bignumber.equal(expectedTokenAmount.add(expectedTokenAmount));
    });

    it('should forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(value);
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const last = web3.eth.getBalance(wallet);
      last.minus(post).should.be.bignumber.equal(value);
      last.minus(pre).should.be.bignumber.equal(value.add(value));
    });
  });
});
