import { drizzleConnect } from 'drizzle-react'
import React, { Children, Component } from 'react'
import PropTypes from 'prop-types'

/*
 * Create component.
 */

class LoadingContainer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      error: false
    }
  }
  countdown () {
    var counttime = 20
    var _countdown = () => {
      if (this.props.drizzleStatus.initialized) {
        return
      }
      if (counttime > 0) {
        counttime -= 1
        setTimeout(_countdown, 1000)
      } else {
        this.setState({
          error: true
        })
      }
    }
    _countdown()
  }
  render() {
    if (this.state.error) {
      return(
        <main className="container loading-screen">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>⚠️</h1>
              <p>Contract init failed, please make sure you are using the correct network.</p>
            </div>
          </div>
        </main>
      )
    }
    if (this.props.web3.status === 'failed')
    {
      if (this.props.errorComp) {
        return this.props.errorComp
      }

      return(
        <main className="container loading-screen">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>⚠️</h1>
              <p>This browser has no connection to the Ethereum network. Please use the Chrome/FireFox extension MetaMask, or dedicated Ethereum browsers Mist or Parity.</p>
            </div>
          </div>
        </main>
      )
    }

    if (this.props.web3.status === 'initialized' && Object.keys(this.props.accounts).length === 0)
    {
      return(
        <main className="container loading-screen">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>🦊</h1>
              <p><strong>We can't find any Ethereum accounts!</strong> Please check and make sure Metamask or you browser are pointed at the correct network and your account is unlocked.</p>
            </div>
          </div>
        </main>
      )
    }
    if (this.props.drizzleStatus.initialized)
    {
      return Children.only(this.props.children)
    }
    if (this.props.loadingComp) {
      return this.props.loadingComp
    }
    this.countdown()
    return(
      <main className="container loading-screen">
        <div className="pure-g">
          <div className="pure-u-1-1">
            <h1>⚙️</h1>
            <p>Loading dapp...</p>
          </div>
        </div>
      </main>
    )
  }
}
LoadingContainer.contextTypes = {
  drizzle: PropTypes.object
}
/*
 * Export connected component.
 */
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    drizzleStatus: state.drizzleStatus,
    xx: state,
    web3: state.web3
  }
}
export default drizzleConnect(LoadingContainer, mapStateToProps)