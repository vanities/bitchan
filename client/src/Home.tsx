import * as React from "react";
import {Badge, Table} from "reactstrap";

interface HomeProps {
  drizzle: any;
  drizzleState: any;
}

interface HomeState {
  0?: string; // num users
  1?: string; // owner address
  2?: string; // owner username
}

function UserTable(...info: any) {
  return (
    <div>
      <h3>
        User info<Badge color="secondary">current state of the world</Badge>
      </h3>
      <Table bordered>
        <thead>
          <tr>
            <th>User Count</th>
            <th>Owner address</th>
            <th>Owner username</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{info[0]}</td>
            <td>{info[1]}</td>
            <td>{info[2]}</td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}

export class Home extends React.Component<HomeProps, HomeState> {
  state = {0: null, 1: null, 2: null};

  componentDidMount() {
    const {drizzle} = this.props;
    const user = drizzle.contracts.User;

    // get and save the key for the variable we are interested in
    const userInfo = user.methods.getInfo.cacheCall();
    this.setState({...userInfo});
  }

  render() {
    const {User} = this.props.drizzleState.contracts;
    console.log("state", this.state);
    const storedData = User.getInfo[0];
    console.log("stored data", storedData);
    const userInfo = storedData ? storedData.value : "No user info";
    //console.log("user info", userInfo);
    return UserTable(...userInfo);
  }
}
