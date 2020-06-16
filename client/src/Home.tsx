import * as React from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { Badge, Table } from "reactstrap";

interface HomeProps {
  drizzle: any;
  drizzleState: any;
}

interface HomeState {
  userInfo?: any;
  ownerAddress: string;
}

function UserTable (numUsers: string, users: any) {
  return (
    <div>
      <h3>
        User info<Badge color="secondary">current state of the world</Badge>
      </h3>
      Total # of Users: {numUsers}
      <Table bordered>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Address</th>
            <th>Username</th>
          </tr>
        </thead>
        {users.map((user) => (
          <tbody>
            <tr>
              <td>{user ? user[0] : "loading"}</td>
              <td>{user ? user[1] : "loading"}</td>
              <td>{user ? user[2] : "loading"}</td>
            </tr>
          </tbody>
        ))}
      </Table>
    </div>
  );
}

function getUsers (call, numUsers) {
  const users = [];
  for (var user = 0; user <= numUsers; user++) {
    users.push(call("User", "retrieve", user));
  }
  return users;
}

export function Home () {
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const state = useCacheCall("User", "getState");
  const numUsers = state ? state[0] : "loading";
  const users = useCacheCall(["User"], (call) => getUsers(call, numUsers));

  return UserTable(numUsers, users);
}
