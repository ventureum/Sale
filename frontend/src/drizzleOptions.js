import Presale from './../build/contracts/Presale.json'
import VetXToken from './../build/contracts/VetXToken.json'

const drizzleOptions = {
  web3: {
    block: false,
    fallback: {
      type: 'ws',
      url: 'ws://127.0.0.1:8545'
    }
  },
  contracts: [
    Presale,
    VetXToken
  ],
  events: {
    Presale: ['TokenPurchase']
  },
  polls: {
    accounts: 1500,
    blocks: 1000
  }
}

export default drizzleOptions
