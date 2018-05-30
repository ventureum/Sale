import React, { Component } from 'react'
import { Loader } from 'semantic-ui-react'
import CSSModules from 'react-css-modules'

import styles from './styles.css'

class InProgress extends Component {
  constructor (props) {
    super()
  }

  render () {
    return (
      <div className='in-progress overflow-y ui active transition visible inverted dimmer'>
        <Loader inverted content='Request in progress' />
      </div>
    )
  }
}

export default CSSModules(InProgress, styles)
