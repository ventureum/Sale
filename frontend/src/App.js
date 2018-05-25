import React, { Component } from 'react'
import './App.css'
import Main from './components/Main'
import { Message } from 'semantic-ui-react'

class App extends Component {
  constructor (props) {
    super(props)
    this.state = {
      fatalError: this.props.fatalError
    }
  }

  render () {
    if (this.state.fatalError) {
      return (
        <Message>
          <Message.Header>
            Fatal Error
          </Message.Header>
          <p>
            {this.state.fatalError}
          </p>
        </Message>
      )
    }

    return (
      <Main />
    )
  }
}

export default App
