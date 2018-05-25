import Eth from 'ethjs'
import { getProvider } from './provider'
import { getPresale, getToken } from '../config'
import store from '../store'

class PreSaleService {
  constructor () {
    this.address = null
    this.account = null
    this.presale = null
    // for dev
    this.token = null
  }

  async init () {
    /* important to check for provider in
     * init function (rather than constructor),
     * so that injected web3 has time to load.
     */
    this.eth = new Eth(getProvider())
    const accounts = await this.eth.accounts()
    this.account = accounts[0]
    this.presale = await getPresale(accounts[0])
    this.address = this.presale.address
    this.setUpEvents()
    // for dev
    this.token = await getToken(accounts[0])

    store.dispatch({
      type: 'PRESALE_CONTRACT_INIT'
    })
  }

  setUpEvents () {
    this.presale.allEvents()
      .watch((error, log) => {
        if (error) {
          console.error(error)
          return false
        }

        store.dispatch({
          type: 'PRESALE_EVENT'
        })
      })
  }

  async buyTokens (tokenAmount) {
    await this.presale.buyTokens(this.account, {value: Eth.toWei(tokenAmount, 'ether')})
  }

  async withDraw () {
    await this.presale.withdrawTokens()
  }

  async getOpeningTime () {
    return await this.presale.openingTime.call()
  }

  async getClosingTime () {
    return await this.presale.closingTime.call()
  }

  async getBalance () {
    return await this.presale.balances.call(this.account)
  }

  async getAccountInfo() {
    var accountInfoData = await this.presale.whitelist.call(this.account)

    return {
      whitelisted: accountInfoData[0],
      rate: accountInfoData[1],
      lockupDuration: accountInfoData[2]
    }
  }

  // for dev
  async addToWhitelist () {
    await this.presale.addToWhitelist(this.account, 100, 100)
  }

  async setTime (t) {
    await this.presale.setOpeningAndClosingTime(t, t + 600)
  }

  async finish () {
    await this.presale.finalize()
  }

  async transfer () {
    await this.token.transfer(this.presale.address, 100000000000000000000000000)
  }

  async presalebalance () {
    return await this.token.balanceOf(this.presale.address)
  }
}

export default new PreSaleService()
