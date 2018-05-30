import React, { Component } from 'react'
import Eth from 'ethjs'
import InProgress from '../InProgress'
import toastr from 'toastr'
import commafy from 'commafy'
import moment from 'moment'
import PropTypes from 'prop-types'
import CSSModules from 'react-css-modules'
import { toStandardUnit } from '../../util/utils'
import { Menu, Image, Grid, Container, Segment, Header, Message, Form, Button } from 'semantic-ui-react'

import styles from './styles.css'

class Home extends Component {
  constructor (props, context) {
    super(props)
    this.contracts = context.drizzle.contracts

    this.state = {
      vtxAmount: 0,
      ethAmount: '',
      inProgress: false
    }

    this.onChange = this.onChange.bind(this)
    this.buyTokens = this.buyTokens.bind(this)
    this.withDraw = this.withDraw.bind(this)

    // for dev
    this.addToWhitelist = this.addToWhitelist.bind(this)
    this.setTime = this.setTime.bind(this)
    this.finish = this.finish.bind(this)
    this.transfer = this.transfer.bind(this)
  }

  componentDidMount () {
    this._isMounted = true

    this.getBalance()
    this.getAccountInfo()
    this.getTime()
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.accounts[0] !== this.props.accounts[0]) {
      setTimeout(() => {
        this.getBalance()
        this.getAccountInfo()
        this.getTime()
      }, 0)
    }
    if (this.txId !== null) {
      var state = nextProps.store.getState()
      if (state.transactionStack[this.txId]) {
        const txHash = state.transactionStack[this.txId]
        if (state.transactions[txHash].status === 'success') {
          toastr.success('Success')
          this.setState({
            inProgress: false,
            vtxAmount: 0,
            ethAmount: ''
          })
          this.txId = null
        } else if (state.transactions[txHash].status === 'pending' && !this.state.inProgress) {
          this.setState({
            inProgress: true
          })
        }
      }
    }
  }

  componentWillUnmount () {
    this._isMounted = false
  }

  onChange (event) {
    var ethAmount = event.target.value
    var accountInfo = {}
    if (this.props.Presale['whitelist'][this.accountInfoKey]) {
      accountInfo = this.props.Presale['whitelist'][this.accountInfoKey].value
      this.setState({
        ethAmount,
        vtxAmount: ethAmount ? accountInfo.rate * ethAmount : 0
      })
    }
  }

  getBalance () {
    this.balanceKey = this.contracts['Presale'].methods['balances'].cacheCall(this.props.accounts[0])
  }

  getAccountInfo () {
    this.accountInfoKey = this.contracts['Presale'].methods['whitelist'].cacheCall(this.props.accounts[0])
  }

  getTime () {
    this.openingTimeKey = this.contracts['Presale'].methods['openingTime'].cacheCall()
    this.closingTimeKey = this.contracts['Presale'].methods['closingTime'].cacheCall()
  }

  buyTokens () {
    const {ethAmount} = this.state
    if (!ethAmount) {
      toastr.error('Please input ETH amount')
      return
    }

    this.txId = this.contracts['Presale'].methods['buyTokens'].cacheSend(this.props.accounts[0], {value: Eth.toWei(ethAmount, 'ether')})
  }

  withDraw () {
    if (this.props.Presale['balances'][this.balanceKey]) {
      var balance = toStandardUnit(this.props.Presale['balances'][this.balanceKey].value)
      if (balance === 0) {
        toastr.error('No available VTX')
        return
      }
    }
    this.txId = this.contracts['Presale'].methods['withdrawTokens'].cacheSend()
  }

  // for dev

  addToWhitelist () {
    this.contracts['Presale'].methods['addToWhitelist'].cacheSend(this.props.accounts[0], 100, 100)
  }

  setTime () {
    this.contracts['Presale'].methods['setOpeningAndClosingTime'].cacheSend(moment().unix(), moment().unix() + 600)
  }

  finish () {
    this.contracts['Presale'].methods['finalize'].cacheSend()
  }

  transfer () {
    this.contracts['VetXToken'].methods['transfer'].cacheSend(this.props.accounts[0], '1000000000000000000000000000')
  }

  render () {
    let {
      vtxAmount,
      ethAmount,
      inProgress
    } = this.state

    var accountInfo = {}
    if (this.props.Presale['whitelist'][this.accountInfoKey]) {
      accountInfo = this.props.Presale['whitelist'][this.accountInfoKey].value
    }

    var closingTime, openingTime, currentStatus
    var currentTime = moment().unix()
    if (this.props.Presale['openingTime'][this.openingTimeKey]) {
      openingTime = Number(this.props.Presale['openingTime'][this.openingTimeKey].value)
    }
    if (this.props.Presale['closingTime'][this.openingTimeKey]) {
      closingTime = Number(this.props.Presale['closingTime'][this.closingTimeKey].value)
    }
    if (openingTime && closingTime && accountInfo.lockupDuration) {
      if (currentTime < openingTime) {
        currentStatus = 'not open'
      } else if (currentTime < closingTime) {
        currentStatus = 'open'
      } else if (currentTime < closingTime + Number(accountInfo.lockupDuration)) {
        currentStatus = 'lock'
      } else {
        currentStatus = 'withdraw'
      }
    }

    return (
      <Grid className='main'>
        <Grid.Row>
          <Grid.Column>
            <Menu color='purple' inverted>
              <Menu.Item header>
                <Image size='mini' src='http://ventureum.io/img/logo.png' />
                &nbsp;&nbsp;Ventureum
              </Menu.Item>
            </Menu>
          </Grid.Column>
        </Grid.Row>
        <Container>
          <Grid>
            <Grid.Row columns={2}>
              <Grid.Column width={11} className='user-info' stretched>
                <Segment>
                  {accountInfo.whitelisted &&
                    <Message>
                      <p>
                        Your account is whitelisted, you can anticipate presale.
                      </p>
                    </Message>
                  }
                  {!accountInfo.whitelisted &&
                    <Message>
                      <p>
                        Your account is not whitelisted, you can't anticipate presale.
                      </p>
                    </Message>
                  }
                  <Header as='h3'>
                    {this.props.accounts[0]}
                    <Header.Subheader>
                      Current Account
                    </Header.Subheader>
                  </Header>
                  {accountInfo.whitelisted &&
                    <div className='coin-info'>
                      <Header as='h3'>
                        {accountInfo.rate}
                        <Header.Subheader>
                          Current Rate
                        </Header.Subheader>
                      </Header>
                      <Header as='h3'>
                        {accountInfo.lockupDuration} seconds
                        <Header.Subheader>
                          Lockup Duration
                        </Header.Subheader>
                      </Header>
                    </div>
                  }
                </Segment>
              </Grid.Column>
              <Grid.Column width={5} className='action' stretched>
                <Segment>
                  <Header as='h2'>
                    {this.props.Presale['balances'][this.balanceKey] && toStandardUnit(this.props.Presale['balances'][this.balanceKey].value)}
                    <Header.Subheader>
                      Total Investment
                    </Header.Subheader>
                  </Header>
                  {accountInfo.whitelisted &&
                    <div>
                      {currentStatus === 'not open' &&
                        <Message>
                          <p>
                            Presale hasn't started.
                            <br />
                            <strong>Opening time: {moment.unix(openingTime).utc().format('YYYY-MM-DD HH:mm:ss')}</strong>
                          </p>
                        </Message>
                      }
                      {currentStatus === 'open' &&
                        <Form>
                          <Form.Field>
                            <strong>Closing time: {moment.unix(closingTime).utc().format('YYYY-MM-DD HH:mm:ss')}</strong>
                          </Form.Field>
                          <Form.Field>
                            <label>Input ETH amount to invest</label>
                            <input onChange={this.onChange} value={ethAmount} placeholder='1000' />
                          </Form.Field>
                          <Form.Field>
                            <Header as='h2'>
                              {vtxAmount ? commafy(vtxAmount) : 0}
                              <Header.Subheader>
                                Equal to VTX amount
                              </Header.Subheader>
                            </Header>
                          </Form.Field>
                          <Button onClick={this.buyTokens} color='blue'>Invest</Button>
                        </Form>
                      }
                      {currentStatus === 'lock' &&
                        <Message>
                          <p>
                            Presale has closed. You can withdraw after lockup time.
                            <br />
                            <strong>Lockup time: {moment.unix(closingTime + Number(accountInfo.lockupDuration)).utc().format('YYYY-MM-DD HH:mm:ss')}</strong>
                          </p>
                        </Message>
                      }
                      {currentStatus === 'withdraw' &&
                        <div>
                          <Button onClick={this.withDraw} color='blue' type='submit'>Withdraw</Button>
                        </div>
                      }
                    </div>
                  }
                </Segment>
                {inProgress ? <InProgress /> : null}
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Container>
        {/*for dev*/}
        <Grid.Row>
          <Button onClick={this.addToWhitelist}>add to white list</Button>
          <Button onClick={this.setTime}>settime</Button>
          <Button onClick={this.finish}>finish</Button>
          <Button onClick={this.transfer}>transfer vtx</Button>
        </Grid.Row>
      </Grid>
    )
  }
}

Home.contextTypes = {
  drizzle: PropTypes.object
}

export default CSSModules(Home, styles)
