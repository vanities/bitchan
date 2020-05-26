import Loading from './Loading.js'
import { drizzleConnect } from '@drizzle/react-plugin'

// May still need this even with data function to refresh component on updates for this contract.
export default const mapStateToProps = state => {
  return {
    drizzleStatus: state.drizzleStatus,
    web3: state.web3
  }
}

const LoadingContainer = drizzleConnect(Loading, mapStateToProps);
