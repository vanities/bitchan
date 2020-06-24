import * as React from "react";
import {Link} from "react-router-dom";
import {
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  NavbarText,
} from "reactstrap";
import {Blockie} from "rimble-ui";
import "./nav.css";

import {drizzleReactHooks} from "@drizzle/react-plugin";

function Address(props, context) {
  const drizzleState = drizzleReactHooks.useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0],
  }));
  const account = drizzleState.account;
  const abbreviatedAccount = `${account.slice(0, 5)}...${account.slice(
    -5,
    -1
  )}`;
  return (
    <div className="account">
      <NavbarText className="address">{abbreviatedAccount}</NavbarText>
      <Blockie
        className="avatar"
        opts={{
          seed: "Bitchan",
          color: "#dfe",
          bgcolor: "#a71",
          size: 7,
          scale: 3,
          spotcolor: "#000",
        }}
      />
    </div>
  );
}

export function TopNav(props, context) {
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
        <Address />
      </Navbar>
    </div>
  );
}
