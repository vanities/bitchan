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

import {newContextComponents} from "@drizzle/react-components";
const {AccountData} = newContextComponents;

export function TopNav(props, context) {
  return (
    <div>
      <Navbar color="dark" dark expand="md">
        <NavbarBrand tag={Link} to={"/"}>
          bitchan
        </NavbarBrand>
        <Nav className="mr-auto" navbar>
          <NavItem>
            <NavLink tag={Link} to="/board">
              Board
            </NavLink>
          </NavItem>
        </Nav>
        <NavbarText>
          <AccountData
            drizzle={props.drizzle}
            drizzleState={props.drizzleState}
            accountIndex={0}
            units="ether"
            precision={3}
            render={({address, balance, units}) => (
              <div>
                <div>
                  Address: <span style={{color: "white"}}>{address}</span>
                </div>
              </div>
            )}
          />
        </NavbarText>
      </Navbar>
    </div>
  );
}
