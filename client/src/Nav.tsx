import * as React from "react";
import { Link } from "react-router-dom";
import {
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  NavbarText
} from "reactstrap";

import { drizzleReactHooks } from "@drizzle/react-plugin";

export function TopNav (props, context) {
  const drizzleState = drizzleReactHooks.useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0]
  }));
  return (
    <div>
      <Navbar color="dark" dark expand="md">
        <NavbarBrand tag={Link} to={"/"}>
          bitchan
        </NavbarBrand>
        <Nav className="mr-auto" navbar>
          <NavItem>
            <NavLink tag={Link} to="/home">
              Home
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink tag={Link} to="/board">
              Board
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink tag={Link} to="/signup">
              Sign Up
            </NavLink>
          </NavItem>
        </Nav>
        <NavbarText>{drizzleState.account}</NavbarText>
      </Navbar>
    </div>
  );
}
