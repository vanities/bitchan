import * as React from "react";
import { useState } from "react";

import Blockies from "react-blockies";
import { NavbarText, Tooltip } from "reactstrap";
import { drizzleReactHooks } from "@drizzle/react-plugin";

export function Address (props, context) {
  const drizzleState = drizzleReactHooks.useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0]
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
