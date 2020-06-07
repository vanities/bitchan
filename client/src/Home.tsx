import * as React from "react";

interface HomeProps {
  drizzle: any;
  drizzleState: any;
}

interface HomeState {
  userCount: string;
}

export class Home extends React.Component<HomeProps, HomeState> {
  state = {userCount: null};

  componentDidMount() {
    const {drizzle} = this.props;
    const user = drizzle.contracts.User;

    // get and save the key for the variable we are interested in
    const userCount = user.methods["userCount"].cacheCall();
    this.setState({userCount});
  }

  render() {
    const {User} = this.props.drizzleState.contracts;
    const storedData = User.userCount[this.state.userCount];
    const userCount = storedData ? storedData.value : "No user count";
    return "hello" + userCount;
  }
}
