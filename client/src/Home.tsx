import * as React from "react";
import {drizzleReactHooks} from "@drizzle/react-plugin";
import {Badge, Table} from "reactstrap";

interface HomeProps {
  drizzle: any;
  drizzleState: any;
}

interface HomeState {
  userInfo?: any;
  ownerAddress: string;
}

function UserTable(
  numUsers: string,
  ownerAddress: string,
  ownerUsername: string
) {
  return (
    <div>
      <h3>
        User info<Badge color="secondary">current state of the world</Badge>
      </h3>
      <Table bordered>
        <thead>
          <tr>
            <th>Number of users</th>
            <th>Owner address</th>
            <th>Owner username</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{numUsers}</td>
            <td>{ownerAddress}</td>
            <td>{ownerUsername}</td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}

export function Home() {
  const {useCacheCall} = drizzleReactHooks.useDrizzle();
  const state = useCacheCall("User", "getState");
  const numUsers = state ? state[0] : "loading";
  const ownerAddress = state ? state[1] : "loading";
  const ownerUsername = state ? state[2] : "loading";

  return UserTable(numUsers, ownerAddress, ownerUsername);
}
