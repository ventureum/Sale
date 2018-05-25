import contract from 'truffle-contract'
import { getProvider } from '../services/provider'

var createErrorHandler = function (name) {
  return function (err) {
    console.error(err)
    throw new Error('contract ' + name + ' cannot be found, make sure you are using the correct network.')
  }
}

export const getAbi = async (contract) => {
  const storageKey = `ventureum:abi:${contract}`
  const cached = window.sessionStorage.getItem(storageKey)

  try {
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (error) {
    console.error(error)
  }

  const url = '/contracts'
  const data = await window.fetch(`${url}/${contract}.json`)
  const json = await data.json()

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(json))
  } catch (error) {
    console.error(error)
  }

  return json
}

export const getPresale = async (account, provider) => {
  const PresaleArtifact = await getAbi('Presale')
  const Presale = contract(PresaleArtifact)
  Presale.defaults({from: account})
  Presale.setProvider(provider || getProvider())

  return Presale.deployed().catch(createErrorHandler('Presale'))
}

// for dev
export const getToken = async (account) => {
  const sale = await getPresale()
  const tokenAddress = await sale.token.call()
  const tokenArtifact = await getAbi('VetXToken')
  const Token = contract(tokenArtifact)
  Token.defaults({from: account})
  Token.setProvider(getProvider())

  return Token.at(tokenAddress)
}