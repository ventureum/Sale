import React, { Component } from 'react'
import InProgress from '../InProgress'
import presale from '../../services/presale'
import toastr from 'toastr'
import commafy from 'commafy'
import moment from 'moment'
import BigNumber from 'bignumber.js'
import CSSModules from 'react-css-modules'
import { toStandardUnit, advanceBlock } from '../../utils/utils'
import { Menu, Image, Grid, Container, Segment, Header, Message, Form, Button } from 'semantic-ui-react'

import styles from './styles.css'

class Main extends Component {
  constructor (props) {
    super()

    this.state = {
      address: '',
      rate: null,
      whitelisted: true,
      lockupDuration: null,
      balance: null,
      vtxAmount: new BigNumber(0),
      ethAmount: '',
      inProgress: false,
      openingTime: null,
      closingTime: null,
      currentStatus: null
    }

    this.onChange = this.onChange.bind(this)
    this.buyTokens = this.buyTokens.bind(this)
    this.withDraw = this.withDraw.bind(this)
  }

  componentDidMount () {
    this._isMounted = true

    this.getAddress()
    this.getBalance()
    this.getAccountInfo()

    // for dev
    this.getPresaleBalance()
  }

  componentWillUnmount () {
    this._isMounted = false
  }

  onChange (event) {
    var ethAmount = event.target.value
    this.setState({
      ethAmount,
      vtxAmount: ethAmount ? this.state.rate.times(ethAmount) : new BigNumber(0)
    })
  }

  getAddress () {
    window.web3.eth.getAccounts((err, accounts) => {
      if (err) {
        console.log(err)
        return
      }
      
      var address = accounts[0]
      if (this._isMounted) {
        this.setState({
          address
        })
      }
    })
  }

  async getBalance () {
    var balance = await presale.getBalance()

    if (this._isMounted) {
      this.setState({
        balance
      })
    }
  }

  async getAccountInfo () {
    let {
      whitelisted,
      rate,
      lockupDuration
    } = await presale.getAccountInfo()

    if (this._isMounted) {
      this.setState({
        whitelisted,
        rate,
        lockupDuration
      })

      if (whitelisted) {
        this.getTime()
      }
    }
  }

  async getTime () {
    var openingTime = await presale.getOpeningTime()
    var closingTime = await presale.getClosingTime()

    if (this._isMounted) {
      var currentTime = moment().unix()
      var currentStatus
      if (currentTime < openingTime.toNumber()) {
        currentStatus = 'not open'
      } else if (currentTime < closingTime.toNumber()) {
        currentStatus = 'open'
      } else if (currentTime < closingTime.add(this.state.lockupDuration).toNumber()) {
        currentStatus = 'lock'
      } else {
        currentStatus = 'withdraw'
      }

      this.setState({
        openingTime,
        closingTime,
        currentStatus
      })
    }
  }

  async buyTokens () {
    const {ethAmount} = this.state
    if (!ethAmount) {
      toastr.error('Please input ETH amount')
      return
    }

    if (this._isMounted) {
      this.setState({
        inProgress: true
      })
    }

    try {
      await presale.buyTokens(ethAmount)
      toastr.success('Success')
      await advanceBlock()
      this.getBalance()
    } catch (error) {
      toastr.error(error.message)
    }

    if (this._isMounted) {
      this.setState({
        inProgress: false
      })
    }
  }

  async withDraw () {
    const {balance} = this.state
    if (balance.isZero()) {
      toastr.error('No available VTX')
      return
    }

    if (this._isMounted) {
      this.setState({
        inProgress: true
      })
    }

    try {
      await presale.withDraw()
      toastr.success('Success')
      await advanceBlock()
      this.getBalance()
    } catch (error) {
      toastr.error(error.message)
    }

    if (this._isMounted) {
      this.setState({
        inProgress: false
      })
    }
  }

  // for dev

  addToWhitelist () {
    presale.addToWhitelist()
  }

  setTime () {
    presale.setTime(moment().unix())
  }

  finish () {
    presale.finish()
  }

  transfer () {
    presale.transfer()
  }

  async getPresaleBalance () {
    console.log(toStandardUnit(await presale.presalebalance()).toNumber())
  }

  render () {
    let {
      address,
      rate,
      whitelisted,
      lockupDuration,
      balance,
      vtxAmount,
      ethAmount,
      inProgress,
      openingTime,
      closingTime,
      currentStatus
    } = this.state

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
                  {whitelisted &&
                    <Message>
                      <p>
                        Your account is whitelisted, you can anticipate presale.
                      </p>
                    </Message>
                  }
                  {!whitelisted &&
                    <Message>
                      <p>
                        Your account is not whitelisted, you can't anticipate presale.
                      </p>
                    </Message>
                  }
                  <Header as='h3'>
                    {address}
                    <Header.Subheader>
                      Current Account
                    </Header.Subheader>
                  </Header>
                  {whitelisted &&
                    <div className='coin-info'>
                      <Header as='h3'>
                        {rate && commafy(rate.toNumber().toFixed(4))}
                        <Header.Subheader>
                          Current Rate
                        </Header.Subheader>
                      </Header>
                      <Header as='h3'>
                        {lockupDuration && lockupDuration.toNumber()} seconds
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
                    {balance && commafy(toStandardUnit(balance).toNumber().toFixed(4))}
                    <Header.Subheader>
                      Total Investment
                    </Header.Subheader>
                  </Header>
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
                          {vtxAmount ? commafy(vtxAmount.toNumber().toFixed(4)) : 0}
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
                        <strong>Lockup time: {moment.unix(closingTime.add(lockupDuration).toNumber()).utc().format('YYYY-MM-DD HH:mm:ss')}</strong>
                      </p>
                    </Message>
                  }
                  {currentStatus === 'withdraw' &&
                    <div>
                      <Button onClick={this.withDraw} color='blue' type='submit'>Withdraw</Button>
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

export default CSSModules(Main, styles)
