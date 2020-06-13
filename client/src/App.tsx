import * as React from 'react'
import { drizzleReactHooks } from '@drizzle/react-plugin'

import { setupDrizzle } from './drizzle/setup'
import { Bitchan } from './bitchan'

const drizzle = setupDrizzle()

export default class App extends React.Component {
  render () {
    return (
      <drizzleReactHooks.DrizzleProvider drizzle={drizzle}>
        <drizzleReactHooks.Initializer
          // Optional `node` to render on errors. Defaults to `'Error.'`.
          error="There was an error."
          // Optional `node` to render while loading contracts and accounts. Defaults to `'Loading contracts and accounts.'`.
          loadingContractsAndAccounts="Also still loading."
          // Optional `node` to render while loading `web3`. Defaults to `'Loading web3.'`.
          loadingWeb3="Still loading."
        >
          <Bitchan />
        </drizzleReactHooks.Initializer>
      </drizzleReactHooks.DrizzleProvider>
    )
  }
}
