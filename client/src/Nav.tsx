import * as React from "react";
import {useState} from "react";
import {Link} from "react-router-dom";
import {
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  NavbarText,
  Tooltip,
} from "reactstrap";
import Blockies from "react-blockies";
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
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const toggle = () => setTooltipOpen(!tooltipOpen);
  return (
    <div className="account">
      <div className="address">
        <NavbarText id="address">{abbreviatedAccount}</NavbarText>
        <Tooltip
          placement="bottom"
          isOpen={tooltipOpen}
          autohide={false}
          target="address"
          toggle={toggle}
        >
          {account}
        </Tooltip>
      </div>
      <div className="identicon">
        <Blockies seed={account} size={8} scale={4} />
      </div>
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
