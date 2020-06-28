import * as React from "react";
import { Link } from "react-router-dom";

import { Navbar, NavbarBrand, Nav, NavItem, NavLink } from "reactstrap";
import { drizzleReactHooks } from "@drizzle/react-plugin";

import { Address } from "./address";
import "./address.css";
import "./bar.css";

export function Bar (props, context) {
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  // const exists = useCacheCall("User", "exists");

  return (
    <div>
      <Navbar dark expand="md" className="bar">
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